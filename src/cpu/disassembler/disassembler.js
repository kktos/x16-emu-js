import * as utils from "../../utils.js";
import instructions from "./instructions";

function formatAddr(addr) {
	return "<span class='instr_mem_ref'>$" + utils.hexword(addr) + "</span>";
}

function formatJumpAddr(addr) {
	return "<span class='instr_instr_ref'>$" + utils.hexword(addr) + "</span>";
}

function disByte(byteData)
{
	return "$"+byteData.toString(16).padStart(2,"0");
}

function disWord(byteDataLow, byteDataHigh)
{
	return "$"+(byteDataLow+(byteDataHigh<<8)).toString(16).padStart(4,"0");
}

export default class Disassembler {

	constructor(memory) {
		this.memory= new Uint8Array(memory);
	}

	readbyte(addr) {
		return this.memory[addr&0xFFFF];
	}

	readword(addr) {
		return (this.memory[(addr+1)&0xFFFF]<<8) | this.memory[addr&0xFFFF];
	}

	disassemble(addr, cpuState)
	{
		let len= 1;
		let temp_str= instructions[this.readbyte(addr)];
		let ret_str= "";
		const [op, addrMode] = temp_str.split(" ");
		let comment= null;
		for(let i= 0; i<temp_str.length; i++) {
			switch(temp_str[i]) {
				case "$": {
					const byt= this.readbyte(addr+len);
					ret_str+= disByte(byt);

					switch(addrMode) {
						case "($),Y": {
							const destAddr= this.readword(byt);
							comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(cpuState.Y)}= $${utils.hexword(destAddr+cpuState.Y)}`;
							break;
						}
						case "$": {
							const value= this.readbyte(byt);
							comment= `$${utils.hexbyte(value)}`;
							break;
						}
					}

					len++;
					break;
				}

				case "r":
					ret_str+= "$"+utils.hexword(addr + utils.signExtend(this.readbyte(addr + len)) + 2);
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
					const destAddr = this.readbyte(addr + len) | (this.readbyte(addr + len + 1) << 8);
					const isFnCall = ["JMP", "JSR"].includes(op);
					if(!isFnCall)
						switch(addrMode) {
							case "%": {
								comment= `$${utils.hexbyte(this.readbyte(destAddr))}`;
								break;
							}
						}

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
		let opcode = opcodes[this.readbyte(addr)];
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
				return [split[0] + " #$" + utils.hexbyte(this.readbyte(addr + 1)) + suffix, addr + 2];
			case "abs":
				let formatter = (split[0] === "JMP" || split[0] === "JSR") ? formatJumpAddr : formatAddr;
				destAddr = this.readbyte(addr + 1) | (this.readbyte(addr + 2) << 8);
				return [split[0] + " $" + formatter(destAddr) + suffix, addr + 3, destAddr];
			case "branch":
				destAddr = addr + utils.signExtend(this.readbyte(addr + 1)) + 2;
				return [split[0] + " $" + formatJumpAddr(destAddr) + suffix, addr + 2, destAddr];
			case "zp": {
				const zpAddr= this.readbyte(addr + 1);
				const zpValue= utils.hexbyte(this.readbyte(zpAddr));
				return [
					`${split[0]} $${utils.hexbyte(this.readbyte(addr + 1))}${suffix}; $${zpValue}`,
					addr + 2
				];
			}
			case "(,x)":
				return [split[0] + " ($" + utils.hexbyte(this.readbyte(addr + 1)) + ", X)" + suffix, addr + 2];
			case "()":
				destAddr = this.readbyte(addr + 1);
				destAddr = this.readbyte(destAddr) | (this.readbyte(destAddr + 1) << 8);
				return [split[0] + " ($" + utils.hexbyte(this.readbyte(addr + 1)) + ")" + suffix + " ; $" + utils.hexword(destAddr) + suffix2, addr + 2];
			case "(abs)":
				destAddr = this.readbyte(addr + 1) | (this.readbyte(addr + 2) << 8);
				indDest = this.readbyte(destAddr) | (this.readbyte(destAddr + 1) << 8);
				return [split[0] + " ($" + formatJumpAddr(destAddr) + ")" + suffix + " ; $" + utils.hexword(indDest) + suffix2, addr + 3, indDest];
			case "(abs,x)":
				destAddr = this.readbyte(addr + 1) | (this.readbyte(addr + 2) << 8);
				indDest = this.readbyte(destAddr) | (this.readbyte(destAddr + 1) << 8);
				return [split[0] + " ($" + formatJumpAddr(destAddr) + ",x)" + suffix, addr + 3, indDest];
		}
		return [opcode, addr + 1];
	};
}
