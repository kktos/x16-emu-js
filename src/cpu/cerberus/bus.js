import KeyMap from "../../keymap.js";
export default class Bus {
	constructor(gc, buffer) {
		this.gc= gc;
		this.ram= new Uint8Array(buffer);
		this.keyWasRead= false;
		this.lastKeypressed= null;
		this.keys= new KeyMap();
	}

	read(addr) {
		addr= addr & 0xFFFF;

		if(addr==0xC000) {
			if(this.keyWasRead)
				return this.lastKeypressed | 0x80;

			const keyPressed= [...this.keys.map.entries()].find(k=>k[1]==true);
			if(!keyPressed)
				return 0;


			console.log(keyPressed);

			this.keyWasRead= true;
			this.keys.get(keyPressed[0]);
			switch(keyPressed[0]) {
				case "ArrowLeft":
					this.lastKeypressed= 0x88;
					break;
				case "ArrowRight":
					this.lastKeypressed= 0x95;
					break;
				case "Escape":
					this.lastKeypressed= 0x9B;
					break;
				case "Enter":
					this.lastKeypressed= 0x8D;
					break;
				case "Backspace":
					this.lastKeypressed= 0x88;
					break;
				default:
					this.lastKeypressed= keyPressed[0].charCodeAt(0);
					break;
			}

			return this.lastKeypressed | 0x80;
		}
		if(addr==0xC010) {
			this.keyWasRead= false;
		}

		return this.ram[addr];
	}

	write(addr, value) {
		this.ram[addr&0xFFFF]= value;
	}

	writeHexa(addr, hexString) {
		const values= hexString.match(/[0-9a-fA-F]+/g);
		for(let idx= 0; idx<values.length; idx++)
			this.write(addr++, parseInt(values[idx],16));
		return addr;
	}

	writeString(addr, str) {
		[...str].forEach(c => this.write(addr++, c.charCodeAt(0)));
		return addr;
	}

}
