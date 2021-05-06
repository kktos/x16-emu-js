
export default class Runner {

	constructor(cpu) {
		this.cpu= cpu;
	}

	invalidOpcode(cpu, opcode) {
		if (is65c12) {
			// All undefined opcodes are NOPs on 65c12 (of varying lengths)
			// http://6502.org/tutorials/65c02opcodes.html has a list.
			// The default case is to treat them as one-cycle NOPs. Anything more than this is picked up below.
			switch (opcode) {
				case 0x02:
				case 0x22:
				case 0x42:
				case 0x62:
				case 0x82:
				case 0xc2:
				case 0xe2:
					// two bytes, two cycles
					this.cpu.getb();
					this.cpu.polltime(2);
					break;

				case 0x44:
					// two bytes, three cycles
					this.cpu.getb();
					this.cpu.polltime(3);
					break;

				case 0x54:
				case 0xd4:
				case 0xf4:
					// two bytes, four cycles
					this.cpu.getb();
					this.cpu.polltime(4);
					break;

				case 0x5c:
					// three bytes, eight cycles
					this.cpu.getw();
					this.cpu.polltime(8);
					break;

				case 0xdc:
				case 0xfc:
					// three bytes, four cycles
					this.cpu.getw();
					this.cpu.polltime(4);
					break;

				default:
					// one byte one cycle
					this.cpu.polltime(1);
					break;
			}
			return;
		}
		// Anything else is a HLT. Just hang forever...
		this.cpu.pc--;  // Account for the fact we've already incremented pc.
		this.cpu.polltime(1); // Take up some time though. Else we'll spin forever
	}

