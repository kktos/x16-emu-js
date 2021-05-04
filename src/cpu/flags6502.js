
export default class Flags {

	constructor() {
		this.reset();
	}

	reset() {
		this.c = this.z = this.i = this.d = this.v = this.n = false;
	}

	debugString() {
		return (this.n ? "N" : "n") +
			(this.v ? "V" : "v") +
			"xx" +
			(this.d ? "D" : "d") +
			(this.i ? "I" : "i") +
			(this.z ? "Z" : "z") +
			(this.c ? "C" : "c");
	}

	asByte() {
		var temp = 0x30;
		if (this.c) temp |= 0x01;
		if (this.z) temp |= 0x02;
		if (this.i) temp |= 0x04;
		if (this.d) temp |= 0x08;
		if (this.v) temp |= 0x40;
		if (this.n) temp |= 0x80;
		return temp;
	}

}