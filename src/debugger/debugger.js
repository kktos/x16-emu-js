import { assemble } from "../../assets/libs/libasm6502.js";
// import { assemble } from "../6502assembler/6502assembler.js";
import * as utils from "../utils.js";
import MemViewer from "./mem.js";
import {window_init} from "./window.js";

// Some attempt at making prevInstruction more accurate; score the sequence of instructions leading
// up to the target by counting all "common" instructions as a point. The highest-scoring run of
// instructions is picked as the most likely, and the previous from that is used. Common instructions
// here mean loads, stores, branches, compares, arithmetic and carry-set/clear that don't use "unusual"
// indexing modes like abs,X, abs,Y and (zp,X).
// Good test cases:
//   Repton 2 @ 2cbb
//   MOS @ cfc8
// also, just starting from the back of ROM and going up...
// const commonInstructions= /(RTS|B..|JMP|JSR|LD[AXY]|ST[AXY]|TA[XY]|T[XY]A|AD[DC]|SUB|SBC|CLC|SEC|CMP|EOR|ORR|AND|INC|DEC).*/;
// const uncommonInstrucions= /.*,\s*([XY]|X\))$/;

let DISASM_LINES_COUNT= 40;

const id= "65x02 Machine Emulator";
export default class Debugger {

	constructor(vm, memory) {
		this.vm= vm;
		this.memory= new Uint8Array(memory);
		// this.disassembler= new Disassembler(vm, memory);

		this.stepCount= Infinity;
		this.stopOnOpcode= 0;

		this.setup();

		window.STOP= () => {
			const cycles_count= vm.waitMessage("stop");
			console.log("STOPPED:", cycles_count);
			vm.isRunning= false;
			this.updateBtns(true);
			this.update();
		};

		window.DBG= this;

		const refresh= () => {
			this.mem.update();
			setTimeout(refresh, 1000);
		};

		setTimeout(refresh, 1000);
	}

	async setup() {
		const bps= JSON.parse(localStorage.getItem(`${id}-bps`));
		this.breakpoints= bps && Array.isArray(bps) ? bps : [];

		await this.vm.waitMessage("initBP",{list: this.breakpoints});
	}

	setupUI() {
		this.uiroot= document.querySelector("#debugger");
		this.UIstack= this.uiroot.querySelector("#stack");
		this.UIdisasm= this.uiroot.querySelector("#disasm");
		this.UIbps= this.uiroot.querySelector("#bps");

		// setupConsole(this.uiroot.querySelector(".log"));

		this.editValueDlg= this.uiroot.querySelector("#editValueDlg");

		this.diskName= this.uiroot.querySelector("#btns #diskname");

		this.registers= {
			pc: this.uiroot.querySelector("#registers #PC"),
			a: this.uiroot.querySelector("#registers #A"),
			x: this.uiroot.querySelector("#registers #X"),
			y: this.uiroot.querySelector("#registers #Y"),
			sp: this.uiroot.querySelector("#registers #SP"),
			p: this.uiroot.querySelector("#registers #P")
		}

		DISASM_LINES_COUNT= Math.max(Math.floor(this.UIdisasm.clientHeight/10), 40);

		const memoryPanel= this.uiroot.querySelector("#mem");
		this.mem= new MemViewer(this, memoryPanel, DISASM_LINES_COUNT);

		this.uiroot.addEventListener("resize", (e)=> {
			DISASM_LINES_COUNT= Math.max(Math.floor(this.UIdisasm.clientHeight/10), 40);
			this.mem.resize(DISASM_LINES_COUNT);
		});

		this.UIdisasm.addEventListener("click", (e)=> this.onClickDisasm(e));

		this.uiroot
			.querySelector("#registers")
			.addEventListener("click", (e)=> this.onClickRegister(e));

		this.UIbps.addEventListener("click", (e)=> this.onClickBreakpoints(e));

		document
			.querySelectorAll(".btn")
			.forEach(btn => {
				btn.addEventListener("click", (e) => this.onClickBtn(e));
			});

		this.uiroot
			.querySelectorAll("INPUT")
			.forEach(btn => {
				btn.addEventListener("change", (e) => this.onChange(e));
			});


		window_init();

		this.updateBtns(false);
		this.update();
		this.uiroot.style.visibility= "visible";
	}

