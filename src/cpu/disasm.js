import instructions from "../debugger/disassembler/instructions.js";
import * as utils from "../utils.js";

const commonInstructions= /(RTS|B..|JMP|JSR|LD[AXY]|ST[AXY]|TA[XY]|T[XY]A|AD[DC]|SUB|SBC|CLC|SEC|CMP|EOR|ORR|AND|INC|DEC).*/;
const uncommonInstrucions= /.*,\s*([XY]|X\))$/;

function formatAddr(addr) {
	// return "<span class='instr_mem_ref'>$" + utils.hexword(addr) + "</span>";
	return utils.hexword(addr);
}

function formatJumpAddr(addr) {
	// return "<span class='instr_instr_ref'>$" + utils.hexword(addr) + "</span>";
	return utils.hexword(addr);
}

function readbyte(bank, addr, readingOpcode= false) {
	return core.bus.read(addr, !readingOpcode);
	// addr&= 0xFFFF;
	// return this.memory[bank*0x10000+addr];
}

function readword(bank, addr, readingOpcode= false) {
	return core.bus.read(addr+1, !readingOpcode)<<8 | core.bus.read(addr, !readingOpcode);
	// const base= bank*0x10000;
	// return (this.memory[base+((addr+1)&0xFFFF)]<<8) | this.memory[base+(addr&0xFFFF)];
}

function disassemble(bank, addr) {
	let len= 1;
	let temp_str;
	let ret_str= "";

	const instrTemplate= instructions[readbyte(bank, addr, true)];

	// if(!temp_str) {
	// 	console.log(bank, addr);
	// }

	// if(!instrTemplate)
	// 	instrTemplate= "???";

	if(typeof instrTemplate == "object") {
		const extInstrOp= readbyte(bank, addr+1, true);
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
				const byt= readbyte(bank, addr+len, true);
				ret_str+= utils.hexbyte(byt);

				switch(addrMode) {
					case "($),Y": {
						const destAddr= readword(bank, byt);
						comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(core.Y)}= $${utils.hexword(destAddr+core.Y)}`;
						break;
					}
					case "$": {
						const value= readbyte(bank, byt);
						comment= `$${utils.hexbyte(value)}`;
						break;
					}
				}

				len++;
				break;
			}

			case "r":
				ret_str+= "$"+utils.hexword(addr + utils.signExtend(readbyte(bank, addr + len, true)) + 2);
				len++;
				if(core.PC != addr)
					break;
				let willBranch= false;
				switch(op) {
					case "BPL":
						willBranch= 0== core.FlagN;
						break;
					case "BMI":
						willBranch= 1 == core.FlagN;
						break;
					case "BCC":
						willBranch= 0 == core.FlagC;
						break;
					case "BCS":
						willBranch= 1 == core.FlagC;
						break;
					case "BEQ":
						willBranch= 1 == core.FlagZ;
						break;
					case "BNE":
						willBranch= 0 == core.FlagZ;
						break;
				}
				if(willBranch)
					comment= "will branch";
				break;

			case "%": {
				const destAddr = readbyte(bank, addr + len, true) | (readbyte(bank, addr + len + 1, true) << 8);
				const isFnCall = op[0] == "J"; //["JMP", "JSR"].includes(op);

				let finalAddr;
				switch(addrMode) {
					case "(%)": {
						finalAddr= utils.hexword(readbyte(bank, destAddr) | (readbyte(bank, destAddr + 1) << 8));
						break;
					}
					case "%": {
						finalAddr= !isFnCall ? utils.hexbyte(readbyte(bank, destAddr)) : null;
						break;
					}
					case "%,Y": {
						comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(core.Y)}= $${utils.hexword(destAddr+core.Y)}`;
						break;
					}
					case "%,X": {
						comment= `$${utils.hexword(destAddr)}+$${utils.hexbyte(core.X)}= $${utils.hexword(destAddr+core.X)}`;
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

function getPrevInstrAddr(bank, address) {
	address &= 0xffff;
	let bestAddr= address - 1;
	let bestScore= 0;
	for (let startingPoint= address - 20; startingPoint !== address; startingPoint++) {
		let score= 0;
		let addr= startingPoint & 0xffff;
		while (addr < address) {
			let result= disassemble(bank, addr);
			if (result[0] === core.PC) score += 10; // huge boost if this instruction was executed
			if (result[0].match(commonInstructions) && !result[0].match(uncommonInstrucions)) {
				score++;
			}
			if (result[1] === address) {
				if (score > bestScore) {
					bestScore= score;
					bestAddr= addr;
					break;
				}
			}
			addr= result[1];
		}
	}
	return bestAddr;
}

export function disasm(bank, addr, lineCount) {
	const lines= [];
	const startAddr= addr;
	for(let lineIdx= 0; lineIdx<lineCount/2; lineIdx++) {
		const rez= disassemble(bank, addr);
		lines.push({addr, disasm: rez[0], comment: rez[2], selected: addr==core.PC});
		addr= rez[1];
	}
	addr= startAddr;
	for(let lineIdx= 0; lineIdx<lineCount/2; lineIdx++) {
		addr= getPrevInstrAddr(bank, addr);
		const rez= disassemble(bank, addr);
		lines.unshift({addr, disasm: rez[0], comment: rez[2], selected: addr==core.PC});
	}
	return lines;
}
