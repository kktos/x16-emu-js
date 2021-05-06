import * as utils from "./utils.js";

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
const DISASM_LINES_COUNT= 40;
export default class Debugger {

	constructor(vm, cpu) {
		this.vm= vm;
		this.cpu= cpu;
		this.bus= cpu.bus;

		this.stepCount= Infinity;
		this.stopOnOpcode= 0;

		this.dumpAddr= 0;

		this.uiroot= document.querySelector("#debugger");
		this.registers= {
			pc: this.uiroot.querySelector("#registers #pc"),
			a: this.uiroot.querySelector("#registers #a"),
			x: this.uiroot.querySelector("#registers #x"),
			y: this.uiroot.querySelector("#registers #y"),
			s: this.uiroot.querySelector("#registers #s"),
			p: this.uiroot.querySelector("#registers #p")
		}

		this.uiroot
			.querySelector("#registers")
			.addEventListener("click", (e)=> this.onClickRegister(e));

		this.uiroot
			.querySelector("#mem")
			.addEventListener("wheel", (e) => this.onPageMem(e), {passive: true});

		this.uiroot
			.querySelectorAll(".btn")
			.forEach(btn => {
				btn.addEventListener("click", (e) => this.onClickBtn(e));
			});

		this.uiroot
			.querySelectorAll("INPUT")
			.forEach(btn => {
				btn.addEventListener("change", (e) => this.onChange(e));
			});

		this.updateBtns(false);
	}

	onChange(e) {
		switch(e.target.id) {
			case "speed":
				this.vm.setSpeed(e.target.value);
				break;
		}
	}

	onClickBtn(e) {
		switch(e.target.id) {
			case "play":
				this.updateBtns(false);
				this.vm.play();
				break;

			case "pause":
				this.updateBtns(true);
				this.vm.pause();
				this.update();
				break;

			case "step_out":
				this.stopOnOpcode= 0x60;
				this.vm.play();
				// this.update();
				break;

			case "step_into":
				this.step();
				this.vm.play();
				this.update();
				break;
		}
	}

	updateBtns(isPaused) {
		const btnList= this.uiroot.querySelectorAll(".btn");

		btnList.forEach(btn => {
				if(!isPaused) {
					btn.classList.add("running");
				}
				else {
					btn.classList.remove("running");
				}
			});
	}

	onPageMem(e) {
		this.dumpAddr+= 16 * (e.deltaY>0?1:-1);
		this.updateMem();
	}

	onClickRegister(e) {

		if(e.target.className == "register") {
			let value= prompt("Hexa value for register "+e.target.id);
			this.cpu[e.target.id]= parseInt(value, 16);
		}
		else {
			const target= e.target.parentElement;
			if(target.className != "status")
				return;
			this.cpu.p[target.id]= !this.cpu.p[target.id];
		}
		this.update();
	}

	onInstruction(pc, opcode) {
		return 	!this.stepCount--
				|| opcode == 0x00
				|| (this.stopOnOpcode? opcode == this.stopOnOpcode : false);
	}

	step() {
		this.stepCount= 1;
	}

	stop() {
		this.stopOnOpcode= 0;
		this.update();
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

	updateDisasm() {
		const buildLine= (addr, asm, selected= false) => {
			return `
				<div class="${selected?"selected":""}">
				${addr.toString(16).padStart(4, "0")}: ${asm.toLowerCase()}
				</div>
				`;
		};

		let disasmStr= "";
		let addr= this.cpu.pc;
		for(let line= 0; line<DISASM_LINES_COUNT/2; line++) {
			const rez= this.cpu.disassembler.disassemble(addr, true);
			disasmStr+= buildLine(addr, rez[0], addr==this.cpu.pc);
			addr= rez[1];
		}
		addr= this.cpu.pc;
		for(let line= 0; line<DISASM_LINES_COUNT/2; line++) {
			addr= this.prevInstruction(addr);
			const rez= this.cpu.disassembler.disassemble(addr, true);
			disasmStr= buildLine(addr, rez[0]) + disasmStr;
		}

		document.querySelector("#debugger #disasm").innerHTML= disasmStr;
	}

	updateMem() {
		let dumpStr= "";
		for(let line= 0; line<DISASM_LINES_COUNT; line++) {
			const addr= this.dumpAddr + line*16;
			dumpStr+= `<div>${utils.hexword(addr)}:`;
			for(let column= 0; column<16; column++) {
				const char= utils.hexbyte(this.bus.ram[addr+column]);
				dumpStr+= " "+char;
			}
			dumpStr+= "</div>";
		}
		document.querySelector("#debugger #mem").innerHTML= dumpStr;
	}

	updateStack() {
		let dumpStr= "";
		let stackAddr= (this.cpu.s-15) & 0xff;
		const currentSP= 0x100 | this.cpu.s;
		for(let line= 0; line<30; line++) {
			const addr= 0x100 | (stackAddr + line);
			dumpStr+= `<div class="${addr == currentSP?"selected":""}">
							${utils.hexword(addr)}: ${utils.hexbyte(this.bus.ram[addr])}
						</div>`;
		}
		document.querySelector("#debugger #stack").innerHTML= dumpStr;
	}

	updateRegisters() {
		this.registers.pc.innerHTML= utils.hexword(this.cpu.pc);
		this.registers.a.innerHTML= utils.hexbyte(this.cpu.a);
		this.registers.x.innerHTML= utils.hexbyte(this.cpu.x);
		this.registers.y.innerHTML= utils.hexbyte(this.cpu.y);
		this.registers.s.innerHTML= utils.hexword(0x100 | this.cpu.s);
		this.registers.p.innerHTML= utils.hexbyte(this.cpu.p.asByte());

		this.uiroot.querySelectorAll(".p.register .status").forEach((el) => {
			el.querySelector(".flag").innerHTML= this.cpu.p[el.id] ? 1 : 0;
		});
	}

	update() {
		this.updateStack();
		this.updateRegisters();
		this.updateMem();
		this.updateDisasm();

	}

}
