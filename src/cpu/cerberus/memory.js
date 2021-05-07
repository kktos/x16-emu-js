

export function simpleRam8(length) {

	this.ram = new Uint8Array(length);

	this.read = function(address) {
		return this.ram[address];
	}

	this.write = function(address, data) {
		this.ram[address] = data;
	}

	this.getArray = function() {
		return this.ram;
	}
}
