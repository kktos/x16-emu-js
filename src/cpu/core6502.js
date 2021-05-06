import * as utils from "../utils.js";
import Flags from "./flags6502.js";
import Runner from "./runner.js";
import Disassembler from "./disassembler.js";

export default class Core6502 {
	constructor(model, bus) {
		this.model= model;
		this.bus= bus;
		this.a= this.x = this.y = this.s = 0;
		this.pc= 0;
		this.nmi= false;
		this.p= new Flags();
		this.runner= new Runner(this);
		this.disassembler= new Disassembler(this);
		this.forceTracing= false;
	}

	reset(hard) {
		this.pc= this.bus.cpuRead(0xfffc) | (this.bus.cpuRead(0xfffd) << 8);
		this.p.reset();
		this.p.i= true;
		this.nmi= false;
	}

	polltime(cycles) {
		cycles |= 0;
		this.currentCycles += cycles;
	}

	polltimeAddr(cycles, addr) {
		// cycles = cycles | 0;
		// if (this.is1MHzAccess(addr)) {
		// 	cycles += 1 + ((cycles ^ this.currentCycles) & 1);
		// }
		this.polltime(cycles);
	}

	incpc() {
		this.pc = (this.pc + 1) & 0xffff;
	};

	getb() {
		let result = this.bus.cpuRead(this.pc);
		this.incpc();
		return result | 0;
	};

	getw() {
		let result = this.bus.cpuRead(this.pc) | 0;
		this.incpc();
		result |= (this.bus.cpuRead(this.pc) | 0) << 8;
		this.incpc();
		return result | 0;
	};

	checkInt() {
		this.takeInt = !!(this.interrupt && !this.p.i);
		this.takeInt |= this.nmi;
	};

	setzn(v) {
		v &= 0xff;
		this.p.z = !v;
		this.p.n = !!(v & 0x80);
		return v | 0;
	};

	push(v) {
		this.bus.cpuWrite(0x100 + this.s, v);
		this.s = (this.s - 1) & 0xff;
	};

	pull() {
		this.s = (this.s + 1) & 0xff;
		return this.bus.cpuRead(0x100 + this.s);
	};

	NMI(nmi) {
		this.nmi = !!nmi;
	};

	brk(isIrq) {
		// Behavior here generally discovered via Visual 6502 analysis.
		// 6502 has a quirky BRK; it was sanitized in 65c12.
		// See also https://wiki.nesdev.com/w/index.php/CPU_interrupts
		let pushAddr = this.pc;
		if (!isIrq) pushAddr = (pushAddr + 1) & 0xffff;
		this.bus.cpuRead(pushAddr);

		this.push(pushAddr >>> 8);
		this.push(pushAddr & 0xff);
		let pushFlags = this.p.asByte();
		if (isIrq) pushFlags &= ~0x10;
		this.push(pushFlags);

		// NMI status is determined part way through the BRK / IRQ
		// sequence, and yes, on 6502, an NMI can redirect the vector
		// for a half-way done BRK instruction.
		this.polltime(4);
		let vector = 0xfffe;
		if ((this.model.nmos || isIrq) && this.nmi) {
			vector = 0xfffa;
			this.nmi = false;
		}
		this.takeInt = false;
		this.pc = this.bus.cpuRead(vector) | (this.bus.cpuRead(vector + 1) << 8);
		this.p.i = true;
		if (this.model.nmos) {
			this.polltime(3);
		} else {
			this.p.d = false;
			if (isIrq) {
				this.polltime(3);
			} else {
				this.polltime(2);
				// TODO: check 65c12 BRK interrupt poll timing.
				this.checkInt();
				this.polltime(1);
			}
		}
	};

	branch(taken) {
		let offset = utils.signExtend(this.getb());
		if (!taken) {
			this.polltime(1);
			this.checkInt();
			this.polltime(1);
			return;
		}
		let newPc = (this.pc + offset) & 0xffff;
		let pageCrossed = !!((this.pc & 0xff00) ^ (newPc & 0xff00));
		this.pc = newPc;
		if (!this.model.nmos) {
			this.polltime(2 + pageCrossed);
			this.checkInt();
			this.polltime(1);
		} else if (!pageCrossed) {
			this.polltime(1);
			this.checkInt();
			this.polltime(2);
		} else {
			// 6502 polls twice during a taken branch with page
			// crossing and either is sufficient to trigger IRQ.
			// See https://wiki.nesdev.com/w/index.php/CPU_interrupts
			this.polltime(1);
			this.checkInt();
			let sawInt = this.takeInt;
			this.polltime(2);
			this.checkInt();
			this.takeInt |= sawInt;
			this.polltime(1);
		}
	};

	adcNonBCD(addend) {
		let result = (this.a + addend + (this.p.c ? 1 : 0));
		this.p.v = !!((this.a ^ result) & (addend ^ result) & 0x80);
		this.p.c = !!(result & 0x100);
		this.a = result & 0xff;
		this.setzn(this.a);
	}

