// 6502 emulator... and more...

function hexValue(value, bytes) {
    var str = '';
    while(bytes-->0) {
        str += (value >> (bytes*8+4) & 0x0F).toString(16)+
               (value >> (bytes*8) & 0x0F).toString(16);
    }
    return str;
}

function defInstruction(opcode, def) {
	this.opcode = opcode;
	this.def = def;
	this.ticks  = [];

	this.tick = function(expression) {
		this.ticks.push(expression);
	}

	this.append = function(expression) {
		this.ticks[this.ticks.length-1] += expression;
	}

	this.isRead = function() {
		return this.def[2][0] == "R";
	}

	this.addressMode = function() {
		return this.def[1];
	}

	this.instruction = function() {
		return this.def[0];
	}

	this.writeInstructions = function(instructionArray) {
		for(var idx=0; idx<this.ticks.length; idx++) {
			instructionArray.push( new Function(this.ticks[idx]) );
		}
	}

    this.readByte = function(address, memory) {
    	let value = memory.read(address);
    	return hexValue(value, 1);
    }

    this.readWord = function(address, memory) {
    	let value = memory.read(address)+(memory.read(address+1) << 8);
    	return hexValue(value, 2);
    }

	this.toString = function(address, memory, labelMap) {
		let str = (this.def[0]+"      ").substring(0,6);
		if( labelMap && this.isBranch() ) {
			return str + this.decodeBranch(address, memory, labelMap);
		}
		switch( this.def[1] ) {
			case "imp" : return str;
			case "imm" : return str+'#$' + (memory ? this.readByte(address+1, memory) : 'BB' );
			case "zpg" : return str+'$' + (memory ? this.readByte(address+1, memory) : 'LL' );
			case "zpx" : return str+'$' + (memory ? this.readByte(address+1, memory) : 'LL' )+',X';
			case "zpy" : return str+'$' + (memory ? this.readByte(address+1, memory) : 'LL' )+',Y';
			case "abs" : return str+'$' + (memory ? this.readWord(address+1, memory) : 'LLHH' );
			case "abx" : return str+'$' + (memory ? this.readWord(address+1, memory) : 'LLHH' )+',X';
			case "aby" : return str+'$' + (memory ? this.readWord(address+1, memory) : 'LLHH' )+',Y';
			case "idx" : return str+'($'+ (memory ? this.readByte(address+1, memory) : 'LL' )+',X)';
			case "idy" : return str+'($'+ (memory ? this.readByte(address+1, memory) : 'LL' )+'),Y';
			case "jmp" : return str+'$' + (memory ? this.readWord(address+1, memory) : 'LLHH' );
			case "jmi" : return str+'($'+ (memory ? this.readWord(address+1, memory) : 'LL' )+')';
			case "jsr" : return str+'$' + (memory ? this.readWord(address+1, memory) : 'LLHH' );
 		}
 		return str;
	}

	this.isBranch = function() {
		return "JMP JSR BRA BCC BCS BNE BEQ BPL BMI BVC BVS".indexOf(this.def[0]) >= 0;
	}

	this.decodeBranch = function(address, memory, labelMap) {
	    let dest = 0;
	    if( this.def[1] == "imm" ) {
	    	// Relative branch..
	    	dest = address + 2 + (memory.read(address+1) << 24 >> 24);
	    }
	    else {
	    	// Jumps
	    	dest = memory.read(address+1) + (memory.read(address+2) << 8);
	    }

	    if( !labelMap.has(dest) ) {
	    	labelMap.set(dest, 'label_'+labelMap.size);
	    }

	    return labelMap.get(dest);
	}

	this.length = function() {
		switch( this.def[1] ) {
			case "imp" : return 1;
			case "imm" :
			case "zpg" :
			case "zpx" :
			case "zpy" : return 2;
			case "abs" :
			case "abx" :
			case "aby" : return 3;
			case "idx" :
			case "idy" : return 2;
			case "jmp" :
			case "jmi" :
			case "jsr" : return 3;
			default:
				throw new Error(`Unknown address mode ${this.def[1]}`);
		}
	}
}

