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

		elm.addEventListener("wheel", (e) => this.onMouseWheel(e), {passive: true})
		elm.addEventListener("click", (e)=> this.onMouseClick(e));
	}

	onMouseWheel(e) {
		this.dumpMemAddr+= 16 * (e.deltaY>0?1:-1);
		this.dumpMemAddr&= 0xFFFF;
		this.update();
	}

	async onMouseClick(e) {
		let value;
		if(e.target.className == "value") {
			const addrStr= e.target.parentElement.id;
			const parts= addrStr.split(":");
			const bank= parseInt("0x"+parts[0]);
			const addr= parseInt("0x"+parts[1]) + Number(e.target.id);

			// this.dbg.getValueDlg();

			value= parseInt(prompt(utils.hexbyte(bank)+":"+utils.hexword(addr) + ": VALUE ? (as hexa value)"), 16);
			if(isNaN(value))
				return;

			// this.memory[bank*0x10000 + addr]= value & 0xFF;
			await this.vm.waitMessage("memWrite", {addr, value: value & 0xFF});

			this.vm.updateVideo();
		} else {
			value= parseInt(prompt("ADDRESS ? (as hexa value)"), 16);
			if(isNaN(value))
				return;
			this.dumpMemAddr= value & 0xFFFF;
			this.dumpMemBank= value>>16;
		}
		this.update();
	}
	async update() {
		const bytes= await this.vm.waitMessage("dbgReadBytes", {addr: this.dumpMemAddr & 0xFFFF, count: 640});
		let dumpStr= "";
		for(let line= 0; line<this.lineCount; line++) {
			const addr= (this.dumpMemAddr + line*16) & 0xFFFF;
			dumpStr+= `<div class="addr" id="${utils.hexbyte(this.dumpMemBank)}:${utils.hexword(addr)}">${utils.hexbyte(this.dumpMemBank)}${utils.hexword(addr)}`;
			let charsStr= "";
			for(let column= 0; column<16; column++) {
				let byte= bytes[line*16 + column];
				dumpStr+= 	` <span class="value" id="${column}">` +
								// utils.hexbyte(this.memory[(this.dumpMemBank*0x10000)+addr+column]) +
								utils.hexbyte( byte ) +
							"</span>";
				byte&= 0x7F;
				if(byte<0x20)
					charsStr+= ".";
				else
					charsStr+= String.fromCharCode(byte);
			}
			dumpStr+= " | " + charsStr.replace(/</g,"&lt;") + "</div>";
		}
		this.UImem.innerHTML= dumpStr;
	}

}
