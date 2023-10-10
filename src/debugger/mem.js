import * as utils from "../utils.js";

export default class MemViewer {

	constructor(dbg, elm, count) {
		this.lineCount= count;
		this.memory= dbg.memory;
		this.UImem= elm;
		this.dbg= dbg;
		this.vm= dbg.vm;
		this.dumpMemAddr= 0;
		this.dumpMemBank= 0;
		this.wannaRealAddr= false;

		elm.addEventListener("wheel", (e) => this.onMouseWheel(e), {passive: true})
		elm.addEventListener("click", (e)=> this.onMouseClick(e));
	}

	onMouseWheel(e) {
		this.dumpMemAddr+= 16 * (e.deltaY>0?1:-1);
		this.dumpMemAddr&= 0xFFFF;
		this.update();
	}

	resize(count) {
		this.lineCount= count;
	}

	async onMouseClick(e) {
		let value;
		if(e.target.className === "value") {
			const addrStr= e.target.parentElement.id;
			const parts= addrStr.split(":");
			const bank= parseInt(`0x${parts[0]}`);
			const addr= parseInt(`0x${parts[1]}`) + Number(e.target.id);

			// this.dbg.getValueDlg();

			value= parseInt(prompt(`${utils.hexbyte(bank)}:${utils.hexword(addr)}: Hexa Value ?`), 16);
			if(Number.isNaN(value))
				return;

			// this.memory[bank*0x10000 + addr]= value & 0xFF;
			await this.vm.waitMessage("memWrite", {addr: (bank << 16) + addr, value: value & 0xFF});

			this.vm.updateVideo();
		} else {
			let addr= prompt("ADDRESS ? (prefix with ! for real addr)");
			this.wannaRealAddr= addr?.match(/^!/) != null;
			if(this.wannaRealAddr) {
				addr= addr.slice(1);
			}
			value= parseInt(addr, 16);
			if(Number.isNaN(value))
				return;
			this.dumpMemAddr= value & 0xFFFF;
			this.dumpMemBank= value>>16;
		}
		this.update();
	}
	async update() {
		const bytes= await this.vm.waitMessage((this.wannaRealAddr ? "dbgReadBytes" : "memReadBytes"), {addr: (this.dumpMemBank<<16) + this.dumpMemAddr, count: 640});
		let dumpStr= "";
		for(let line= 0; line<this.lineCount; line++) {
			const addr= (this.dumpMemAddr + line*16) & 0xFFFF;
			dumpStr+= `<div class="addr ${this.wannaRealAddr?"real":""}" id="${utils.hexbyte(this.dumpMemBank)}:${utils.hexword(addr)}">${utils.hexbyte(this.dumpMemBank)}${utils.hexword(addr)}`;
			let charsStr= "";
			for(let column= 0; column<16; column++) {
				let byte= bytes[line*16 + column];
				dumpStr+= 	` <span class="value" id="${column}">${utils.hexbyte( byte )}</span>`;
				byte&= 0x7F;
				if(byte<0x20)
					charsStr+= ".";
				else
					charsStr+= String.fromCharCode(byte);
			}
			dumpStr+= ` | ${charsStr.replace(/</g,"&lt;")}</div>`;
		}
		this.UImem.innerHTML= dumpStr;
	}

}