export function m6502() {
	this.CF = 1<<0; // Carry
	this.ZF = 1<<1; // Zero
	this.IF = 1<<2; // IRQ disable
	this.DF = 1<<3; // Decimal mode
	this.BF = 1<<4; // Break
	this.UF = 1<<5; // Unused
	this.VF = 1<<6; // Overflow
	this.NF = 1<<7; // Negative

	this.RESET_FLAG = 1;
	this.IRQ_FLAG   = 2;
	this.NMI_FLAG   = 4;

	this.bcd_enabled = false;

	this.init = function(memory, mode) {
		this.memory = memory;
		this.mode = mode;

		this.ad = 0;  // Internal address pointer ADL/ADH

		// External state (pins, i/o)
		this.sync = 0;
		this.clock = 0;
		this.addressOut = 0; // Address pins
		this.dataIO = 0;
		this.read = 1;

		this.ready = 1;

		this.nmi = 1;
		this.irq = 1;

		if( mode == '65c02' ) {
			this.configure65c02();
		}
		this.buildInstructions();
		this.reset();
	}

	this.reset = function() {
		this.ir = 0; // 0 is brk instruction, which resets.
		this.breakFlags = this.RESET_FLAG;
		this.currentInstruction = this.definitions[0];
		this.instructionAddress = 0;

		// Internal state
		this.pc= this.memory.read(0xfffc) | (this.memory.read(0xfffd) << 8);
		this.a = 0;
		this.x = 0;
		this.y = 0;
		this.s = 0;
		this.flags |= this.UF;

		this.sync = 0;
		this.clock = 0;
	}

	this.tick = function() {
		this.clock++;

		if( (this.sync | this.breakFlags | (this.irq ^ 0x01) | (this.ready ^ 0x01)) != 0 ) {
			if( this.irq == 0 ) {
				this.irq_seq |= 1;
			}

			if( this.read != 0 && this.ready == 0 ) {
				// Read cycle with ready held low..
				this.irq_seq <<= 1;
				return;
			}

			if( this.sync != 0 ) {
				this.instructionAddress = this.pc;
				this.currentInstruction = this.definitions[this.dataIO];
				this.ir = this.currentInstruction.ir;
				this.sync = 0;
				this.clock = 0;

				if( this.irq_seq & 0x04 != 0 ) {
					// IRQ must have been held low for full cycle
					this.breakFlags |= this.IRQ_FLAG;
				}

				if( this.nmi_seq & 0xFFFC != 0 ) {
					this.breakFlags |= this.NMI_FLAG;
				}

				// ?? Test reset pin and set break flag if so..

				this.irq_seq &= 0x03;
				this.nmi_seq &= 0x03;

				if( this.breakFlags != 0 ) {
					this.ir = 0.
					this.flags &= ~this.BF;
					if( this.waiting ) {
						this.pc++;
						this.waiting = false;
					}
					// ??? Clear reset pin
				}
				else {
					this.pc++;
				}
			}
		}
		this.read = 1; // Default to reading

		this.instructions[this.ir++].call(this);
		this.irq_seq <<= 1;
		this.nmi_seq <<= 1;

		if( this.read == 0 ) {
			this.memory.write(this.addressOut, this.dataIO);
		}
		else {
			this.dataIO = this.memory.read(this.addressOut) & 0x0FF;
		}
	}

	this.getCurrentInstruction = function() {
		if( this.sync != 0 ) {
			this.instructionAddress = this.pc;
			this.currentInstruction = this.definitions[this.dataIO];
		}
		return this.currentInstruction;
	}

	this.address = function(value) {
		this.addressOut = value & 0x0FFFF;
	}

	this.data = function(value) {
		this.dataIO = value & 0x0FF;
	}

	this.setNmi = function(value) {
		if( (value & 1) != this.nmi && this.nmi == 1 ) {
			// Set on falling edge
			this.nmi_seq |= 1;
		}
		this.nmi = value & 0x01;
	}

	this.setIrq = function(value) {
		this.irq = value & 0x01;
	}

	this.checkNZ = function(value) {
		this.flags = (this.flags & ~(this.NF|this.ZF)) | (((value & 0x0FF) == 0) ? this.ZF : (value & this.NF));
		return this.flags;
	}

	this.write = function() {
		this.read = 0;
	}

	this.fetch = function() {
		this.sync = 1;
		this.addressOut = this.pc;
	}

	this.adc = function(value) {
		if( this.bcd_enabled && ((this.flags & this.DF) != 0)) {
			let carry = this.flags & this.CF; // Carry is conveniently in bit 0..
			this.flags &= ~(this.NF | this.VF | this.ZF | this.CF);

			let units = (this.a & 0x0F) + (value & 0x0F) + carry;
			if( units > 9) {
				units += 6;
			}

			let tens = (this.a >> 4) + (value >> 4) + (units > 0x0F ? 1: 0);
			if(this.a + value + carry == 0) {
				this.flags |= this.ZF;
			}
			else if ((tens & 0x08) != 0) {
				this.flags |= this.NF;
			}
			if((~(this.a ^ value) & (this.a ^ (tens<<4)) & 0x80) != 0) {
				this.flags |= this.VF;
			}
			if(tens > 9) {
				tens += 6;
			}
			if(tens > 15) {
				this.flags |= this.CF;
			}
			this.a = ((tens << 4) | (units & 0x0F)) & 0x0FF;
		}
		else {
			let sum = this.a + value + (this.flags & this.CF);
			this.flags &= ~(this.VF|this.CF);
			this.checkNZ(sum);
			if((~(this.a ^ value) & (this.a^sum) & 0x80) != 0) {
				this.flags |= this.VF;
			}
			if((sum & 0xFF00) != 0) {
				this.flags |= this.CF;
			}
			this.a = sum & 0x0FF;
		}
	}

	this.sbc = function(value) {
		if( (this.bcd_enabled && (this.flags & this.DF) != 0)) {
			let carry = this.flags & this.CF ^ 0x01; // Carry is conveniently in bit 0..
			this.flags &= ~(this.NF | this.VF | this.ZF | this.CF);
			let diff = this.a - value - carry;
			let units = (this.a & 0x0F) - (value & 0x0F) -carry;
			if(units < 0) {
				units -= 6;
			}
			let tens = (this.a >> 4) - (value>>4) - (units < 0 ? 1: 0);
			if(diff==0) {
				this.flags |= this.ZF;
			}
			else if( (diff & 0x80) != 0) {
				this.flags |= this.NF;
			}
			if(((this.a ^ value) & (this.a^diff) & 0x080) != 0) {
				this.flags |= this.CF;
			}
			if( tens & 0x080 != 0 ){
				tens -= 6;
			}
			this.a = ((tens << 4) | (units & 0x0f)) & 0x0FF;
		}
		else {
			let diff = this.a - value - (this.flags & this.CF ^ 0x01);
			this.flags &= ~(this.VF|this.CF);
			this.checkNZ(diff & 0x0FF);
			if(((this.a ^ value) & (this.a^diff) & 0x80) != 0) {
				this.flags |= this.VF;
			}
			if((diff & 0xFF00) == 0) {
				this.flags |= this.CF;
			}
			this.a = diff & 0x0FF;
		}
	}


	this.buildInstructions = function() {
		this.definitions = [];
		this.instructions = [];

		for(let aaa=0; aaa<=7; aaa++) {
			for(let bbb=0; bbb<=7; bbb++) {
				for(let cc=0; cc<=3; cc++) {
					let def = this.instr[cc][bbb][aaa];

					let opcode = (aaa << 5) | (bbb << 2) | cc;
					let defn = new defInstruction(opcode, def);
					this.definitions.push(defn);
					this.encodeAddressMode(defn);
					this.encodeInstruction(defn);
					if( defn.addressMode() == "Rw" || defn.addressMode() == "rw" ) {
						defn.append("this.fetch();");
					}
					else {
						defn.tick("this.fetch();");
					}
					defn.ir = this.instructions.length;
					defn.writeInstructions(this.instructions);
				}
			}
		}
	}

	this.encodeAddressMode = function(defn) {
		switch( defn.addressMode() ) {
			case "imp" :
				defn.tick( "this.address(this.pc);");
				break;
			case "imm" :
				defn.tick( "this.address(this.pc++);");
				break;
			case "zpg" :
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.address(this.dataIO);");
				break;
			case "zpx" :
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad = this.dataIO; this.address(this.ad);");
				defn.tick( "this.address((this.ad + this.x) & 0x00FF);" );
				break;
			case "zpy" :
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad = this.dataIO; this.address(this.ad);");
				defn.tick( "this.address((this.ad + this.y) & 0x00FF);" );
				break;
			case "abs" :
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad=this.dataIO; this.address(this.pc++);");
				defn.tick( "this.address(this.dataIO << 8 | this.ad);");
				break;
			case "abx" :  // Absolute + X
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad=this.dataIO; this.address(this.pc++);");
				defn.tick( "this.ad |= this.dataIO<<8; this.address( (this.ad & 0xFF00) | ((this.ad + this.x) & 0x0FF));" );
				if( defn.isRead() ) {
					// Skip next if this is a read instruction and page boundary is not crossed
					defn.append( "this.ir+=( ~(((this.ad + this.x)>>8)^(this.ad>>8)) ) & 0x01;");
				}
				defn.tick( "this.address(this.ad + this.x);");
				break;
			case "aby" :  // Absolute + Y
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad=this.dataIO; this.address(this.pc++);");
				defn.tick( "this.ad |= this.dataIO<<8; this.address( (this.ad & 0xFF00) | ((this.ad + this.y) & 0x0FF));" );
				if( defn.isRead() ) {
					// Skip next if this is a read instruction and page boundary is not crossed
					defn.append( "this.ir+=( ~(((this.ad + this.y)>>8)^(this.ad>>8)) ) & 0x01;");
				}
				defn.tick( "this.address(this.ad + this.y);");
				break;
			case "idx" : // Indirect (Zero page + X)
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad = this.dataIO; this.address(this.ad);");
				defn.tick( "this.ad = (this.ad + this.x) & 0x0FF; this.address(this.ad);");
				defn.tick( "this.address( (this.ad+1) & 0x0FF ); this.ad = this.dataIO;");
				defn.tick( "this.address( this.dataIO<<8 | this.ad);");
				break;
			case "idy" : // Indirect (Zero page) + Y
				defn.tick( "this.address(this.pc++);");
				defn.tick( "this.ad = this.dataIO; this.address(this.ad);");
				defn.tick( "this.address( (this.ad+1) & 0x0FF ); this.ad = this.dataIO;");
				defn.tick( "this.ad |= this.dataIO<<8; this.address( (this.ad & 0xFF00) | ((this.ad + this.y) & 0x0FF));" );
				if( defn.isRead() ) {
					// Skip next if this is a read instruction and page boundary is not crossed
					defn.append("this.ir+=( ~(((this.ad + this.y)>>8)^(this.ad>>8)) ) & 0x01;");
				}
				defn.tick("this.address(this.ad+this.y);");
				break;
			case "jmp" :
			case "jmi" :
			case "jsr" :
				// Handled in instruction
				break;
			default:
				// Everything else ignored
				break;
 		}
	}


	this.encodeInstruction = function(defn) {
		switch( defn.instruction() ) {
			case "BRK" :
				defn.tick("if((this.breakFlags & (this.IRQ_FLAG|this.NMI_FLAG)) == 0) {this.pc++;}; this.address(0x0100|this.s--); this.s &= 0x0FF; this.data(this.pc>>8);"+
					      "if((this.breakFlags & this.RESET_FLAG) == 0) { this.write(); }; ");
				defn.tick("this.address(0x0100 | this.s--); this.s &= 0x0FF; this.data(this.pc);"+
					      "if((this.breakFlags & this.RESET_FLAG) == 0) { this.write(); }; ");
				defn.tick("this.address(0x0100 | this.s--); this.s &= 0x0FF; this.data(this.flags | this.UF);"+
						  "if((this.breakFlags & this.RESET_FLAG) != 0) {this.ad = 0xFFFC} else {this.write(); if((this.breakFlags & this.NMI_FLAG) != 0) {this.ad = 0xFFFA;} else {this.ad = 0xFFFE;}};");
				if( this.mode == '65c02' ) {
					// 65c02 clears the D flag
					defn.tick("this.address(this.ad++); this.ad &= 0xFFFF; this.flags = (this.flags & ~this.DF ) | this.IF | this.BF; this.breakFlags = 0;");
				}
				else {
					defn.tick("this.address(this.ad++); this.ad &= 0xFFFF; this.flags |= this.IF | this.BF; this.breakFlags = 0;");
				}
				defn.tick("this.address(this.ad); this.ad = this.dataIO;");
				defn.tick("this.pc = this.dataIO << 8 | this.ad;");
				break;
			case "NOP" :
				defn.tick( "" );
				break;
			case "UNP" : // Undocumented NOP
				defn.tick("");
				break;
			case "LDA" :
				defn.tick("this.a=this.dataIO; this.checkNZ(this.a);");
				break;
			case "LDX" :
				defn.tick("this.x=this.dataIO; this.checkNZ(this.x);");
				break;
			case "LDY" :
				defn.tick("this.y=this.dataIO; this.checkNZ(this.y);");
				break;
			case "LAX" : // Undocumented, load immediate A and X
				defn.tick("this.a=this.x=this.dataIO; this.checkNZ(this.a);");
				break;
			case "LXA" : // Undocumented, and immediate with A | 0xEE and set X and A
				defn.tick("this.a=this.x=(this.a|0x0EE)&this.dataIO; this.checkNZ(this.a);");
				break;
			case "STA" :
				defn.tick("this.data(this.a); this.write();");
				break;
			case "STX" :
				defn.tick("this.data(this.x); this.write();");
				break;
			case "STY" :
				defn.tick("this.data(this.y); this.write();");
				break;
			case "SAX" : // Undocumented, store A & X
				defn.tick("this.data(this.a & this.x); this.write();");
				break;
			case "TAX" :
				defn.tick("this.x = this.a; this.checkNZ(this.a);");
				break;
			case "TAY" :
				defn.tick("this.y = this.a; this.checkNZ(this.a);");
				break;
			case "TXA" :
				defn.tick("this.a = this.x; this.checkNZ(this.a);");
				break;
			case "TYA" :
				defn.tick("this.a = this.y; this.checkNZ(this.a);");
				break;
			case "TXS" :
				defn.tick("this.s = this.x;");
				break;
			case "TSX" :
				defn.tick("this.x = this.s; this.checkNZ(this.x);");
				break;
			case "ORA" :
				defn.tick("this.a |= this.dataIO; this.checkNZ(this.a);");
				break;
			case "AND" :
				defn.tick("this.a &= this.dataIO; this.checkNZ(this.a);");
				break;
			case "EOR" :
				defn.tick("this.a ^= this.dataIO; this.checkNZ(this.a);");
				break;
			case "CMP" :
				defn.tick("let t = this.a - this.dataIO; this.flags = (this.checkNZ(t) & ~this.CF) | ((t & 0xFF00 != 0) ? 0 : this.CF);");
				break;
			case "CPX" :
				defn.tick("let t = this.x - this.dataIO; this.flags = (this.checkNZ(t) & ~this.CF) | ((t & 0xFF00 != 0) ? 0 : this.CF);");
				break;
			case "CPY" :
				defn.tick("let t = this.y - this.dataIO; this.flags = (this.checkNZ(t) & ~this.CF) | ((t & 0xFF00 != 0) ? 0 : this.CF);");
				break;
			case "DCP" : // Undocumented decrement and compare..
				defn.tick("this.ad = this.dataIO; this.write();"); // Read data, spurious write
				defn.tick("this.ad--; this.ad &= 0x0FFFF; this.checkNZ(this.ad); this.data(this.ad);"+ // Decrement and write back..
					      "let t = this.a - this.ad; this.flags = (this.checkNZ(t) & ~this.CF) | ((t & 0xFF00 != 0) ? 0 : this.CF); this.write();")
				break;
			case "INC" :
				defn.tick("this.ad = this.dataIO; this.write();");
				defn.tick("this.ad++; this.ad &= 0x0FFFF; this.checkNZ(this.ad); this.data(this.ad); this.write();");
				break;
			case "DEC" :
				defn.tick("this.ad = this.dataIO; this.write();");
				defn.tick("this.ad--; this.ad &= 0x0FFFF; this.checkNZ(this.ad); this.data(this.ad); this.write();");
				break;
			case "INX" :
				defn.tick("this.x++; this.x &= 0x0FF; this.checkNZ(this.x);");
				break;
			case "DEX" :
				defn.tick("this.x--; this.x &= 0x0FF; this.checkNZ(this.x);");
				break;
			case "INY" :
				defn.tick("this.y++; this.y &= 0x0FF; this.checkNZ(this.y);");
				break;
			case "DEY" :
				defn.tick("this.y--; this.y &= 0x0FF; this.checkNZ(this.y);");
				break;
			case "BIT" :
				defn.tick("let t=this.a & this.dataIO; this.flags = (this.flags & ~(this.NF|this.VF|this.CF)) | (this.dataIO & (this.NF|this.VF)) | (t == 0?0:this.ZF);");
				break;
			case "ASL" :
				if( defn.addressMode() == "imp" ) {
					// A
					defn.tick("let t = this.a << 1 & 0x0FF; this.flags = (this.checkNZ(t) & ~this.CF) | ((this.a & 0x080 != 0) ? this.CF: 0); this.a = t;");
				}
				else {
					defn.tick("this.ad = this.dataIO; this.write();"); // spurious write
					defn.tick("let t = this.ad << 1 & 0x0FF; this.flags = (this.checkNZ(t) & ~this.CF) | ((this.ad & 0x080 != 0) ? this.CF: 0); this.data(t); this.write();");

				}
				break;
			case "LSR" :
				if( defn.addressMode() == "imp" ) {
					// A
					defn.tick("let t = this.a >> 1 & 0x0FF; this.flags = (this.checkNZ(t) & ~this.CF) | ((this.a & 0x01 != 0) ? this.CF: 0); this.a = t;");
				}
				else {
					defn.tick("this.ad = this.dataIO; this.write();"); // spurious write
					defn.tick("let t = this.ad >> 1 & 0x0FF; this.flags = (this.checkNZ(t) & ~this.CF) | ((this.ad & 0x01 != 0) ? this.CF: 0); this.data(t); this.write();");
				}
				break;
			case "ROL" :
				if( defn.addressMode() == "imp" ) {
					// A
					defn.tick("let t = (this.a << 1 & 0x0FF) | (this.flags & this.CF); this.flags = (this.checkNZ(t) & ~this.CF) | ((this.a & 0x080 != 0) ? this.CF: 0); this.a = t;");
				}
				else {
					defn.tick("this.ad = this.dataIO; this.write();"); // spurious write
					defn.tick("let t = (this.ad << 1 & 0x0FF) | (this.flags & this.CF); this.flags = (this.checkNZ(t) & ~this.CF) | ((this.ad & 0x080 != 0) ? this.CF: 0); this.data(t); this.write();");

				}
				break;
			case "ROR" :
				if( defn.addressMode() == "imp" ) {
					// A
					defn.tick("let t = (this.a >> 1 & 0x07F) | ((this.flags & this.CF) << 7); this.flags = (this.checkNZ(t) & ~this.CF) | ((this.a & 0x01 != 0) ? this.CF: 0); this.a = t;");
				}
				else {
					defn.tick("this.ad = this.dataIO; this.write();"); // spurious write
					defn.tick("let t = (this.ad >> 1 & 0x07F) | ((this.flags & this.CF) << 7); this.flags = (this.checkNZ(t) & ~this.CF) | ((this.ad & 0x01 != 0) ? this.CF: 0); this.data(t); this.write();");

				}
				break;
			case "PHP" : // Push flags
				defn.tick("this.address(0x0100 | this.s--); this.s &= 0x0FF; this.data(this.flags | this.UF); this.write();");
				break;
			case "PLP" :
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF;");
				defn.tick("this.address(0x0100 | this.s);");
				defn.tick("this.flags = (this.dataIO | this.BF) & ~this.UF;");
				break;
			case "PHA" :
				defn.tick("this.address(0x0100 | this.s--); this.s &= 0x0FF; this.data(this.a); this.write();");
				break;
			case "PLA" :
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF;");
				defn.tick("this.address(0x0100 | this.s);");
				defn.tick("this.a = this.dataIO; this.checkNZ( this.a );");
				break;
			case "CLC":
			case "CLI":
			case "CLV":
			case "CLD":
				defn.tick(`this.flags &= ~this.${defn.instruction()[2]}F;`)
				break;
			case "SEC":
			case "SEI":
			case "SED":
				defn.tick(`this.flags |= this.${defn.instruction()[2]}F;`)
				break;
			case "ADC" :
				defn.tick("this.adc(this.dataIO);");
				break;
			case "SBC" : // Includes undocumented copy
				defn.tick("this.sbc(this.dataIO);");
				break;
			case "SBX" : // Undocumented madness..
			case "ISB" : // Undcoumented inc and sbc
			case "SLO" : // Undcoumented ASL + OR
			case "SRE" : // Undcoumented LSR + EOR
			case "RLA" : // Undocumented ROL + AND
			case "RRA" : // Undocumented ROR + ADC
			case "ARR" : // Undocumented AND + ROR
			case "ANE" : // Undocumented ANE
			case "SHA" : // Undocumented madness..
			case "SHX" : // Seriously?
			case "SHY" : // There's more undocumented than documented..
			case "SHS" : // Wahhh
			case "ANC" : // I give in..
			case "LAS" : // It doesn't stop
			case "JAM" : // BANG...
				break;
			case "BCC":
			case "BCS":
			case "BNE":
			case "BEQ":
			case "BPL":
			case "BMI":
			case "BVC":
			case "BVS":
				let branch = this.branchFlag(defn.instruction());
				// If not taken, fetch next instruction
				defn.tick("this.address(this.pc); this.ad = this.pc+(this.dataIO << 24 >> 24);"+
					      `if( (this.flags & this.${branch.flag}) != ${branch.value}) { this.fetch(); };`);
				// Otherwise account for page cross, correct interrupt timings
				defn.tick("this.address((this.pc & 0x0FF00) | (this.ad & 0x00FF)); if((this.ad & 0xFF00)==(this.pc&0xFF00))"+
					      "{ this.pc=this.ad; this.irq_seq>>=1; this.nmi_seq>>=1; this.fetch();};");
				defn.tick("this.pc=this.ad;");
				break;
			case "STP":
				defn.tick("this.stopped = true; this.pc--;");
				break;
			case "WAI":
				// The wai instruction 'completes' so we get sync pulses. This is a cheat for calling loops that need to synchronise with instructions.
				defn.tick("if( this.waiting && ( (this.irq == 0) || (this.nmi_seq != 0) ) ) { this.fetch(); }"); // Three tick setup...
				defn.tick("if( this.waiting && ( (this.irq == 0) || (this.nmi_seq != 0) ) ) { this.fetch(); }");
				defn.tick("if( this.waiting && ( (this.irq == 0) || (this.nmi_seq != 0) ) ) { this.fetch(); }");
				defn.tick("this.waiting = true; if( (this.irq !=0) && (this.nmi_seq == 0) ) { this.pc--; }");
				break;
			case "BRA":
				// 65c02 additional instruction
				defn.tick("this.address(this.pc); this.ad = this.pc+(this.dataIO << 24 >> 24);");
				// Account for page cross, correct interrupt timings
				defn.tick("this.address((this.pc & 0x0FF00) | (this.ad & 0x00FF)); if((this.ad & 0xFF00)==(this.pc&0xFF00))"+
					      "{ this.pc=this.ad; this.irq_seq>>=1; this.nmi_seq>>=1; this.fetch();};");
				defn.tick("this.pc=this.ad;");
			case "JMP":
				if( defn.addressMode() == "jmp" ) {
					// Absolute jump
					defn.tick("this.address(this.pc++);")
					defn.tick("this.address(this.pc++); this.ad = this.dataIO;");
					defn.tick("this.pc = (this.dataIO << 8) | this.ad;");
				}
				else if( defn.addressMode() == "abx" ) {
					// 65c02 indirect jump with X
					defn.tick("this.address(this.pc++);")
					defn.tick("this.address(this.pc++); this.ad = this.dataIO;");
					defn.tick("this.ad |= this.dataIO<<8;");
					defn.tick("this.ad = (this.ad + this.x ) & 0x0FFFF; this.address(this.ad);");
					defn.tick("this.address(this.ad); this.ad = this.dataIO;");
					defn.tick("this.pc = (this.dataIO << 8) | this.ad;");
				}
				else {
					// Indirect jump
					defn.tick("this.address(this.pc++);")
					defn.tick("this.address(this.pc++); this.ad = this.dataIO;");
					defn.tick("this.ad |= this.dataIO<<8; this.address(this.ad);");
					if( this.mode == '65c02' ) {
						defn.tick("this.address((this.ad + 1) & 0x0FFFF); this.ad = this.dataIO;");
						defn.tick(""); // Extra tick to fix page cross bug
					}
					else {
						defn.tick("this.address((this.ad & 0xFF00) | ((this.ad+1) & 0x00FF)); this.ad = this.dataIO;");
					}
					defn.tick("this.pc = (this.dataIO << 8) | this.ad;");
				}
				break;
			case "JSR":
				defn.tick("this.address(this.pc++);");
				defn.tick("this.address( 0x0100 | this.s ); this.ad = this.dataIO;") // Stack pointer on bus, store jump low byte, junk read
				defn.tick("this.address( 0x0100 | this.s-- ); this.s &= 0x0FF; this.data(this.pc >> 8); this.write();"); // Stack pointer correct, write PC high
				defn.tick("this.address( 0x0100 | this.s-- ); this.s &= 0x0FF; this.data(this.pc); this.write();"); // Write PC low
				defn.tick("this.address( this.pc ); "); // Read jump high byte
				defn.tick("this.pc = this.dataIO << 8 | this.ad;"); // And jump
				break;
			case "RTS":
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF;"); // Junk read
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF;"); // Read return low byte
				defn.tick("this.address(0x0100 | this.s); this.ad = this.dataIO;"); // Read return high
				defn.tick("this.pc = (this.dataIO << 8) | this.ad; this.address(this.pc++);");
				defn.tick(""); // Fetch
				break;
			case "RTI":
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF;"); // Junk read
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF;"); // Read status flag
				defn.tick("this.address(0x0100 | this.s++); this.s &= 0x0FF; this.flags = (this.dataIO | this.BF) & ~this.UF;"); // Read return low
				defn.tick("this.address(0x0100 | this.s); this.ad = this.dataIO;")
				defn.tick("this.pc = (this.dataIO << 8) | this.ad;");
				break;


		}
	}

	this.branchFlag = function(instruction) {
		switch( instruction ) {
			case "BCC" : return { flag: "CF", value: 0 };
			case "BCS" : return { flag: "CF", value: this.CF };
			case "BNE" : return { flag: "ZF", value: 0 };
			case "BEQ" : return { flag: "ZF", value: this.ZF };
			case "BPL" : return { flag: "NF", value: 0 };
			case "BMI" : return { flag: "NF", value: this.NF };
			case "BVC" : return { flag: "VF", value: 0 };
			case "BVS" : return { flag: "VF", value: this.VF };
			default:
				throw new Error("Unkown branch type :"+instruction);
		}
	}

	this.instr65c02 = {
		'7C' : ["JMP", "abx", "Rw"],
		'80' : ["BRA", "imm", "Rw"],
		'CB' : ["WAI", "imp", "rw"],
		'DB' : ["STP", "imp", "rw"],
	}
	this.configure65c02 = function() {
		// Patch instruction table with 65c02 extensions
		for(const opcode in this.instr65c02) {
			let op = parseInt(opcode, 16);
			let aaa = (op >> 5) & 0x07;
			let bbb = (op >> 2) & 0x07;
			let cc = (op & 0x03);
			this.instr[cc][bbb][aaa] = this.instr65c02[opcode];
		}
	}

 	// Instructions - from https://www.masswerk.at/6502/6502_instruction_set.html
 	//
 	// Bit: 7 6 5 4 3 2 1 0
 	//      a a a b b b c c

 	// Format is "instruction","addressing-mode", "read-write flags"
 	this.instr = [
 	  [
 		// cc = 0
 		//  0                  1                  2                 3                   4                  5                  6                  7
 		[ ["BRK","imp","rw"],["JSR","jsr","Rw"],["RTI","imp","Rw"],["RTS","imp","Rw"],["UNP","imm","Rw"],["LDY","imm","Rw"],["CPY","imm","Rw"],["CPX","imm","Rw"] ], // bbb = 0 65c02 bra for a=4
 		[ ["UNP","zpg","Rw"],["BIT","zpg","Rw"],["UNP","zpg","Rw"],["UNP","zpg","Rw"],["STY","zpg","rW"],["LDY","zpg","Rw"],["CPY","zpg","Rw"],["CPX","zpg","Rw"] ], // bbb = 1
 		[ ["PHP","imp","rW"],["PLP","imp","rw"],["PHA","imp","rW"],["PLA","imp","rw"],["DEY","imp","rw"],["TAY","imp","rw"],["INY","imp","rw"],["INX","imp","rw"] ], // bbb = 2
 		[ ["UNP","abs","Rw"],["BIT","abs","Rw"],["JMP","jmp","Rw"],["JMP","jmi","Rw"],["STY","abs","rW"],["LDY","abs","Rw"],["CPY","abs","Rw"],["CPX","abs","Rw"] ], // bbb = 3
 		[ ["BPL","imm","Rw"],["BMI","imm","Rw"],["BVC","imm","Rw"],["BVS","imm","Rw"],["BCC","imm","Rw"],["BCS","imm","Rw"],["BNE","imm","Rw"],["BEQ","imm","Rw"] ], // bbb = 4
 		[ ["UNP","zpx","Rw"],["UNP","zpx","Rw"],["UNP","zpx","Rw"],["UNP","zpx","Rw"],["STY","zpx","rW"],["LDY","zpx","Rw"],["UNP","zpx","Rw"],["UNP","zpx","Rw"] ], // bbb = 5 65c02 bit zp,x for a=1
 		[ ["CLC","imp","rw"],["SEC","imp","rw"],["CLI","imp","rw"],["SEI","imp","rw"],["TYA","imp","rw"],["CLV","imp","rw"],["CLD","imp","rw"],["SED","imp","rw"] ], // bbb = 6
 		[ ["UNP","abx","Rw"],["UNP","abx","Rw"],["UNP","abx","Rw"],["UNP","abx","Rw"],["SHY","abx","rW"],["LDY","abx","Rw"],["UNP","abx","Rw"],["UNP","abx","Rw"] ]  // bbb = 7 65c02 bit abs,x for a=1, jmp (abs,x) for a=3
 	  ],
 	  [
 	  	// cc = 1
 		//  0                  1                  2                  3                  4                  5                  6                  7
		[ ["ORA","idx","Rw"],["AND","idx","Rw"],["EOR","idx","Rw"],["ADC","idx","Rw"],["STA","idx","rW"],["LDA","idx","Rw"],["CMP","idx","Rw"],["SBC","idx","Rw"] ], // bbb = 0
		[ ["ORA","zpg","Rw"],["AND","zpg","Rw"],["EOR","zpg","Rw"],["ADC","zpg","Rw"],["STA","zpg","rW"],["LDA","zpg","Rw"],["CMP","zpg","Rw"],["SBC","zpg","Rw"] ], // bbb = 1
		[ ["ORA","imm","Rw"],["AND","imm","Rw"],["EOR","imm","Rw"],["ADC","imm","Rw"],["???","imm","Rw"],["LDA","imm","Rw"],["CMP","imm","Rw"],["SBC","imm","Rw"] ], // bbb = 2 65c02 bit imm
		[ ["ORA","abs","Rw"],["AND","abs","Rw"],["EOR","abs","Rw"],["ADC","abs","Rw"],["STA","abs","rW"],["LDA","abs","Rw"],["CMP","abs","Rw"],["SBC","abs","Rw"] ], // bbb = 3
		[ ["ORA","idy","Rw"],["AND","idy","Rw"],["EOR","idy","Rw"],["ADC","idy","Rw"],["STA","idy","rW"],["LDA","idy","Rw"],["CMP","idy","Rw"],["SBC","idy","Rw"] ], // bbb = 4
		[ ["ORA","zpx","Rw"],["AND","zpx","Rw"],["EOR","zpx","Rw"],["ADC","zpx","Rw"],["STA","zpx","rW"],["LDA","zpx","Rw"],["CMP","zpx","Rw"],["SBC","zpx","Rw"] ], // bbb = 5
		[ ["ORA","aby","Rw"],["AND","aby","Rw"],["EOR","aby","Rw"],["ADC","aby","Rw"],["STA","aby","rW"],["LDA","aby","Rw"],["CMP","aby","Rw"],["SBC","aby","Rw"] ], // bbb = 6
		[ ["ORA","abx","Rw"],["AND","abx","Rw"],["EOR","abx","Rw"],["ADC","abx","Rw"],["STA","abx","rW"],["LDA","abx","Rw"],["CMP","abx","Rw"],["SBC","abx","Rw"] ], // bbb = 7
 	  ],
 	  [
 	  	// cc = 2
 		//  0                  1                  2                  3                  4                  5                  6                  7
		[ ["???","???","RW"],["???","???","RW"],["???","???","RW"],["???","???","RW"],["???","imm","Rw"],["LDX","imm","Rw"],["???","imm","Rw"],["???","imm","Rw"] ], // bbb = 0
		[ ["ASL","zpg","RW"],["ROL","zpg","RW"],["LSR","zpg","RW"],["ROR","zpg","RW"],["STX","zpg","rW"],["LDX","zpg","Rw"],["DEC","zpg","RW"],["INC","zpg","RW"] ], // bbb = 1
		[ ["ASL","imp","rw"],["ROL","imp","rw"],["LSR","imp","rw"],["ROR","imp","rw"],["TXA","imp","rw"],["TAX","imp","rw"],["DEX","imp","rw"],["NOP","imp","rw"] ], // bbb = 2
		[ ["ASL","abs","RW"],["ROL","abs","RW"],["LSR","abs","RW"],["ROR","abs","RW"],["STX","abs","rW"],["LDX","abs","Rw"],["DEC","abs","RW"],["INC","abs","RW"] ], // bbb = 3
		[ ["???","???","RW"],["???","???","RW"],["???","???","RW"],["???","???","RW"],["???","???","rW"],["???","???","Rw"],["???","???","RW"],["???","???","RW"] ], // bbb = 4 65c02 - zpg mode
		[ ["ASL","zpx","RW"],["ROL","zpx","RW"],["LSR","zpx","RW"],["ROR","zpx","RW"],["STX","zpy","rW"],["LDX","zpy","Rw"],["DEC","zpx","RW"],["INC","zpx","RW"] ], // bbb = 5
		[ ["???","imp","Rw"],["???","imp","Rw"],["???","imp","Rw"],["???","imp","Rw"],["TXS","imp","rw"],["TSX","imp","rw"],["???","imp","Rw"],["???","imp","Rw"] ], // bbb = 6 65c02 = dec and inc for a=0,1
		[ ["ASL","abx","RW"],["ROL","abx","RW"],["LSR","abx","RW"],["ROR","abx","RW"],["???","aby","rW"],["LDX","aby","Rw"],["DEC","abx","RW"],["INC","abx","RW"] ], // bbb = 7
 	  ],
 	  [
 	  	// cc = 3
 		//  0                  1                  2                  3                  4                  5                  6                  7
		[ ["SLO","idx","RW"],["RLA","idx","RW"],["SRE","idx","RW"],["RRA","idx","RW"],["SAX","idx","rW"],["LAX","idx","Rw"],["DCP","idx","RW"],["ISB","idx","RW"] ], // bbb = 0
		[ ["SLO","zpg","RW"],["RLA","zpg","RW"],["SRE","zpg","RW"],["RRA","zpg","RW"],["SAX","zpg","rW"],["LAX","zpg","Rw"],["DCP","zpg","RW"],["ISB","zpg","RW"] ], // bbb = 1
		[ ["ANC","imm","Rw"],["ANC","imm","Rw"],["ASR","imm","Rw"],["ARR","imm","Rw"],["ANE","imm","Rw"],["LXA","imm","Rw"],["SBX","imm","Rw"],["SBC","imm","Rw"] ], // bbb = 2 65c02 - WAI for a=6
		[ ["SLO","abs","RW"],["RLA","abs","RW"],["SRE","abs","RW"],["RRA","abs","RW"],["SAX","abs","rW"],["LAX","abs","Rw"],["DCP","abs","RW"],["ISB","abs","RW"] ], // bbb = 3
		[ ["SLO","idy","RW"],["RLA","idy","RW"],["SRE","idy","RW"],["RRA","idy","RW"],["SHA","idy","RW"],["LAX","idy","Rw"],["DCP","idy","RW"],["ISB","idy","RW"] ], // bbb = 4
		[ ["SLO","zpx","RW"],["RLA","zpx","RW"],["SRE","zpx","RW"],["RRA","zpx","RW"],["SAX","zpy","rW"],["LAX","zpy","Rw"],["DCP","zpx","RW"],["ISB","zpx","RW"] ], // bbb = 5
		[ ["SLO","aby","RW"],["RLA","aby","RW"],["SRE","aby","RW"],["RRA","aby","RW"],["SHS","aby","rW"],["LAS","aby","Rw"],["DCP","aby","RW"],["ISB","aby","RW"] ], // bbb = 6
		[ ["SLO","abx","RW"],["RLA","abx","RW"],["SRE","abx","RW"],["RRA","abx","RW"],["SHA","ayx","rW"],["LAX","aby","Rw"],["DCP","abx","RW"],["ISB","abx","RW"] ], // bbb = 7
 	  ]
 	];

 	this.disassemble = function(address, bytes, indent = "             ") {
 		let end = address+bytes;

 		let diss = {
 			lineMap : new Map(),
 			lines : [],
 			labels : new Map()
 		}

 		while(address < end) {
 			let byte = this.memory.read(address);
 			let def = this.definitions[byte];
 			diss.lineMap.set(address, diss.lines.length);

 			if( !def ) {
 				diss.lines.push(`; Unknown byte \$${hexValue(byte,1)} at address \$${hexValue(address, 2)}`);
 				address++;
 				continue;
 			}
 			try {
 				let len = def.length();
 				let text = hexValue(address, 2)+": ";
 				for( var i=0; i<3; i++) {
 					if( i<len ) {
 						text+= hexValue(this.memory.read(address+i), 1)+" ";
 					}
 					else {
 						text += "   ";
 					}
 				}
 				if( diss.labels.has(address) ) {
 					text += (diss.labels.get(address) + indent ).substring(0, indent.length);
 				}
 				else {
 					text += indent;
 				}
 				text += def.toString(address, this.memory, diss.labels);
 				diss.lines.push(text);

 				if( diss.labels.size > 0 ) {
 					let keys = Array.from(diss.labels.keys());
 					let labelAddress = keys[keys.length-1];
 					if( labelAddress < address && diss.lineMap.has(labelAddress)) {
 						// Most recent label is before this address...
 						let lineNum = diss.lineMap.get(labelAddress);
 						let line = diss.lines[lineNum];
 						diss.lines[lineNum] = line.substring(0,15) + (diss.labels.get(labelAddress)+indent).substring(0, indent.length) + line.substring(15+indent.length);
 					}
 				}
 				address += len;
 			}
 			catch( err ) {
 				diss.lines.push("; Unknown address mode?! ");
 				address++;
 			}
 			if( def.instruction() == "RTS" || def.instruction() == "RTI" ) {
 				diss.lines.push("");
 			}
 		}
 		return diss;
 	}
}