	// For flags and stuff see URLs like:
	// http://www.visual6502.org/JSSim/expert.html?graphics=false&a=0&d=a900f86911eaeaea&steps=16
	adcBCD(addend) {
		let ah = 0;
		let tempb = (this.a + addend + (this.p.c ? 1 : 0)) & 0xff;
		this.p.z = !tempb;
		let al = (this.a & 0xf) + (addend & 0xf) + (this.p.c ? 1 : 0);
		if (al > 9) {
			al -= 10;
			al &= 0xf;
			ah = 1;
		}
		ah += (this.a >>> 4) + (addend >>> 4);
		this.p.n = !!(ah & 8);
		this.p.v = !((this.a ^ addend) & 0x80) && !!((this.a ^ (ah << 4)) & 0x80);
		this.p.c = false;
		if (ah > 9) {
			this.p.c = true;
			ah -= 10;
			ah &= 0xf;
		}
		this.a = ((al & 0xf) | (ah << 4)) & 0xff;
	}

	// With reference to c64doc: http://vice-emu.sourceforge.net/plain/64doc.txt
	// and http://www.visual6502.org/JSSim/expert.html?graphics=false&a=0&d=a900f8e988eaeaea&steps=18
	sbcBCD(subend) {
		let carry = this.p.c ? 0 : 1;
		let al = (this.a & 0xf) - (subend & 0xf) - carry;
		let ah = (this.a >>> 4) - (subend >>> 4);
		if (al & 0x10) {
			al = (al - 6) & 0xf;
			ah--;
		}
		if (ah & 0x10) {
			ah = (ah - 6) & 0xf;
		}

		let result = this.a - subend - carry;
		this.p.n = !!(result & 0x80);
		this.p.z = !(result & 0xff);
		this.p.v = !!((this.a ^ result) & (subend ^ this.a) & 0x80);
		this.p.c = !(result & 0x100);
		this.a = al | (ah << 4);
	}

	adcBCDcmos(addend) {
		this.polltime(1); // One more cycle, apparently
		let carry = this.p.c ? 1 : 0;
		let al = (this.a & 0xf) + (addend & 0xf) + carry;
		let ah = (this.a >>> 4) + (addend >>> 4);
		if (al > 9) {
			al = (al - 10) & 0xf;
			ah++;
		}
		this.p.v = !((this.a ^ addend) & 0x80) && !!((this.a ^ (ah << 4)) & 0x80);
		this.p.c = false;
		if (ah > 9) {
			ah = (ah - 10) & 0xf;
			this.p.c = true;
		}
		this.a = this.setzn(al | (ah << 4));
	}

	sbcBCDcmos(subend) {
		this.polltime(1); // One more cycle, apparently
		let carry = this.p.c ? 0 : 1;
		let al = (this.a & 0xf) - (subend & 0xf) - carry;
		let result = this.a - subend - carry;
		if (result < 0) {
			result -= 0x60;
		}
		if (al < 0) result -= 0x06;

		this.adcNonBCD(subend ^ 0xff); // For flags
		this.a = this.setzn(result);
	}

	adc(addend) {
		if (!this.p.d) {
			this.adcNonBCD(addend);
		} else {
			this.model.nmos ? this.adcBCD(addend) : this.adcBCDcmos(addend);
		}
	}

	sbc(subend) {
		if (!this.p.d) {
			this.adcNonBCD(subend ^ 0xff);
		} else {
			this.model.nmos ? this.sbcBCD(subend) : this.sbcBCDcmos(subend);
		}
	}

	arr(arg) {
		// Insane instruction. I started with b-em source, but ended up using:
		// http://www.6502.org/users/andre/petindex/local/64doc.txt as reference,
		// tidying up as needed and fixing a couple of typos.
		if (this.p.d) {
			let temp = this.a & arg;

			let ah = temp >>> 4;
			let al = temp & 0x0f;

			this.p.n = this.p.c;
			this.a = (temp >>> 1) | (this.p.c ? 0x80 : 0x00);
			this.p.z = !this.a;
			this.p.v = (temp ^ this.a) & 0x40;

			if ((al + (al & 1)) > 5)
				this.a = (this.a & 0xf0) | ((this.a + 6) & 0xf);

			this.p.c = (ah + (ah & 1)) > 5;
			if (this.p.c)
				this.a = (this.a + 0x60) & 0xff;
		} else {
			this.a = this.a & arg;
			this.p.v = !!(((this.a >>> 7) ^ (this.a >>> 6)) & 0x01);
			this.a >>>= 1;
			if (this.p.c) this.a |= 0x80;
			this.setzn(this.a);
			this.p.c = !!(this.a & 0x40);
		}
	};

}