	run(opcode) {
		switch(opcode) {
			case 0x00: {
				// 00 - BRK

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.brk(false);
				break;
			}
			case 0x01: {
				// 01 - ORA (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				break;
			}
			case 0x02: {
				// 02 - undefined

				this.invalidOpcode(cpu, 0x02);
				break;
			}
			case 0x03: {
				// 03 - SLO (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(6, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x04: {
				// 04 - NOP zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x05: {
				// 05 - ORA zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				break;
			}
			case 0x06: {
				// 06 - ASL zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x07: {
				// 07 - SLO zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x08: {
				// 08 - PHP

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.push(this.cpu.p.asByte());
				break;
			}
			case 0x09: {
				// 09 - ORA imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				break;
			}
			case 0x0a: {
				// 0A - ASL A

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.a;
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a = REG;
				break;
			}
			case 0x0b: {
				// 0B - ANC imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG); this.cpu.p.c = this.cpu.p.n;
				break;
			}
			case 0x0c: {
				// 0C - NOP abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x0d: {
				// 0D - ORA abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				break;
			}
			case 0x0e: {
				// 0E - ASL abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x0f: {
				// 0F - SLO abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x10: {
				// 10 - BPL branch

				this.cpu.branch(!this.cpu.p.n);
				break;
			}
			case 0x11: {
				// 11 - ORA (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				}
				break;
			}
			case 0x12: {
				// 12 - undefined

				this.invalidOpcode(cpu, 0x12);
				break;
			}
			case 0x13: {
				// 13 - SLO (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x14: {
				// 14 - NOP zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x15: {
				// 15 - ORA zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				break;
			}
			case 0x16: {
				// 16 - ASL zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x17: {
				// 17 - SLO zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x18: {
				// 18 - CLC

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.c = false;
				break;
			}
			case 0x19: {
				// 19 - ORA abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				}
				break;
			}
			case 0x1a: {
				// 1A - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0x1b: {
				// 1B - SLO abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x1c: {
				// 1C - NOP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				}
				break;
			}
			case 0x1d: {
				// 1D - ORA abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a | REG);
				}
				break;
			}
			case 0x1e: {
				// 1E - ASL abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x1f: {
				// 1F - SLO abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x80);
				REG = (REG << 1) & 0xff;
				this.cpu.setzn(REG);
				this.cpu.a |= REG;
				this.cpu.setzn(this.cpu.a);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x20: {
				// 20 - JSR abs

				let REG = 0|0;
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				let addr = this.cpu.getw() | 0;
				let pushAddr = this.cpu.pc - 1;
				this.cpu.push(pushAddr >>> 8);
				this.cpu.push(pushAddr & 0xff);
				this.cpu.pc = addr;
				break;
			}
			case 0x21: {
				// 21 - AND (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				break;
			}
			case 0x22: {
				// 22 - undefined

				this.invalidOpcode(cpu, 0x22);
				break;
			}
			case 0x23: {
				// 23 - RLA (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(6, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x24: {
				// 24 - BIT zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.p.z = !(this.cpu.a & REG);
				this.cpu.p.v = !!(REG & 0x40);
				this.cpu.p.n = !!(REG & 0x80);
				break;
			}
			case 0x25: {
				// 25 - AND zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				break;
			}
			case 0x26: {
				// 26 - ROL zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x27: {
				// 27 - RLA zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x28: {
				// 28 - PLP

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				let tempFlags = this.cpu.pull();
				this.cpu.p.c = !!(tempFlags & 0x01);
				this.cpu.p.z = !!(tempFlags & 0x02);
				this.cpu.p.i = !!(tempFlags & 0x04);
				this.cpu.p.d = !!(tempFlags & 0x08);
				this.cpu.p.v = !!(tempFlags & 0x40);
				this.cpu.p.n = !!(tempFlags & 0x80);
				break;
			}
			case 0x29: {
				// 29 - AND imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				break;
			}
			case 0x2a: {
				// 2A - ROL A

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.a;
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = REG;
				break;
			}
			case 0x2b: {
				// 2B - ANC imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG); this.cpu.p.c = this.cpu.p.n;
				break;
			}
			case 0x2c: {
				// 2C - BIT abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.p.z = !(this.cpu.a & REG);
				this.cpu.p.v = !!(REG & 0x40);
				this.cpu.p.n = !!(REG & 0x80);
				break;
			}
			case 0x2d: {
				// 2D - AND abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				break;
			}
			case 0x2e: {
				// 2E - ROL abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x2f: {
				// 2F - RLA abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x30: {
				// 30 - BMI branch

				this.cpu.branch(this.cpu.p.n);
				break;
			}
			case 0x31: {
				// 31 - AND (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				}
				break;
			}
			case 0x32: {
				// 32 - undefined

				this.invalidOpcode(cpu, 0x32);
				break;
			}
			case 0x33: {
				// 33 - RLA (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x34: {
				// 34 - NOP zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x35: {
				// 35 - AND zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				break;
			}
			case 0x36: {
				// 36 - ROL zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x37: {
				// 37 - RLA zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x38: {
				// 38 - SEC

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.c = true;
				break;
			}
			case 0x39: {
				// 39 - AND abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				}
				break;
			}
			case 0x3a: {
				// 3A - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0x3b: {
				// 3B - RLA abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x3c: {
				// 3C - NOP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				}
				break;
			}
			case 0x3d: {
				// 3D - AND abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				}
				break;
			}
			case 0x3e: {
				// 3E - ROL abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x3f: {
				// 3F - RLA abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newBotBit = this.cpu.p.c ? 0x01 : 0x00;
				this.cpu.p.c = !!(REG & 0x80);
				REG = ((REG << 1) & 0xff) | newBotBit;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a & REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x40: {
				// 40 - RTI

				let REG = 0|0;
				let temp = this.cpu.pull();
				this.cpu.p.c = !!(temp & 0x01);
				this.cpu.p.z = !!(temp & 0x02);
				this.cpu.p.i = !!(temp & 0x04);
				this.cpu.p.d = !!(temp & 0x08);
				this.cpu.p.v = !!(temp & 0x40);
				this.cpu.p.n = !!(temp & 0x80);
				temp = this.cpu.pull();
				this.cpu.pc = temp | (this.cpu.pull() << 8);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0x41: {
				// 41 - EOR (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				break;
			}
			case 0x42: {
				// 42 - undefined

				this.invalidOpcode(cpu, 0x42);
				break;
			}
			case 0x43: {
				// 43 - SRE (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(6, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x44: {
				// 44 - NOP zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x45: {
				// 45 - EOR zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				break;
			}
			case 0x46: {
				// 46 - LSR zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x47: {
				// 47 - SRE zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x48: {
				// 48 - PHA

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.push(this.cpu.a);
				break;
			}
			case 0x49: {
				// 49 - EOR imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				break;
			}
			case 0x4a: {
				// 4A - LSR A

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.a;
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = REG;
				break;
			}
			case 0x4b: {
				// 4B - ASR imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				REG &= this.cpu.a;
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = REG;
				break;
			}
			case 0x4c: {
				// 4C - JMP abs

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				let addr = this.cpu.getw() | 0;
				this.cpu.pc = addr;
				break;
			}
			case 0x4d: {
				// 4D - EOR abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				break;
			}
			case 0x4e: {
				// 4E - LSR abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x4f: {
				// 4F - SRE abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x50: {
				// 50 - BVC branch

				this.cpu.branch(!this.cpu.p.v);
				break;
			}
			case 0x51: {
				// 51 - EOR (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				}
				break;
			}
			case 0x52: {
				// 52 - undefined

				this.invalidOpcode(cpu, 0x52);
				break;
			}
			case 0x53: {
				// 53 - SRE (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x54: {
				// 54 - NOP zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x55: {
				// 55 - EOR zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				break;
			}
			case 0x56: {
				// 56 - LSR zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x57: {
				// 57 - SRE zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x58: {
				// 58 - CLI

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.i = false;
				break;
			}
			case 0x59: {
				// 59 - EOR abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				}
				break;
			}
			case 0x5a: {
				// 5A - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0x5b: {
				// 5B - SRE abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x5c: {
				// 5C - NOP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				}
				break;
			}
			case 0x5d: {
				// 5D - EOR abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				}
				break;
			}
			case 0x5e: {
				// 5E - LSR abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x5f: {
				// 5F - SRE abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				this.cpu.p.c = !!(REG & 0x01);
				REG >>>= 1;
				this.cpu.setzn(REG);
				this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x60: {
				// 60 - RTS

				let REG = 0|0;
				this.cpu.polltime(5);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				let temp = this.cpu.pull();
				temp |= this.cpu.pull() << 8;
				this.cpu.pc = (temp + 1) & 0xffff;
				break;
			}
			case 0x61: {
				// 61 - ADC (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.adc(REG);
				break;
			}
			case 0x62: {
				// 62 - undefined

				this.invalidOpcode(cpu, 0x62);
				break;
			}
			case 0x63: {
				// 63 - RRA (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(6, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x64: {
				// 64 - NOP zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x65: {
				// 65 - ADC zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.adc(REG);
				break;
			}
			case 0x66: {
				// 66 - ROR zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x67: {
				// 67 - RRA zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x68: {
				// 68 - PLA

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.a = this.cpu.setzn(this.cpu.pull());
				break;
			}
			case 0x69: {
				// 69 - ADC imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.adc(REG);
				break;
			}
			case 0x6a: {
				// 6A - ROR A

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.a;
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.a = REG;
				break;
			}
			case 0x6b: {
				// 6B - ARR imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.arr(REG);
				break;
			}
			case 0x6c: {
				// 6C - JMP (abs)

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let nextAddr = ((addr + 1) & 0xff) | (addr & 0xff00);
				let lo, hi;
				this.cpu.polltimeAddr(4, addr);
				this.cpu.checkInt();
				lo = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, nextAddr);
				hi = this.cpu.bus.cpuRead(nextAddr);
				addr = lo | (hi << 8);
				this.cpu.pc = addr;
				break;
			}
			case 0x6d: {
				// 6D - ADC abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.adc(REG);
				break;
			}
			case 0x6e: {
				// 6E - ROR abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x6f: {
				// 6F - RRA abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x70: {
				// 70 - BVS branch

				this.cpu.branch(this.cpu.p.v);
				break;
			}
			case 0x71: {
				// 71 - ADC (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.adc(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.adc(REG);
				}
				break;
			}
			case 0x72: {
				// 72 - undefined

				this.invalidOpcode(cpu, 0x72);
				break;
			}
			case 0x73: {
				// 73 - RRA (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x74: {
				// 74 - NOP zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0x75: {
				// 75 - ADC zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.adc(REG);
				break;
			}
			case 0x76: {
				// 76 - ROR zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x77: {
				// 77 - RRA zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x78: {
				// 78 - SEI

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.i = true;
				break;
			}
			case 0x79: {
				// 79 - ADC abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.adc(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.adc(REG);
				}
				break;
			}
			case 0x7a: {
				// 7A - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0x7b: {
				// 7B - RRA abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x7c: {
				// 7C - NOP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				}
				break;
			}
			case 0x7d: {
				// 7D - ADC abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.adc(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.adc(REG);
				}
				break;
			}
			case 0x7e: {
				// 7E - ROR abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x7f: {
				// 7F - RRA abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				let newTopBit = this.cpu.p.c ? 0x80 : 0x00;
				this.cpu.p.c = !!(REG & 0x01);
				REG = (REG >>> 1) | newTopBit;
				this.cpu.setzn(REG);
				this.cpu.adc(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x80: {
				// 80 - NOP imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				break;
			}
			case 0x81: {
				// 81 - STA (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				REG = this.cpu.a;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x82: {
				// 82 - NOP imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				break;
			}
			case 0x83: {
				// 83 - SAX (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				REG = this.cpu.a & this.cpu.x;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x84: {
				// 84 - STY zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.y;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x85: {
				// 85 - STA zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.a;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x86: {
				// 86 - STX zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.x;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x87: {
				// 87 - SAX zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.a & this.cpu.x;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x88: {
				// 88 - DEY

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.y = this.cpu.setzn(this.cpu.y - 1);
				break;
			}
			case 0x89: {
				// 89 - NOP imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				break;
			}
			case 0x8a: {
				// 8A - TXA

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.a = this.cpu.setzn(this.cpu.x);
				break;
			}
			case 0x8b: {
				// 8B - ANE imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn((this.cpu.a | 0xee) & REG & this.cpu.x);
				break;
			}
			case 0x8c: {
				// 8C - STY abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				REG = this.cpu.y;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x8d: {
				// 8D - STA abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				REG = this.cpu.a;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x8e: {
				// 8E - STX abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				REG = this.cpu.x;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x8f: {
				// 8F - SAX abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				REG = this.cpu.a & this.cpu.x;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x90: {
				// 90 - BCC branch

				this.cpu.branch(!this.cpu.p.c);
				break;
			}
			case 0x91: {
				// 91 - STA (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = this.cpu.a;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x92: {
				// 92 - undefined

				this.invalidOpcode(cpu, 0x92);
				break;
			}
			case 0x93: {
				// 93 - SHA (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = this.cpu.a & this.cpu.x & ((addr >>> 8) + 1) & 0xff;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x94: {
				// 94 - STY zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.y;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x95: {
				// 95 - STA zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.a;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x96: {
				// 96 - STX zp,y

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.y) & 0xff;
				REG = this.cpu.x;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x97: {
				// 97 - SAX zp,y

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.y) & 0xff;
				REG = this.cpu.a & this.cpu.x;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0x98: {
				// 98 - TYA

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.a = this.cpu.setzn(this.cpu.y);
				break;
			}
			case 0x99: {
				// 99 - STA abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = this.cpu.a;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x9a: {
				// 9A - TXS

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.s = this.cpu.x;
				break;
			}
			case 0x9b: {
				// 9B - SHS abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.s = this.cpu.a & this.cpu.x;
				REG = this.cpu.a & this.cpu.x & ((addr >>> 8) + 1) & 0xff;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x9c: {
				// 9C - SHY abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = (this.cpu.y & ((addr >>> 8)+1)) & 0xff;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x9d: {
				// 9D - STA abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = this.cpu.a;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x9e: {
				// 9E - SHX abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = (this.cpu.x & ((addr >>> 8)+1)) & 0xff;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0x9f: {
				// 9F - SHA abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuRead(addrNonCarry);
				REG = this.cpu.a & this.cpu.x & ((addr >>> 8) + 1) & 0xff;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xa0: {
				// A0 - LDY imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.y = this.cpu.setzn(REG);
				break;
			}
			case 0xa1: {
				// A1 - LDA (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(REG);
				break;
			}
			case 0xa2: {
				// A2 - LDX imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.x = this.cpu.setzn(REG);
				break;
			}
			case 0xa3: {
				// A3 - LAX (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				let magic = 0xff;
				this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				break;
			}
			case 0xa4: {
				// A4 - LDY zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.y = this.cpu.setzn(REG);
				break;
			}
			case 0xa5: {
				// A5 - LDA zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(REG);
				break;
			}
			case 0xa6: {
				// A6 - LDX zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.x = this.cpu.setzn(REG);
				break;
			}
			case 0xa7: {
				// A7 - LAX zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				let magic = 0xff;
				this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				break;
			}
			case 0xa8: {
				// A8 - TAY

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.y = this.cpu.setzn(this.cpu.a);
				break;
			}
			case 0xa9: {
				// A9 - LDA imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.a = this.cpu.setzn(REG);
				break;
			}
			case 0xaa: {
				// AA - TAX

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.x = this.cpu.setzn(this.cpu.a);
				break;
			}
			case 0xab: {
				// AB - LXA imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				let magic = 0xee;
				this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				break;
			}
			case 0xac: {
				// AC - LDY abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.y = this.cpu.setzn(REG);
				break;
			}
			case 0xad: {
				// AD - LDA abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(REG);
				break;
			}
			case 0xae: {
				// AE - LDX abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.x = this.cpu.setzn(REG);
				break;
			}
			case 0xaf: {
				// AF - LAX abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				let magic = 0xff;
				this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				break;
			}
			case 0xb0: {
				// B0 - BCS branch

				this.cpu.branch(this.cpu.p.c);
				break;
			}
			case 0xb1: {
				// B1 - LDA (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(REG);
				}
				break;
			}
			case 0xb2: {
				// B2 - undefined

				this.invalidOpcode(cpu, 0xB2);
				break;
			}
			case 0xb3: {
				// B3 - LAX (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					let magic = 0xff;
					this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					let magic = 0xff;
					this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				}
				break;
			}
			case 0xb4: {
				// B4 - LDY zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.y = this.cpu.setzn(REG);
				break;
			}
			case 0xb5: {
				// B5 - LDA zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.a = this.cpu.setzn(REG);
				break;
			}
			case 0xb6: {
				// B6 - LDX zp,y

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.y) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.x = this.cpu.setzn(REG);
				break;
			}
			case 0xb7: {
				// B7 - LAX zp,y

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.y) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				let magic = 0xff;
				this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				break;
			}
			case 0xb8: {
				// B8 - CLV

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.v = false;
				break;
			}
			case 0xb9: {
				// B9 - LDA abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(REG);
				}
				break;
			}
			case 0xba: {
				// BA - TSX

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.x = this.cpu.setzn(this.cpu.s);
				break;
			}
			case 0xbb: {
				// BB - LAS abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.x = this.cpu.s = this.cpu.setzn(this.cpu.s & REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.x = this.cpu.s = this.cpu.setzn(this.cpu.s & REG);
				}
				break;
			}
			case 0xbc: {
				// BC - LDY abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.y = this.cpu.setzn(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.y = this.cpu.setzn(REG);
				}
				break;
			}
			case 0xbd: {
				// BD - LDA abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.a = this.cpu.setzn(REG);
				}
				break;
			}
			case 0xbe: {
				// BE - LDX abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.x = this.cpu.setzn(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.x = this.cpu.setzn(REG);
				}
				break;
			}
			case 0xbf: {
				// BF - LAX abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					let magic = 0xff;
					this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					let magic = 0xff;
					this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);
				}
				break;
			}
			case 0xc0: {
				// C0 - CPY imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.setzn(this.cpu.y - REG);
				this.cpu.p.c = this.cpu.y >= REG;
				break;
			}
			case 0xc1: {
				// C1 - CMP (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				break;
			}
			case 0xc2: {
				// C2 - NOP imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				break;
			}
			case 0xc3: {
				// C3 - DCP (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(6, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xc4: {
				// C4 - CPY zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.y - REG);
				this.cpu.p.c = this.cpu.y >= REG;
				break;
			}
			case 0xc5: {
				// C5 - CMP zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				break;
			}
			case 0xc6: {
				// C6 - DEC zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				REG = this.cpu.setzn(REG - 1);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xc7: {
				// C7 - DCP zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xc8: {
				// C8 - INY

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.y = this.cpu.setzn(this.cpu.y + 1);
				break;
			}
			case 0xc9: {
				// C9 - CMP imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				break;
			}
			case 0xca: {
				// CA - DEX

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.x = this.cpu.setzn(this.cpu.x - 1);
				break;
			}
			case 0xcb: {
				// CB - SBX imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				let temp = this.cpu.a & this.cpu.x;
				this.cpu.p.c = temp >= REG;
				this.cpu.x = this.cpu.setzn(temp - REG);
				break;
			}
			case 0xcc: {
				// CC - CPY abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.y - REG);
				this.cpu.p.c = this.cpu.y >= REG;
				break;
			}
			case 0xcd: {
				// CD - CMP abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				break;
			}
			case 0xce: {
				// CE - DEC abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xcf: {
				// CF - DCP abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xd0: {
				// D0 - BNE branch

				this.cpu.branch(!this.cpu.p.z);
				break;
			}
			case 0xd1: {
				// D1 - CMP (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.setzn(this.cpu.a - REG);
					this.cpu.p.c = this.cpu.a >= REG;
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.setzn(this.cpu.a - REG);
					this.cpu.p.c = this.cpu.a >= REG;
				}
				break;
			}
			case 0xd2: {
				// D2 - undefined

				this.invalidOpcode(cpu, 0xD2);
				break;
			}
			case 0xd3: {
				// D3 - DCP (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xd4: {
				// D4 - NOP zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0xd5: {
				// D5 - CMP zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				break;
			}
			case 0xd6: {
				// D6 - DEC zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				REG = this.cpu.setzn(REG - 1);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xd7: {
				// D7 - DCP zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xd8: {
				// D8 - CLD

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.d = false;
				break;
			}
			case 0xd9: {
				// D9 - CMP abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.setzn(this.cpu.a - REG);
					this.cpu.p.c = this.cpu.a >= REG;
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.setzn(this.cpu.a - REG);
					this.cpu.p.c = this.cpu.a >= REG;
				}
				break;
			}
			case 0xda: {
				// DA - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0xdb: {
				// DB - DCP abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xdc: {
				// DC - NOP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				}
				break;
			}
			case 0xdd: {
				// DD - CMP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.setzn(this.cpu.a - REG);
					this.cpu.p.c = this.cpu.a >= REG;
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.setzn(this.cpu.a - REG);
					this.cpu.p.c = this.cpu.a >= REG;
				}
				break;
			}
			case 0xde: {
				// DE - DEC abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xdf: {
				// DF - DCP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = this.cpu.setzn(REG - 1);
				this.cpu.setzn(this.cpu.a - REG);
				this.cpu.p.c = this.cpu.a >= REG;
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xe0: {
				// E0 - CPX imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.setzn(this.cpu.x - REG);
				this.cpu.p.c = this.cpu.x >= REG;
				break;
			}
			case 0xe1: {
				// E1 - SBC (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.sbc(REG);
				break;
			}
			case 0xe2: {
				// E2 - NOP imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				break;
			}
			case 0xe3: {
				// E3 - ISB (,x)

				let REG = 0|0;
				let zpAddr = (this.cpu.getb() + this.cpu.x) & 0xff;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				this.cpu.polltimeAddr(6, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xe4: {
				// E4 - CPX zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.x - REG);
				this.cpu.p.c = this.cpu.x >= REG;
				break;
			}
			case 0xe5: {
				// E5 - SBC zp

				let REG = 0|0;
				this.cpu.polltime(2);
				this.cpu.checkInt();
				let addr = this.cpu.getb() | 0;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.sbc(REG);
				break;
			}
			case 0xe6: {
				// E6 - INC zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				REG = this.cpu.setzn(REG + 1);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xe7: {
				// E7 - ISB zp

				let REG = 0|0;
				let addr = this.cpu.getb() | 0;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(4);
				this.cpu.checkInt();
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xe8: {
				// E8 - INX

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.x = this.cpu.setzn(this.cpu.x + 1);
				break;
			}
			case 0xe9: {
				// E9 - SBC imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.sbc(REG);
				break;
			}
			case 0xea: {
				// EA - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0xeb: {
				// EB - SBC imm

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				REG = this.cpu.getb() | 0;
				this.cpu.sbc(REG);
				break;
			}
			case 0xec: {
				// EC - CPX abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.setzn(this.cpu.x - REG);
				this.cpu.p.c = this.cpu.x >= REG;
				break;
			}
			case 0xed: {
				// ED - SBC abs

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(1, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.sbc(REG);
				break;
			}
			case 0xee: {
				// EE - INC abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				REG = this.cpu.setzn(REG + 1);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xef: {
				// EF - ISB abs

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				this.cpu.polltimeAddr(4, addr);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addr, REG); // spurious
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltimeAddr(1, addr);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xf0: {
				// F0 - BEQ branch

				this.cpu.branch(this.cpu.p.z);
				break;
			}
			case 0xf1: {
				// F1 - SBC (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				this.cpu.polltime(4);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.sbc(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.sbc(REG);
				}
				break;
			}
			case 0xf2: {
				// F2 - undefined

				this.invalidOpcode(cpu, 0xF2);
				break;
			}
			case 0xf3: {
				// F3 - ISB (),y

				let REG = 0|0;
				let zpAddr = this.cpu.getb() | 0;
				let lo, hi;
				lo = this.cpu.bus.cpuRead(zpAddr);
				hi = this.cpu.bus.cpuRead((zpAddr + 1) & 0xff);
				let addr = lo | (hi << 8);
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(5, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xf4: {
				// F4 - NOP zpx

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.undefined) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				break;
			}
			case 0xf5: {
				// F5 - SBC zp,x

				let REG = 0|0;
				this.cpu.polltime(3);
				this.cpu.checkInt();
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				this.cpu.polltime(1);
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.sbc(REG);
				break;
			}
			case 0xf6: {
				// F6 - INC zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				REG = this.cpu.setzn(REG + 1);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xf7: {
				// F7 - ISB zp,x

				let REG = 0|0;
				let addr = (this.cpu.getb() + this.cpu.x) & 0xff;
				REG = this.cpu.bus.cpuRead(addr);
				this.cpu.polltime(5);
				this.cpu.checkInt();
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltime(1);
				this.cpu.bus.cpuWrite(addr, REG);
				break;
			}
			case 0xf8: {
				// F8 - SED

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				this.cpu.p.d = true;
				break;
			}
			case 0xf9: {
				// F9 - SBC abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.sbc(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.sbc(REG);
				}
				break;
			}
			case 0xfa: {
				// FA - NOP

				let REG = 0|0;
				this.cpu.polltime(1);
				this.cpu.checkInt();
				this.cpu.polltime(1);
				break;
			}
			case 0xfb: {
				// FB - ISB abs,y

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.y) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xfc: {
				// FC - NOP abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
				}
				break;
			}
			case 0xfd: {
				// FD - SBC abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltime(3);
				if(addrWithCarry !== addrNonCarry) {
					this.cpu.polltimeAddr(1, addrNonCarry);
					this.cpu.checkInt();
					this.cpu.bus.cpuRead(addrNonCarry);
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.sbc(REG);
				} else {
					this.cpu.checkInt();
					this.cpu.polltimeAddr(1, addrWithCarry);
					REG = this.cpu.bus.cpuRead(addrWithCarry);
					this.cpu.sbc(REG);
				}
				break;
			}
			case 0xfe: {
				// FE - INC abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = this.cpu.setzn(REG + 1);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}
			case 0xff: {
				// FF - ISB abs,x

				let REG = 0|0;
				let addr = this.cpu.getw() | 0;
				let addrWithCarry = (addr + this.cpu.x) & 0xffff;
				let addrNonCarry = (addr & 0xff00) | (addrWithCarry & 0xff);
				this.cpu.polltimeAddr(4, addrNonCarry);
				this.cpu.bus.cpuRead(addrNonCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				REG = this.cpu.bus.cpuRead(addrWithCarry);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.checkInt();
				this.cpu.bus.cpuWrite(addrWithCarry, REG); // spurious
				REG = (REG + 1) & 0xff;
				this.cpu.sbc(REG);
				this.cpu.polltimeAddr(1, addrWithCarry);
				this.cpu.bus.cpuWrite(addrWithCarry, REG);
				break;
			}

		}
	}
}
