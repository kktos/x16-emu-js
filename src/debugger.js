import {TEXT_LINES} from "./apple2-monitor.js";

// Some attempt at making prevInstruction more accurate; score the sequence of instructions leading
// up to the target by counting all "common" instructions as a point. The highest-scoring run of
// instructions is picked as the most likely, and the previous from that is used. Common instructions
// here mean loads, stores, branches, compares, arithmetic and carry-set/clear that don't use "unusual"
// indexing modes like abs,X, abs,Y and (zp,X).
// Good test cases:
//   Repton 2 @ 2cbb
//   MOS @ cfc8
// also, just starting from the back of ROM and going up...
const commonInstructions= /(RTS|B..|JMP|JSR|LD[AXY]|ST[AXY]|TA[XY]|T[XY]A|AD[DC]|SUB|SBC|CLC|SEC|CMP|EOR|ORR|AND|INC|DEC).*/;
const uncommonInstrucions= /.*,\s*([XY]|X\))$/;

export default class Debugger {

	constructor(cpu) {
		this.cpu= cpu;
		this.bus= cpu.bus;

		this.stepCount= 0;
	}

	onInstruction(pc, opcode) {
		if(opcode == 0)
			console.log("BRK", pc.toString(16).padStart(4,"0"));

		return !this.stepCount-- || Number(opcode) == 0x00;
	}

	step() {
		this.stepCount= 1;
	}

	prevInstruction(address) {
		address &= 0xffff;
		let bestAddr= address - 1;
		let bestScore= 0;
		for (let startingPoint= address - 20; startingPoint !== address; startingPoint++) {
			let score= 0;
			let addr= startingPoint & 0xffff;
			while (addr < address) {
				let result= this.cpu.disassembler.disassemble(addr);
				if (result[0] === this.cpu.pc) score += 10; // huge boost if this instruction was executed
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

	update() {
		document.querySelector("#debugger #registers #pc").innerHTML= this.cpu.pc.toString(16).padStart(4, "0");
		document.querySelector("#debugger #registers #a").innerHTML= this.cpu.a.toString(16).padStart(2, "0");
		document.querySelector("#debugger #registers #x").innerHTML= this.cpu.x.toString(16).padStart(2, "0");
		document.querySelector("#debugger #registers #y").innerHTML= this.cpu.y.toString(16).padStart(2, "0");
		document.querySelector("#debugger #registers #s").innerHTML= this.cpu.s.toString(16).padStart(2, "0");

		let dumpStr= "";
		for(let line= 0; line<6; line++) {
			const addr= (TEXT_LINES[line]).toString(16).toUpperCase();
			dumpStr+= addr.padStart(4, '0')+": ";
			for(let column= 0; column<16; column++) {
				const char= (this.bus.ram[TEXT_LINES[line]+column]).toString(16);
				dumpStr+= char.padStart(2, '0') + " ";
			}
			dumpStr+= "<br />";
		}
		document.querySelector("#debugger #mem").innerHTML= dumpStr;

		const buildLine= (addr, asm, selected= false) => {
			return `
				<div class="${selected?"selected":""}">
				${addr.toString(16).padStart(4, "0")}: ${asm.toLowerCase()}
				</div>
				`;
		};

		let disasmStr= "";
		let addr= this.cpu.pc;
		for(let line= 0; line<10; line++) {
			const rez= this.cpu.disassembler.disassemble(addr, true);
			disasmStr+= buildLine(addr, rez[0], addr==this.cpu.pc);
			addr= rez[1];
		}
		addr= this.cpu.pc;
		for(let line= 0; line<10; line++) {
			addr= this.prevInstruction(addr);
			const rez= this.cpu.disassembler.disassemble(addr, true);
			disasmStr= buildLine(addr, rez[0]) + disasmStr;
		}

		document.querySelector("#debugger #disasm").innerHTML= disasmStr;
	}

}