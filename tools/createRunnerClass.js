import { open } from 'fs/promises';
import * as utils from "../src/utils.js";
import InstructionGen from "./instructiongen.js";
import opcodes from "../src/cpu/opcodes6502.js";
import getOp from "./getOp.js";

const is65c12= false;

function getInstruction(opcodeString, needsReg) {
	let split = opcodeString.split(' ');
	let opcode = split[0];
	let arg = split[1];
	let op = getOp(opcode, arg);
	if (!op) return null;

	let ig = new InstructionGen(is65c12);
	if (needsReg) ig.append("let REG = 0|0;");

	switch (arg) {
		case undefined:
			// Many of these ops need a little special casing.
			if (op.read || op.write) throw "Unsupported " + opcodeString;
			ig.append(op.preop);
			ig.tick(Math.max(2, 1 + (op.extra || 0)));
			ig.append(op.op);
			return ig.render();

		case "branch":
			return [op.op];  // special cased here, would be nice to pull out of cpu

		case "zp":
		case "zpx":  // Seems to be enough to keep tests happy, but needs investigation.
		case "zp,x":
		case "zp,y":
			if (arg === "zp") {
				ig.tick(2);
				ig.append("let addr = this.cpu.getb() | 0;");
			} else {
				ig.tick(3);
				ig.append("let addr = (this.cpu.getb() + this.cpu." + arg[3] + ") & 0xff;");
			}
			if (op.read) {
				ig.zpReadOp("addr", "REG");
				if (op.write) {
					ig.tick(1);  // Spurious write
				}
			}
			ig.append(op.op);
			if (op.write) ig.zpWriteOp("addr", "REG");
			return ig.render();

		case "abs":
			ig.tick(3 + (op.extra || 0));
			ig.append("let addr = this.cpu.getw() | 0;");
			if (op.read) {
				ig.readOp("addr", "REG");
				if (op.write) ig.spuriousOp("addr", "REG");
			}
			ig.append(op.op);
			if (op.write) ig.writeOp("addr", "REG");

			return ig.render();

		case "abs,x":
		case "abs,y":
			ig.append("let addr = this.cpu.getw() | 0;");
			ig.append("let addrWithCarry = (addr + this.cpu." + arg[4] + ") & 0xffff;");
			ig.append("let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);");
			ig.tick(3);
			if ((op.read && !op.write)) {
				// For non-RMW, we only pay the cost of the spurious read if the address carried.
				ig = ig.split("addrWithCarry !== addrNonCarry");
				ig.ifTrue.readOp("addrNonCarry");
				ig.readOp("addrWithCarry", "REG");
			} else if (op.read) {
				if (is65c12 && op.rotate) {
					// For rotates on the 65c12, there's an optimization to avoid the extra cycle with no carry
					ig = ig.split("addrWithCarry !== addrNonCarry");
					ig.ifTrue.readOp("addrNonCarry");
					ig.readOp("addrWithCarry", "REG");
					ig.writeOp("addrWithCarry", "REG");
				} else {
					// For RMW we always have a spurious read and then a spurious read or write
					ig.readOp("addrNonCarry");
					ig.readOp("addrWithCarry", "REG");
					ig.spuriousOp("addrWithCarry", "REG");
				}
			} else if (op.write) {
				// Pure stores still exhibit a read at the non-carried address.
				ig.readOp("addrNonCarry");
			}
			ig.append(op.op);
			if (op.write) ig.writeOp("addrWithCarry", "REG");
			return ig.render();

		case "imm":
			if (op.write) {
				throw "This isn't possible";
			}
			if (op.read) {
				// NOP imm
			}
			ig.tick(2);
			ig.append("REG = this.cpu.getb() | 0;");
			ig.append(op.op);
			return ig.render();

		case "A":
			ig.tick(2);
			ig.append("REG = this.cpu.a;");
			ig.append(op.op);
			ig.append("this.cpu.a = REG;");
			return ig.render();

		case "(,x)":
			ig.tick(3); // two, plus one for the seemingly spurious extra read of zp
			ig.append("let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;");
			ig.append("let lo, hi;");
			ig.zpReadOp("zpAddr", "lo");
			ig.zpReadOp("(zpAddr + 1) & 0xff", "hi");
			ig.append("let addr = lo | (hi << 8);");
			if (op.read) {
				ig.readOp("addr", "REG");
				if (op.write) ig.spuriousOp("addr", "REG");
			}
			ig.append(op.op);
			if (op.write) ig.writeOp("addr", "REG");
			return ig.render();

		case "(),y":
			ig.tick(2);
			ig.append("let zpAddr = this.cpu.getb() | 0;");
			ig.append("let lo, hi;");
			ig.zpReadOp("zpAddr", "lo");
			ig.zpReadOp("(zpAddr + 1) & 0xff", "hi");
			ig.append("let addr = lo | (hi << 8);");
			ig.append("let addrWithCarry = (addr + this.cpu.y) & 0xffff;");
			ig.append("let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);");
			if (op.read && !op.write) {
				ig = ig.split("addrWithCarry !== addrNonCarry");
				ig.ifTrue.readOp("addrNonCarry");
				ig.readOp("addrWithCarry", "REG");
			} else if (op.read) {
				// For RMW we always have a spurious read and then a spurious read or write
				ig.readOp("addrNonCarry");
				ig.readOp("addrWithCarry", "REG");
				ig.spuriousOp("addrWithCarry", "REG");
			} else if (op.write) {
				// Pure stores still exhibit a read at the non-carried address.
				ig.readOp("addrNonCarry");
			}
			ig.append(op.op);
			if (op.write) ig.writeOp("addrWithCarry", "REG");
			return ig.render();

		case "(abs)":
			ig.tick(is65c12 ? 4 : 3);
			ig.append("let addr = this.cpu.getw() | 0;");
			if (is65c12) {
				ig.append("let nextAddr = (addr + 1) & 0xffff;");
			} else {
				ig.append("let nextAddr = ((addr + 1) & 0xff) | (addr & 0xff00);");
			}
			ig.append("let lo, hi;");
			ig.readOp("addr", "lo");
			ig.readOp("nextAddr", "hi");
			ig.append("addr = lo | (hi << 8);");
			ig.append(op.op);
			return ig.render();

		case "(abs,x)":
			ig.tick(4);
			ig.append("let addr = (this.cpu.getw() + this.cpu.x) | 0;");
			ig.append("let lo, hi;");
			ig.readOp("addr", "lo");
			ig.readOp("(addr + 1) & 0xffff", "hi");
			ig.append("addr = lo | (hi << 8);");
			ig.append(op.op);
			return ig.render();

		case "()":
			// Timing here is guessed at, but appears to be correct.
			ig.tick(2);
			ig.append("let zpAddr = this.cpu.getb() | 0;");
			ig.append("let lo, hi;");
			ig.zpReadOp("zpAddr", "lo");
			ig.zpReadOp("(zpAddr + 1) & 0xff", "hi");
			ig.append("let addr = lo | (hi << 8);");
			if (op.read) ig.readOp("addr", "REG");
			ig.append(op.op);
			if (op.write) ig.writeOp("addr", "REG");
			return ig.render();

		default:
			throw "Unknown arg type " + arg;
	}
}

