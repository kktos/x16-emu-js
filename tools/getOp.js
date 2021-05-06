
function rotate(left, logical) {
	let lines = [];
	if (!left) {
		if (!logical) lines.push("let newTopBit = this.cpu.p.c ? 0x80 : 0x00;");
		lines.push("this.cpu.p.c = !!(REG & 0x01);");
		if (logical) {
			lines.push("REG >>>= 1;");
		} else {
			lines.push("REG = (REG >>> 1) | newTopBit;");
		}
	} else {
		if (!logical) lines.push("let newBotBit = this.cpu.p.c ? 0x01 : 0x00;");
		lines.push("this.cpu.p.c = !!(REG & 0x80);");
		if (logical) {
			lines.push("REG = (REG << 1) & 0xff;");
		} else {
			lines.push("REG = ((REG << 1) & 0xff) | newBotBit;");
		}
	}
	lines.push("this.cpu.setzn(REG);");
	return lines;
}

function pull(reg) {
	if (reg === 'p') {
		return [
			"let tempFlags = this.cpu.pull();",
			"this.cpu.p.c = !!(tempFlags & 0x01);",
			"this.cpu.p.z = !!(tempFlags & 0x02);",
			"this.cpu.p.i = !!(tempFlags & 0x04);",
			"this.cpu.p.d = !!(tempFlags & 0x08);",
			"this.cpu.p.v = !!(tempFlags & 0x40);",
			"this.cpu.p.n = !!(tempFlags & 0x80);"
		];
	}
	return ["this.cpu." + reg + " = this.cpu.setzn(this.cpu.pull());"];
}

function push(reg) {
	if (reg === 'p') return "this.cpu.push(this.cpu.p.asByte());";
	return "this.cpu.push(this.cpu." + reg + ");";
}

