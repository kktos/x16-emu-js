
export default class Bus {
	constructor(controller, buffer) {
		this.controller= controller;
		this.ram= new Uint8Array(buffer);
	}

	reset() {}

	read(addr) {
		return this.ram[addr & 0xFFFF];
	}

	write(addr, value) {
		this.ram[addr & 0xFFFF]= value & 0xFF;
	}

	writeHexa(bank, addr, hexString) {
		const values= hexString.match(/[0-9a-fA-F]+/g);
		for(let idx= 0; idx<values.length; idx++)
			this.write(addr++, Number.parseInt(values[idx],16));
		return addr;
	}

	writeString(bank, addr, str) {
		[...str].forEach(c => this.write(addr++, c.charCodeAt(0)));
		return addr;
	}

}
