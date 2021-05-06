import * as utils from "../utils.js";
import opcodes from "./opcodes6502.js";

function formatAddr(addr) {
	return "<span class='instr_mem_ref'>" + utils.hexword(addr) + "</span>";
}

function formatJumpAddr(addr) {
	return "<span class='instr_instr_ref'>" + utils.hexword(addr) + "</span>";
}

export default class Disassembler {

	constructor(cpu) {
		this.cpu= cpu;
	}

	disassemble(addr) {
		let opcode = opcodes[this.cpu.bus.cpuPeek(addr)];
		if (!opcode) {
			return ["???", addr + 1];
		}
		let split = opcode.split(" ");
		if (!split[1]) {
			return [opcode, addr + 1];
		}
		let param = split[1] || "";
		let suffix = "";
		let suffix2 = "";
		let index = param.match(/(.*),([xy])$/);
		let destAddr, indDest;
		if (index) {
			param = index[1];
			suffix = "," + index[2].toUpperCase();
			suffix2 = " + " + index[2].toUpperCase();
		}
		switch (param) {
			case "imm":
				return [split[0] + " #$" + utils.hexbyte(this.cpu.bus.cpuPeek(addr + 1)) + suffix, addr + 2];
			case "abs":
				let formatter = (split[0] === "JMP" || split[0] === "JSR") ? formatJumpAddr : formatAddr;
				destAddr = this.cpu.bus.cpuPeek(addr + 1) | (this.cpu.bus.cpuPeek(addr + 2) << 8);
				return [split[0] + " $" + formatter(destAddr) + suffix, addr + 3, destAddr];
			case "branch":
				destAddr = addr + utils.signExtend(this.cpu.bus.cpuPeek(addr + 1)) + 2;
				return [split[0] + " $" + formatJumpAddr(destAddr) + suffix, addr + 2, destAddr];
			case "zp": {
				const zpAddr= this.cpu.bus.cpuPeek(addr + 1);
				const zpValue= utils.hexbyte(this.cpu.bus.cpuPeek(zpAddr));
				return [
					`${split[0]} $${utils.hexbyte(this.cpu.bus.cpuPeek(addr + 1))}${suffix}; $${zpValue}`,
					addr + 2
				];
			}
			case "(,x)":
				return [split[0] + " ($" + utils.hexbyte(this.cpu.bus.cpuPeek(addr + 1)) + ", X)" + suffix, addr + 2];
			case "()":
				destAddr = this.cpu.bus.cpuPeek(addr + 1);
				destAddr = this.cpu.bus.cpuPeek(destAddr) | (this.cpu.bus.cpuPeek(destAddr + 1) << 8);
				return [split[0] + " ($" + utils.hexbyte(this.cpu.bus.cpuPeek(addr + 1)) + ")" + suffix + " ; $" + utils.hexword(destAddr) + suffix2, addr + 2];
			case "(abs)":
				destAddr = this.cpu.bus.cpuPeek(addr + 1) | (this.cpu.bus.cpuPeek(addr + 2) << 8);
				indDest = this.cpu.bus.cpuPeek(destAddr) | (this.cpu.bus.cpuPeek(destAddr + 1) << 8);
				return [split[0] + " ($" + formatJumpAddr(destAddr) + ")" + suffix + " ; $" + utils.hexword(indDest) + suffix2, addr + 3, indDest];
			case "(abs,x)":
				destAddr = this.cpu.bus.cpuPeek(addr + 1) | (this.cpu.bus.cpuPeek(addr + 2) << 8);
				indDest = this.cpu.bus.cpuPeek(destAddr) | (this.cpu.bus.cpuPeek(destAddr + 1) << 8);
				return [split[0] + " ($" + formatJumpAddr(destAddr) + ",x)" + suffix, addr + 3, indDest];
		}
		return [opcode, addr + 1];
	};
}