export default function getOp(op, arg) {
	switch (op) {
		case "NOP":
			return {op: "", read: arg !== undefined};
		case "BRK":
			return {op: "this.cpu.brk(false);"};
		case "CLC":
			return {op: "this.cpu.p.c = false;"};
		case "SEC":
			return {op: "this.cpu.p.c = true;"};
		case "CLD":
			return {op: "this.cpu.p.d = false;"};
		case "SED":
			return {op: "this.cpu.p.d = true;"};
		case "CLI":
			return {op: "this.cpu.p.i = false;"};
		case "SEI":
			return {op: "this.cpu.p.i = true;"};
		case "CLV":
			return {op: "this.cpu.p.v = false;"};
		case "LDA":
			return {op: ["this.cpu.a = this.cpu.setzn(REG);"], read: true};
		case "LDX":
			return {op: ["this.cpu.x = this.cpu.setzn(REG);"], read: true};
		case "LDY":
			return {op: ["this.cpu.y = this.cpu.setzn(REG);"], read: true};
		case "STA":
			return {op: "REG = this.cpu.a;", write: true};
		case "STX":
			return {op: "REG = this.cpu.x;", write: true};
		case "STY":
			return {op: "REG = this.cpu.y;", write: true};
		case "INC":
			return {
				op: ["REG = this.cpu.setzn(REG + 1);"],
				read: true, write: true
			};
		case "DEC":
			return {
				op: ["REG = this.cpu.setzn(REG - 1);"],
				read: true, write: true
			};
		case "INX":
			return {op: ["this.cpu.x = this.cpu.setzn(this.cpu.x + 1);"]};
		case "INY":
			return {op: ["this.cpu.y = this.cpu.setzn(this.cpu.y + 1);"]};
		case "DEX":
			return {op: ["this.cpu.x = this.cpu.setzn(this.cpu.x - 1);"]};
		case "DEY":
			return {op: ["this.cpu.y = this.cpu.setzn(this.cpu.y - 1);"]};
		case "ADC":
			return {op: "this.cpu.adc(REG);", read: true};
		case "SBC":
			return {op: "this.cpu.sbc(REG);", read: true};
		case "BIT":
			if (arg === "imm") {
				// According to: http://forum.6502.org/viewtopic.php?f=2&t=2241&p=27243#p27239
				// the v and n flags are unaffected by BIT #xx
				return {op: "this.cpu.p.z = !(this.cpu.a & REG);", read: true};
			}
			return {
				op: [
					"this.cpu.p.z = !(this.cpu.a & REG);",
					"this.cpu.p.v = !!(REG & 0x40);",
					"this.cpu.p.n = !!(REG & 0x80);"],
				read: true
			};
		case "ROL":
			return {op: rotate(true, false), read: true, write: true, rotate: true};
		case "ROR":
			return {op: rotate(false, false), read: true, write: true, rotate: true};
		case "ASL":
			return {op: rotate(true, true), read: true, write: true, rotate: true};
		case "LSR":
			return {op: rotate(false, true), read: true, write: true, rotate: true};
		case "EOR":
			return {op: ["this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);"], read: true};
		case "AND":
			return {op: ["this.cpu.a = this.cpu.setzn(this.cpu.a & REG);"], read: true};
		case "ORA":
			return {op: ["this.cpu.a = this.cpu.setzn(this.cpu.a | REG);"], read: true};
		case "CMP":
			return {
				op: ["this.cpu.setzn(this.cpu.a - REG);", "this.cpu.p.c = this.cpu.a >= REG;"],
				read: true
			};
		case "CPX":
			return {
				op: ["this.cpu.setzn(this.cpu.x - REG);", "this.cpu.p.c = this.cpu.x >= REG;"],
				read: true
			};
		case "CPY":
			return {
				op: ["this.cpu.setzn(this.cpu.y - REG);", "this.cpu.p.c = this.cpu.y >= REG;"],
				read: true
			};
		case "TXA":
			return {op: ["this.cpu.a = this.cpu.setzn(this.cpu.x);"]};
		case "TAX":
			return {op: ["this.cpu.x = this.cpu.setzn(this.cpu.a);"]};
		case "TXS":
			return {op: "this.cpu.s = this.cpu.x;"};
		case "TSX":
			return {op: ["this.cpu.x = this.cpu.setzn(this.cpu.s);"]};
		case "TYA":
			return {op: ["this.cpu.a = this.cpu.setzn(this.cpu.y);"]};
		case "TAY":
			return {op: ["this.cpu.y = this.cpu.setzn(this.cpu.a);"]};
		case "BEQ":
			return {op: "this.cpu.branch(this.cpu.p.z);"};
		case "BNE":
			return {op: "this.cpu.branch(!this.cpu.p.z);"};
		case "BCS":
			return {op: "this.cpu.branch(this.cpu.p.c);"};
		case "BCC":
			return {op: "this.cpu.branch(!this.cpu.p.c);"};
		case "BMI":
			return {op: "this.cpu.branch(this.cpu.p.n);"};
		case "BPL":
			return {op: "this.cpu.branch(!this.cpu.p.n);"};
		case "BVS":
			return {op: "this.cpu.branch(this.cpu.p.v);"};
		case "BVC":
			return {op: "this.cpu.branch(!this.cpu.p.v);"};
		case "PLA":
			return {op: pull('a'), extra: 3};
		case "PLP":
			return {op: pull('p'), extra: 3};
		case "PLX":
			return {op: pull('x'), extra: 3};
		case "PLY":
			return {op: pull('y'), extra: 3};
		case "PHA":
			return {op: push('a'), extra: 2};
		case "PHP":
			return {op: push('p'), extra: 2};
		case "PHX":
			return {op: push('x'), extra: 2};
		case "PHY":
			return {op: push('y'), extra: 2};
		case "RTS":
			return {
				op: [
					"let temp = this.cpu.pull();",
					"temp |= this.cpu.pull() << 8;",
					"this.cpu.pc = (temp + 1) & 0xffff;"], extra: 5
			};
		case "RTI":
			return {
				preop: [
					"let temp = this.cpu.pull();",
					"this.cpu.p.c = !!(temp & 0x01);",
					"this.cpu.p.z = !!(temp & 0x02);",
					"this.cpu.p.i = !!(temp & 0x04);",
					"this.cpu.p.d = !!(temp & 0x08);",
					"this.cpu.p.v = !!(temp & 0x40);",
					"this.cpu.p.n = !!(temp & 0x80);",
					"temp = this.cpu.pull();",
					"this.cpu.pc = temp | (this.cpu.pull() << 8);"], extra: 5
			};
		case "JSR":
			return {
				op: [
					"let pushAddr = this.cpu.pc - 1;",
					"this.cpu.push(pushAddr >>> 8);",
					"this.cpu.push(pushAddr & 0xff);",
					"this.cpu.pc = addr;"], extra: 3
			};
		case "JMP":
			return {op: "this.cpu.pc = addr;"};

		// 65c12 opcodes
		case "TSB":
			return {
				op: [
					"this.cpu.p.z = !(REG & this.cpu.a);",
					"REG |= this.cpu.a;"
				], read: true, write: true
			};
		case "TRB":
			return {
				op: [
					"this.cpu.p.z = !(REG & this.cpu.a);",
					"REG &= ~this.cpu.a;"
				], read: true, write: true
			};
		case "BRA":
			return {op: "this.cpu.branch(true);"};
		case "STZ":
			return {op: "REG = 0;", write: true};

		// Undocumented opcodes.
		// first 3 used by Zalaga, http://stardot.org.uk/forums/viewtopic.php?f=2&t=3584&p=30514

		case "SAX": // stores (A AND X)
			return {op: "REG = this.cpu.a & this.cpu.x;", write: true};
		case "ASR": // aka ALR equivalent to AND #&AA:LSR A
			return {
				op: ["REG &= this.cpu.a;"].concat(
					rotate(false, true)).concat(["this.cpu.a = REG;"])
			};
		case "SLO": // equivalent to ASL zp:ORA zp
			return {
				op: rotate(true, true).concat([
					"this.cpu.a |= REG;",
					"this.cpu.setzn(this.cpu.a);"
				]), read: true, write: true
			};
		case "SHX":
			return {op: "REG = (this.cpu.x & ((addr >>> 8)+1)) & 0xff;", write: true};
		case "SHY":
			return {op: "REG = (this.cpu.y & ((addr >>> 8)+1)) & 0xff;", write: true};
		case "LAX": // NB uses the c64 value for the magic in the OR here. I don't know what would happen on a beeb.
			return {
				op: [
					"let magic = 0xff;",
					"this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);"
				], read: true
			};
		case "LXA": // NB uses the c64 value for the magic in the OR here. I don't know what would happen on a beeb.
			return {
				op: [
					"let magic = 0xee;",
					"this.cpu.a = this.cpu.x = this.cpu.setzn((this.cpu.a|magic) & REG);"
				], read: true
			};
		case "SRE":
			return {
				op: rotate(false, true).concat(["this.cpu.a = this.cpu.setzn(this.cpu.a ^ REG);"]),
				read: true, write: true
			};
		case "RLA":
			return {
				op: rotate(true, false).concat(["this.cpu.a = this.cpu.setzn(this.cpu.a & REG);"]),
				read: true, write: true
			};
		case "ANC":
			return {op: ["this.cpu.a = this.cpu.setzn(this.cpu.a & REG); this.cpu.p.c = this.cpu.p.n;"], read: true};
		case "ANE":
			return {op: ["this.cpu.a = this.cpu.setzn((this.cpu.a | 0xee) & REG & this.cpu.x);"], read: true};
		case "ARR":
			return {op: "this.cpu.arr(REG);", read: true};
		case "DCP":
			return {
				op: [
					"REG = this.cpu.setzn(REG - 1);",
					"this.cpu.setzn(this.cpu.a - REG);",
					"this.cpu.p.c = this.cpu.a >= REG;"
				],
				read: true, write: true
			};
		case "LAS":
			return {op: ["this.cpu.a = this.cpu.x = this.cpu.s = this.cpu.setzn(this.cpu.s & REG);"], read: true};
		case "RRA":
			return {op: rotate(false, false).concat(["this.cpu.adc(REG);"]), read: true, write: true};
		case "SBX":
			return {
				op: [
					"let temp = this.cpu.a & this.cpu.x;",
					"this.cpu.p.c = temp >= REG;",
					"this.cpu.x = this.cpu.setzn(temp - REG);"
				],
				read: true
			};
		case "SHA":
			return {
				op: [
					"REG = this.cpu.a & this.cpu.x & ((addr >>> 8) + 1) & 0xff;"
				],
				write: true
			};
		case "SHS":
			return {
				op: [
					"this.cpu.s = this.cpu.a & this.cpu.x;",
					"REG = this.cpu.a & this.cpu.x & ((addr >>> 8) + 1) & 0xff;"
				],
				write: true
			};
		case "ISB":
			return {
				op: [
					"REG = (REG + 1) & 0xff;",
					"this.cpu.sbc(REG);"
				],
				read: true, write: true
			};
	}
	return null;
}
