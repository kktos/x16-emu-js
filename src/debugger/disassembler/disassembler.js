import * as utils from "../../utils.js";
import instructions from "./instructions";

function formatAddr(addr) {
	// return "<span class='instr_mem_ref'>$" + utils.hexword(addr) + "</span>";
	return utils.hexword(addr);
}

function formatJumpAddr(addr) {
	// return "<span class='instr_instr_ref'>$" + utils.hexword(addr) + "</span>";
	return utils.hexword(addr);
}

export default class Disassembler {

	constructor(vm, memory) {
		this.vm= vm;
		this.memory= new Uint8Array(memory);
	}

	async readbyte(bank, addr) {
		return await this.vm.waitMessage("dbgReadBytes", {addr: addr & 0xFFFF, count: 1});
		// addr&= 0xFFFF;
		// return this.memory[bank*0x10000+addr];
	}

	async readword(bank, addr) {
		return await this.readbyte(bank, addr+1)<<1 | await this.readbyte(bank, addr);
		// const base= bank*0x10000;
		// return (this.memory[base+((addr+1)&0xFFFF)]<<8) | this.memory[base+(addr&0xFFFF)];
	}

	async disassemble(bank, addr, cpuState)
	{
		let len= 1;
		let temp_str;
		let ret_str= "";

		const instrTemplate= instructions[await this.readbyte(bank, addr)];

		// if(!temp_str) {
		// 	console.log(bank, addr);
		// }

		// if(!instrTemplate)
		// 	instrTemplate= "???";

		if(typeof instrTemplate == "object") {
			const extInstrOp= await this.readbyte(bank, addr+1);
			temp_str= "?!?";
			if(instrTemplate[extInstrOp]) {
				temp_str= instrTemplate[extInstrOp];
				len++;
			}
		}
		else
			temp_str= instrTemplate

		const [op, addrMode] = temp_str.split(" ");
		let comment= null;
		for(let i= 0; i<temp_str.length; i++) {
			switch(temp_str[i]) {
				case "$": {
					const byt= await this.readbyte(bank, addr+len);
					ret_str+= utils.hexbyte(byt);

					switch(addrMode) {
						case "($),Y": {
							const destAddr= await this.readword(bank, byt);
							comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(cpuState.Y)}= $${utils.hexword(destAddr+cpuState.Y)}`;
							break;
						}
						case "$": {
							const value= await this.readbyte(bank, byt);
							comment= `$${utils.hexbyte(value)}`;
							break;
						}
					}

					len++;
					break;
				}

				case "r":
					ret_str+= "$"+utils.hexword(addr + utils.signExtend(await this.readbyte(bank, addr + len)) + 2);
					len++;
					if(cpuState.PC != addr)
						break;
					let willBranch= false;
					switch(op) {
						case "BPL":
							willBranch= 0== cpuState.FlagN;
							break;
						case "BMI":
							willBranch= 1 == cpuState.FlagN;
							break;
						case "BCC":
							willBranch= 0 == cpuState.FlagC;
							break;
						case "BCS":
							willBranch= 1 == cpuState.FlagC;
							break;
						case "BEQ":
							willBranch= 1 == cpuState.FlagZ;
							break;
						case "BNE":
							willBranch= 0 == cpuState.FlagZ;
							break;
					}
					if(willBranch)
						comment= "will branch";
					break;

				case "%": {
					const destAddr = await this.readbyte(bank, addr + len) | (await this.readbyte(bank, addr + len + 1) << 8);
					const isFnCall = op[0] == "J"; //["JMP", "JSR"].includes(op);

					let finalAddr;
					switch(addrMode) {
						case "(%)": {
							finalAddr= utils.hexword(await this.readbyte(bank, destAddr) | (await this.readbyte(bank, destAddr + 1) << 8));
							break;
						}
						case "%": {
							finalAddr= !isFnCall ? utils.hexbyte(await this.readbyte(bank, destAddr)) : null;
							break;
						}
						case "%,Y": {
							comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(cpuState.Y)}= $${utils.hexword(destAddr+cpuState.Y)}`;
							break;
						}
						case "%,X": {
							comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(cpuState.X)}= $${utils.hexword(destAddr+cpuState.X)}`;
							break;
						}
					}
					if(finalAddr)
						comment= `$${finalAddr}`;

					ret_str+= isFnCall ? formatJumpAddr(destAddr) : formatAddr(destAddr);
					len+= 2;

					break;
				}

				default:
					ret_str+= temp_str[i];
					break;
			}
		}
		return [ret_str, addr + len, comment];
	}

	_disassemble(addr) {
		const opcode = opcodes[this.readbyte(bank, addr)];
		if (!opcode) {
			return ["???", addr + 1];
		}
		const split = opcode.split(" ");
		if (!split[1]) {
			return [opcode, addr + 1];
		}
		let param = split[1] || "";
		let suffix = "";
		let suffix2 = "";
		const index = param.match(/(.*),([xy])$/);
		let destAddr, indDest;
		if (index) {
			param = index[1];
			suffix = "," + index[2].toUpperCase();
			suffix2 = " + " + index[2].toUpperCase();
		}
		switch (param) {
			case "imm":
				return [split[0] + " #$" + utils.hexbyte(this.readbyte(bank, addr + 1)) + suffix, addr + 2];
			case "abs":
				let formatter = (split[0] === "JMP" || split[0] === "JSR") ? formatJumpAddr : formatAddr;
				destAddr = this.readbyte(bank, addr + 1) | (this.readbyte(bank, addr + 2) << 8);
				return [split[0] + " $" + formatter(destAddr) + suffix, addr + 3, destAddr];
			case "branch":
				destAddr = addr + utils.signExtend(this.readbyte(bank, addr + 1)) + 2;
				return [split[0] + " $" + formatJumpAddr(destAddr) + suffix, addr + 2, destAddr];
			case "zp": {
				const zpAddr= this.readbyte(bank, addr + 1);
				const zpValue= utils.hexbyte(this.readbyte(bank, zpAddr));
				return [
					`${split[0]} $${utils.hexbyte(this.readbyte(bank, addr + 1))}${suffix}; $${zpValue}`,
					addr + 2
				];
			}
			case "(,x)":
				return [split[0] + " ($" + utils.hexbyte(this.readbyte(bank, addr + 1)) + ", X)" + suffix, addr + 2];
			case "()":
				destAddr = this.readbyte(bank, addr + 1);
				destAddr = this.readbyte(bank, destAddr) | (this.readbyte(bank, destAddr + 1) << 8);
				return [split[0] + " ($" + utils.hexbyte(this.readbyte(bank, addr + 1)) + ")" + suffix + " ; $" + utils.hexword(destAddr) + suffix2, addr + 2];
			case "(abs)":
				destAddr = this.readbyte(bank, addr + 1) | (this.readbyte(bank, addr + 2) << 8);
				indDest = this.readbyte(bank, destAddr) | (this.readbyte(bank, destAddr + 1) << 8);
				return [split[0] + " ($" + formatJumpAddr(destAddr) + ")" + suffix + " ; $" + utils.hexword(indDest) + suffix2, addr + 3, indDest];
			case "(abs,x)":
				destAddr = this.readbyte(bank, addr + 1) | (this.readbyte(bank, addr + 2) << 8);
				indDest = this.readbyte(bank, destAddr) | (this.readbyte(bank, destAddr + 1) << 8);
				return [split[0] + " ($" + formatJumpAddr(destAddr) + ",x)" + suffix, addr + 3, indDest];
		}
		return [opcode, addr + 1];
	};
}