	onChange(e) {
		switch(e.target.id) {
			case "speed":
				this.vm.setSpeed(e.target.value);
				break;
		}
	}

	getValueDlg() {
		this.editValueDlg.showModal();
	}

	// async handleDirectoryEntry( dirHandle, out ) {
	// 	for await (const entry of dirHandle.values()) {
	// 	  if (entry.kind === "file"){
	// 		const file = await entry.getFile();
	// 		out[ file.name ] = file;
	// 	  }
	// 	  if (entry.kind === "directory") {
	// 		const newOut = out[ entry.name ] = {};
	// 		await this.handleDirectoryEntry( entry, newOut );
	// 	  }
	// 	}
	// }

	async onClickBtn(e) {

		switch(e.target.id) {
			case "asm-start": {
				document.querySelector("#asm").style.visibility= "visible";
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

			case "asm-asm": {
				const src= document.getElementById("editor").innerText;
				const opts= {
					readFile: () => ({path: "", content: src}),
				};
				try {
					const obj= assemble("", opts);
					this.storeInMem(obj);
				}
				catch(e) {
					console.log(e.message);
				}
				break;
			}

			case "boot-disk": {
				const [fileHandle] = await showOpenFilePicker();
				const file = await fileHandle.getFile();
				this.vm.setDisk(0, new Uint8Array(await file.arrayBuffer()));
				this.diskName.textContent = fileHandle.name;
				break;
			}

			case "reset":
				this.vm.reset();
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
				this.vm.stepOver().then(()=>this.update());
				break;

			case "step_into": {
				performance.clearMarks();
				performance.clearMeasures();
				performance.mark("step");
				this.vm.step().then(()=> {
					// performance.measure("STEP", "step");

					this.update();

					performance.measure("TOTAL", "step");

					performance.getEntriesByType("measure")
						.forEach(entry => console.log(`${entry.name}:${entry.duration}`));


				});
				break;
			}

			case "clear-log":
				console.clear();
				break;
		}
	}

	pause() {
		console.log("debugger pause()");
		this.updateBtns(true);
		this.vm.pause();
		this.update();
	}

	storeInMem(obj) {
		let addr= obj.segments.CODE.start;
		obj.obj.CODE.forEach((value) => {
			this.memory[addr++]= value;
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

	onClickDisasm(e) {
		const instructionID= e.target.parentElement.id;
		const bank= parseInt(document.querySelector(`#${instructionID} .bank`).attributes["data-bank"]?.value, 16);
		const addr= parseInt(document.querySelector(`#${instructionID} .addr`).attributes["data-addr"]?.value, 16);

		if(!Number.isNaN(bank) && !Number.isNaN(addr))
			this.toggleBreakpoint(bank*0x10000 + addr);
	}

	onClickRegister(e) {

		if(e.target.className === "register") {
			const value= prompt(`Hexa value for register ${e.target.id}`);
			this.vm.updateCPUregister(e.target.id, parseInt(value, 16));
		}
		else {
			const target= e.target.parentElement;
			if(target.className !== "status")
				return;
			this.vm.updateCPUregister(target.id, 1-target.querySelector(".flag").innerText);
		}
		this.update();
	}

	onClickBreakpoints(e) {
		const bpIdx= e.target.parentElement.id;
		switch(e.target.className) {
			case "bpn": {
				if(bpIdx < this.breakpoints.length) {
					this.toggleBreakpoint(this.breakpoints[bpIdx]);
				}
				break;
			}
			case "bpa": {
				const currentValue= bpIdx<this.breakpoints.length ? this.breakpoints[bpIdx] : null;
				let value= prompt("Enter Breakpoint address", currentValue ? utils.hexword(currentValue) : "");
				value= parseInt(value,16);
				if(!isNaN(value) && value != currentValue) {
					if(currentValue)
						this.toggleBreakpoint(currentValue);
					this.toggleBreakpoint(value);
				}
				break;
			}
		}
	}

	async bload(bank, addr) {
		const [fileHandle] = await showOpenFilePicker();
		const file = await fileHandle.getFile();
		this.vm.memWriteBin(bank, addr, new Uint8Array(await file.arrayBuffer()));
	}

	toggleBreakpoint(addr) {
		const idx= this.breakpoints.indexOf(addr);
		if(idx>=0) {
			this.vm.sendMessage("removeBP",{addr});
			this.breakpoints.splice(idx, 1);
		} else {
			this.vm.sendMessage("addBP",{addr});
			this.breakpoints.push(addr);
		}
		localStorage.setItem(`${id}-bps`, JSON.stringify(this.breakpoints));
		this.updateBreakpoints();
	}

	stop() {
		this.stopOnOpcode= 0;
		this.update();
	}

	async prevInstruction(cpuState, address) {
		address &= 0xffff;
		let bestAddr= address - 1;
		let bestScore= 0;
		for (let startingPoint= address - 20; startingPoint !== address; startingPoint++) {
			let score= 0;
			let addr= startingPoint & 0xffff;
			while (addr < address) {
				const result= await this.disassembler.disassemble(this.mem.dumpMemBank, addr, cpuState);
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

	// TODO : test syntax.js -> https://github.com/williamtroup/Syntax.js/tree/main
	async updateDisasm(cpuState) {
		const buildLine= ({lineID, addr, disasm, comment, selected}) => {
			const bank= utils.hexbyte(this.mem.dumpMemBank);
			addr= utils.hexword(addr);
			return `
				<div class="line ${selected?"selected":""}">
					<div class="instruction" id="inst${lineID}">
						<div class="bank" data-bank="${bank}"></div>
						<div class="addr" data-addr="${addr}"></div>
						<div class="disasm">${disasm}</div>
					</div>` +
					(comment ?
						`<div class="comment">${comment}</div>`
						:
						""
					) +
				"</div>";
		};

		this.vm.waitMessage("disasm", {bank: this.mem.dumpMemBank, addr: cpuState.PC, lineCount: DISASM_LINES_COUNT})
			.then(lines => {
				let disasmStr= "";
				for(let lineIdx= 0; lineIdx<lines.length; lineIdx++) {
					disasmStr+= buildLine(lines[lineIdx]);
				}
				this.UIdisasm.innerHTML= disasmStr;
			});

	}

	updateStack(cpuState) {
		let dumpStr= "";
		const stackAddr= (cpuState.SP-2) & 0xff;
		const currentSP= 0x100 | cpuState.SP;
		for(let line= 0; line<10; line++) {
			const addr= 0x100 | (stackAddr + line);
			dumpStr+= `<div class="${addr === currentSP?"selected":""}">
							${utils.hexword(addr)}: ${utils.hexbyte(this.memory[addr])}
						</div>`;
		}
		this.UIstack.innerHTML= dumpStr;
	}

	updateBreakpoints() {
		let dumpStr= "";
		for(let line= 0; line<10; line++) {
			dumpStr+= `<div id="${line}">
							<div class="bpn">BP${line}</div>
							<div class="bpa">${line< this.breakpoints.length ? utils.hexword(this.breakpoints[line]) : ""}</div>
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

		this.vm.getCPUstate().then(cpuState => {
			this.updateStack(cpuState);
			this.updateRegisters(cpuState);
			this.updateDisasm(cpuState);
		});
		this.updateBreakpoints();
		this.mem.update();

		console.flush ? console.flush() : console.clear();
	}

}
