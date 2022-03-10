import { assemble } from "./6502assembler/6502assembler.js";
import Disassembler from "./cpu/disassembler/disassembler.js";
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
const id= "65x02 Machine Emulator";
export default class Debugger {

	constructor(vm, memory) {
		this.vm= vm;
		this.memory= new Uint8Array(memory);
		this.disassembler= new Disassembler(memory);

		this.stepCount= Infinity;
		this.stopOnOpcode= 0;
		this.dumpMemAddr= 0;
		this.dumpMemBank= 0;

		const bps= JSON.parse(localStorage.getItem(`${id}-bps`));
		this.breakpoints= bps && Array.isArray(bps) ? bps : [];
		this.vm.sendMessage("initBP",{list: this.breakpoints});

		this.setupUI();

	}

	setupUI() {
		this.uiroot= document.querySelector("#debugger");
		this.UIstack= this.uiroot.querySelector("#stack");
		this.UImem= this.uiroot.querySelector("#mem");
		this.UIdisasm= this.uiroot.querySelector("#disasm");
		this.UIbps= this.uiroot.querySelector("#bps");

		this.registers= {
			pc: this.uiroot.querySelector("#registers #PC"),
			a: this.uiroot.querySelector("#registers #A"),
			x: this.uiroot.querySelector("#registers #X"),
			y: this.uiroot.querySelector("#registers #Y"),
			sp: this.uiroot.querySelector("#registers #SP"),
			p: this.uiroot.querySelector("#registers #P")
		}

		this.uiroot
			.querySelector("#registers")
			.addEventListener("click", (e)=> this.onClickRegister(e));

		this.UImem.addEventListener("wheel", (e) => this.onPageMem(e), {passive: true})
		this.UImem.addEventListener("click", (e)=> this.onClickMem(e));

		this.UIbps.addEventListener("click", (e)=> this.onClickBreakpoints(e));

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
		this.update();
	}

	onChange(e) {
		switch(e.target.id) {
			case "speed":
				this.vm.setSpeed(e.target.value);
				break;
		}
	}

	async handleDirectoryEntry( dirHandle, out ) {
		for await (const entry of dirHandle.values()) {
		  if (entry.kind === "file"){
			const file = await entry.getFile();
			out[ file.name ] = file;
		  }
		  if (entry.kind === "directory") {
			const newOut = out[ entry.name ] = {};
			await this.handleDirectoryEntry( entry, newOut );
		  }
		}
	}

	async onClickBtn(e) {

		switch(e.target.id) {
			case "asm-start": {
				document.querySelector(".asm").style.visibility= "visible";
				break;
			}

			case "asm-close": {
				document.querySelector(".asm").style.visibility= "hidden";
				break;
			}

			case "asm-open": {

				const [fileHandle] = await showOpenFilePicker();
				const file = await fileHandle.getFile();
				document.getElementById("editor").innerText= await file.text();;

				// const out = {};
				// const dirHandle = await showDirectoryPicker();
				// await this.handleDirectoryEntry( dirHandle, out );
				// console.log( out );
				break;
			}

			case "asm": {
				const src= document.getElementById("editor").innerText;
				console.clear();
				assemble(src)
						.then(code => this.storeInMem(code));
				break;
			}

			case "boot-disk": {
				const [fileHandle] = await showOpenFilePicker();
				const file = await fileHandle.getFile();
				const buffer = await file.arrayBuffer();
				console.log(buffer);
				break;
			}

			case "reset":
				this.vm.setup();
				break;

			case "play":
				this.updateBtns(false);
				setTimeout(() => this.vm.play(), 0);
				break;

			case "pause":
				this.pause();
				break;

			case "step_out":
				this.vm.stepOut();
				break;

			case "step_over":
				this.vm.stepOver();
				this.update();
				break;

			case "step_into":
				this.vm.step();
				this.update();
				break;
		}
	}

	pause() {
		this.updateBtns(true);
		this.vm.pause();
		this.update();
	}

	storeInMem(data) {
		data.forEach((value, addr) => {
			this.memory[addr]= value;
		});
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
		this.dumpMemAddr+= 16 * (e.deltaY>0?1:-1);
		this.dumpMemAddr&= 0xFFFF;
		this.updateMem();
	}

	onClickMem(e) {
		let value;
		if(e.target.className == "value") {
			const addrStr= e.target.parentElement.id;
			const parts= addrStr.split(":");
			const bank= parseInt("0x"+parts[0]);
			const addr= parseInt("0x"+parts[1]) + Number(e.target.id);

			value= parseInt(prompt(utils.hexbyte(bank)+":"+utils.hexword(addr) + ": VALUE ? (as hexa value)"), 16);
			if(isNaN(value))
				return;
			this.memory[bank*0x10000 + addr]= value & 0xFF;

			this.vm.updateVideo();
		} else {
			value= parseInt(prompt("ADDRESS ? (as hexa value)"), 16);
			if(isNaN(value))
				return;
			this.dumpMemAddr= value & 0xFFFF;
			this.dumpMemBank= value>>16;
		}
		this.updateMem();
	}

	onClickRegister(e) {

		if(e.target.className == "register") {
			let value= prompt("Hexa value for register "+e.target.id);
			this.vm.updateCPUregister(e.target.id, parseInt(value, 16));
		}
		else {
			const target= e.target.parentElement;
			if(target.className != "status")
				return;
			this.vm.updateCPUregister(target.id, 1-target.querySelector(".flag").innerText);
		}
		this.update();
	}