function getIndentedSource(indent, opcodeNum, needsReg) {
	let opcode = opcodes[opcodeNum];
	let lines = null;
	if(opcode)
		lines = getInstruction(opcode, !!needsReg);
	if(!lines)
		lines = ["this.invalidOpcode(cpu, 0x" + utils.hexbyte(opcodeNum) + ");"];
	lines = [
		"// " + utils.hexbyte(opcodeNum) + " - " + opcode + "\n"].concat(lines);
	return indent + lines.join("\n" + indent);
}

let fd;
try {
	fd= await open('./src/cpu/runner.js', 'w');

	let bigswitch= "";
	for(let opcode= 0; opcode < 256; opcode++) {
		bigswitch+=
			`\t\t\tcase 0x${opcode.toString(16).padStart(2,"0")}: {\n${getIndentedSource("\t\t\t\t", opcode, true)}
				break;
			}\n`;
	}

	fd.write(`\nexport default class Runner {

	constructor(cpu) {
		this.cpu= cpu;
	}

	invalidOpcode(cpu, opcode) {
		if (is65c12) {
			// All undefined opcodes are NOPs on 65c12 (of varying lengths)
			// http://6502.org/tutorials/65c02opcodes.html has a list.
			// The default case is to treat them as one-cycle NOPs. Anything more than this is picked up below.
			switch (opcode) {
				case 0x02:
				case 0x22:
				case 0x42:
				case 0x62:
				case 0x82:
				case 0xc2:
				case 0xe2:
					// two bytes, two cycles
					this.cpu.getb();
					this.cpu.polltime(2);
					break;

				case 0x44:
					// two bytes, three cycles
					this.cpu.getb();
					this.cpu.polltime(3);
					break;

				case 0x54:
				case 0xd4:
				case 0xf4:
					// two bytes, four cycles
					this.cpu.getb();
					this.cpu.polltime(4);
					break;

				case 0x5c:
					// three bytes, eight cycles
					this.cpu.getw();
					this.cpu.polltime(8);
					break;

				case 0xdc:
				case 0xfc:
					// three bytes, four cycles
					this.cpu.getw();
					this.cpu.polltime(4);
					break;

				default:
					// one byte one cycle
					this.cpu.polltime(1);
					break;
			}
			return;
		}
		// Anything else is a HLT. Just hang forever...
		this.cpu.pc--;  // Account for the fact we've already incremented pc.
		this.cpu.polltime(1); // Take up some time though. Else we'll spin forever
	}

	run(opcode) {
		switch(opcode) {\n${bigswitch}
		}
	}
}
`);

}
finally {
	await fd?.close();
}