	onClickBreakpoints(e) {
		const currentValue= e.target.id<this.breakpoints.length ? this.breakpoints[e.target.id] : null;
		let value= prompt("Enter Breakpoint address", currentValue ? utils.hexword(currentValue) : "");
		if(value=="" && currentValue) {
			this.vm.sendMessage("removeBP",{addr: currentValue});
			const idx= this.breakpoints.indexOf(currentValue);
			this.breakpoints.splice(idx, 1);
		} else {
			value= parseInt(value, 16);
			this.vm.sendMessage("addBP",{addr: value});
			this.breakpoints.push(value);
		}
		localStorage.setItem(`${id}-bps`, JSON.stringify(this.breakpoints));
		this.updateBreakpoints();
}

	// onInstruction(pc, opcode) {
	// 	return 	!this.stepCount--
	// 			|| opcode == 0x00
	// 			|| (this.stopOnOpcode? opcode == this.stopOnOpcode : false);
	// }

	// step() {
	// 	this.stepCount= 1;
	// }

	stop() {
		this.stopOnOpcode= 0;
		this.update();
	}

	prevInstruction(cpuState, address) {
		address &= 0xffff;
		let bestAddr= address - 1;
		let bestScore= 0;
		for (let startingPoint= address - 20; startingPoint !== address; startingPoint++) {
			let score= 0;
			let addr= startingPoint & 0xffff;
			while (addr < address) {
				let result= this.disassembler.disassemble(this.dumpMemBank, addr, cpuState);
				if (result[0] === cpuState.PC) score += 10; // huge boost if this instruction was executed
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

	updateDisasm(cpuState) {
		const buildLine= (addr, asm, comment, selected= false) => {
			return `
				<div class="line ${selected?"selected":""}">
					<div class="instruction">
					${utils.hexbyte(this.dumpMemBank)}:${utils.hexword(addr)}: ${asm}
					</div>` +
					(comment ?
						`<div class="comment">${comment}</div>`
						:
						""
					) +
				"</div>";
		};

		let disasmStr= "";
		let addr= cpuState.PC;
		for(let line= 0; line<DISASM_LINES_COUNT/2; line++) {
			const rez= this.disassembler.disassemble(this.dumpMemBank, addr, cpuState);
			disasmStr+= buildLine(addr, rez[0], rez[2], addr==cpuState.PC);
			addr= rez[1];
		}
		addr= cpuState.PC;
		for(let line= 0; line<DISASM_LINES_COUNT/2; line++) {
			addr= this.prevInstruction(cpuState, addr);
			const rez= this.disassembler.disassemble(this.dumpMemBank, addr, cpuState);
			disasmStr= buildLine(addr, rez[0], rez[2]) + disasmStr;
		}

		this.UIdisasm.innerHTML= disasmStr;
	}

	updateMem() {
		let dumpStr= "";
		for(let line= 0; line<DISASM_LINES_COUNT; line++) {
			const addr= (this.dumpMemAddr + line*16) & 0xFFFF;
			dumpStr+= `<div class="addr" id="${utils.hexbyte(this.dumpMemBank)}:${utils.hexword(addr)}">${utils.hexbyte(this.dumpMemBank)}:${utils.hexword(addr)}:`;
			for(let column= 0; column<16; column++)
				dumpStr+= 	` <span class="value" id="${column}">` +
								utils.hexbyte(this.memory[(this.dumpMemBank*0x10000)+addr+column]) +
							"</span>";
			dumpStr+= "</div>";
		}
		this.UImem.innerHTML= dumpStr;
	}

	updateStack(cpuState) {
		let dumpStr= "";
		let stackAddr= (cpuState.SP-2) & 0xff;
		const currentSP= 0x100 | cpuState.SP;
		for(let line= 0; line<10; line++) {
			const addr= 0x100 | (stackAddr + line);
			dumpStr+= `<div class="${addr == currentSP?"selected":""}">
							${utils.hexword(addr)}: ${utils.hexbyte(this.memory[addr])}
						</div>`;
		}
		this.UIstack.innerHTML= dumpStr;
	}

	updateBreakpoints() {
		let dumpStr= "";
		for(let line= 0; line<10; line++) {
			dumpStr+= `<div id="${line}">
							BP${line} ${line< this.breakpoints.length ? utils.hexword(this.breakpoints[line]) : ""}
						</div>`;
		}
		this.UIbps.innerHTML= dumpStr;
	}

	updateRegisters(cpuState) {
		this.registers.pc.innerHTML= utils.hexword(cpuState.PC);
		this.registers.a.innerHTML= utils.hexbyte(cpuState.A);
		this.registers.x.innerHTML= utils.hexbyte(cpuState.X);
		this.registers.y.innerHTML= utils.hexbyte(cpuState.Y);
		this.registers.sp.innerHTML= utils.hexword(0x100 | cpuState.SP);
		// this.registers.p.innerHTML= utils.hexbyte(cpuState.p.asByte());

		this.uiroot.querySelectorAll(".p.register .status").forEach((el) => {
			el.querySelector(".flag").innerHTML= cpuState.P[el.id] ? 1 : 0;
		});
	}

	async update() {
		const cpuState= await this.vm.getCPUstate();
		this.updateStack(cpuState);
		this.updateBreakpoints();
		this.updateRegisters(cpuState);
		this.updateMem();
		this.updateDisasm(cpuState);

	}

}
