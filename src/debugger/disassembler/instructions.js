//$ = byte
//% = word
const instructions= [
	"BRK",			//opBRK,			//0x00
	"ORA ($,X)",	//opORA_IX,			//0x01
	"NOP",			//opNOP_IMMED,		//0x02
	"NOP",			//opNOP,			//0x03
	"TSB $",		//opTSB_ZP,			//0x04
	"ORA $",		//opORA_ZP,			//0x05
	"ASL $",		//opASL_ZP,			//0x06
	"RMB0 $",		//opRMB0,			//0x07
	"PHP",			//opPHP,			//0x08
	"ORA #$",		//opORA_IMMED,		//0x09
	"ASL",			//opASL,			//0x0A
	"NOP",			//opNOP,			//0x0B
	"TSB %",		//opTSB_ADDRESS,	//0x0C
	"ORA %",		//opORA_ADDRESS,	//0x0D
	"ASL %",		//opASL_ADDRESS,	//0x0E
	"BBR0 $,$",		//opBBR0,			//0x0F
	"BPL r",		//opBPL,			//0x10
	"ORA ($),Y",	//opORA_IY,			//0x11
	"ORA ($)",		//opORA_IZP,		//0x12
	"NOP",			//opNOP,			//0x13
	"TRB $",		//opTRB_ZP,			//0x14
	"ORA $,X",		//opORA_ZPX,		//0x15
	"ASL $,X",		//opASL_ZPX,		//0x16
	"RMB1 $",		//opRMB1,			//0x17
	"CLC",			//opCLC,			//0x18
	"ORA %,Y",		//opORA_ADDRESSY,	//0x19
	"INC",			//opINC,			//0x1A
	"NOP",			//opNOP,			//0x1B
	"TRB %",		//opTRB_ADDRESS,	//0x1C
	"ORA %,X",		//opORA_ADDRESSX,	//0x1D
	"ASL %,X",		//opASL_ADDRESSX,	//0x1E
	"BBR1 $,$",		//opBBR1,			//0x1F
	"JSR %",		//opJSR,			//0x20
	"AND ($,X)",	//opAND_IX,			//0x21
	"NOP",			//opNOP_IMMED,		//0x22
	"NOP",			//opNOP,			//0x23
	"BIT $",		//opBIT_ZP,			//0x24
	"AND $",		//opAND_ZP,			//0x25
	"ROL $",		//opROL_ZP,			//0x26
	"RMB $",		//opRMB2,			//0x27
	"PLP",			//opPLP,			//0x28
	"AND #$",		//opAND_IMMED,		//0x29
	"ROL",			//opROL,			//0x2A
	"NOP",			//opNOP,			//0x2B
	"BIT %",		//opBIT_ADDRESS,	//0x2C
	"AND %",		//opAND_ADDRESS,	//0x2D
	"ROL %",		//opROL_ADDRESS,	//0x2E
	"BBR2 $,$",		//opBBR2,			//0x2F
	"BMI r",		//opBMI,			//0x30
	"AND ($),Y",	//opAND_IY,			//0x31
	"AND ($)",		//opAND_IZP,		//0x32
	"NOP",			//opNOP,			//0x33
	"BIT $,X",		//opBIT_ZPX,		//0x34
	"AND $,X",		//opAND_ZPX,		//0x35
	"ROL $,X",		//opROL_ZPX,		//0x36
	"RMB3 $",		//opRMB3,			//0x37
	"SEC",			//opSEC,			//0x38
	"AND %,Y",		//opAND_ADDRESSY,	//0x39
	"DEC",			//opDEC,			//0x3A
	"NOP",			//opNOP,			//0x3B
	"BIT %,X",		//opBIT_ADDRESSX,	//0x3C
	"AND %,X",		//opAND_ADDRESSX,	//0x3D
	"ROL %,X",		//opROL_ADDRESSX,	//0x3E
	"BBR3 $,$",		//opBBR3,			//0x3F
	"RTI",			//opRTI,			//0x40
	"EOR ($,X)",	//opEOR_IX,			//0x41
	"NOP",			//opNOP_IMMED,		//0x42
	"NOP",			//opNOP,			//0x43
	"NOP",			//opNOP_ZP,			//0x44
	"EOR $",		//opEOR_ZP,			//0x45
	"LSR $",		//opLSR_ZP,			//0x46
	"RMB4 $",		//opRMB4,			//0x47
	"PHA",			//opPHA,			//0x48
	"EOR #$",		//opEOR_IMMED,		//0x49
	"LSR",			//opLSR,			//0x4A
	"NOP",			//opNOP,			//0x4B
	"JMP %",		//opJMP_ADDRESS,	//0x4C
	"EOR %",		//opEOR_ADDRESS,	//0x4D
	"LSR %",		//opLSR_ADDRESS,	//0x4E
	"BBR4 $,$",		//opBBR4,			//0x4F
	"BVC r",		//opBVC,			//0x50
	"EOR ($),Y",	//opEOR_IY,			//0x51
	"EOR ($)",		//opEOR_IZP,		//0x52
	"NOP",			//opNOP,			//0x53
	"NOP",			//opNOP_ZPX,		//0x54
	"EOR $,X",		//opEOR_ZPX,		//0x55
	"LSR $,X",		//opLSR_ZPX,		//0x56
	"RMB5 $",		//opRMB5,			//0x57
	"CLI",			//opCLI,			//0x58
	"EOR %,Y",		//opEOR_ADDRESSY,	//0x59
	"PHY",			//opPHY,			//0x5A
	"NOP",			//opNOP,			//0x5B
	"NOP",			//opNOP_ADDRESS,	//0x5C
	"EOR %,X",		//opEOR_ADDRESSX,	//0x5D
	"LSR %,X",		//opLSR_ADDRESSX,	//0x5E
	"BBR5 $,$",		//opBBR5,			//0x5F
	"RTS",			//opRTS,			//0x60
	"ADC ($,X)",	//opADC_IX,			//0x61
	"NOP",			//opNOP_IMMED,		//0x62
	"NOP",			//opNOP,			//0x63
	"STZ $",		//opSTZ_ZP,			//0x64
	"ADC $",		//opADC_ZP,			//0x65
	"ROR $",		//opROR_ZP,			//0x66
	"RMB6 $",		//opRMB6,			//0x67
	"PLA",			//opPLA,			//0x68
	"ADC #$",		//opADC_IMMED,		//0x69
	"ROR",			//opROR,			//0x6A
	"NOP",			//opNOP,			//0x6B
	"JMP (%)",		//opJMP_I,			//0x6C
	"ADC %",		//opADC_ADDRESS,	//0x6D
	"ROR %",		//opROR_ADDRESS,	//0x6E
	"BBR6 $,$",		//opBBR6,			//0x6F
	"BVS r",		//opBVS,			//0x70
	"ADC ($),Y",	//opADC_IY,			//0x71
	"ADC ($)",		//opADC_IZP,		//0x72
	"NOP",			//opNOP,			//0x73
	"STZ $,X",		//opSTZ_ZPX,		//0x74
	"ADC $,X",		//opADC_ZPX,		//0x75
	"ROR $,X",		//opROR_ZPX,		//0x76
	"RMB7 $",		//opRMB7,			//0x77
	"SEI",			//opSEI,			//0x78
	"ADC %,Y",		//opADC_ADDRESSY,	//0x79
	"PLY",			//opPLY,			//0x7A
	"NOP",			//opNOP,			//0x7B
	"JMP (%,X)",	//opJMP_IADDRESSX,	//0x7C
	"ADC %,X",		//opADC_ADDRESSX,	//0x7D
	"ROR %,X",		//opROR_ADDRESSX,	//0x7E
	"BBR7 $,$",		//opBBR7,			//0x7F
	"BRA r",		//opBRA,			//0x80
	"STA ($,X)",	//opSTA_IX,			//0x81
	"NOP",			//opNOP_IMMED,		//0x82
	"NOP",			//opNOP,			//0x83
	"STY $",		//opSTY_ZP,			//0x84
	"STA $",		//opSTA_ZP,			//0x85
	"STX $",		//opSTX_ZP,			//0x86
	"SMB0 $",		//opSMB0,			//0x87
	"DEY",			//opDEY,			//0x88
	"BIT #$",		//opBIT_IMMED,		//0x89
	"TXA",			//opTXA,			//0x8A
	"NOP",			//opNOP,			//0x8B
	"STY %",		//opSTY_ADDRESS,	//0x8C
	"STA %",		//opSTA_ADDRESS,	//0x8D
	"STX %",		//opSTX_ADDRESS,	//0x8E
	"BBS0 $,$",		//opBBS0,			//0x8F
	"BCC r",		//opBCC,			//0x90
	"STA ($),Y",	//opSTA_IY,			//0x91
	"STA ($)",		//opSTA_IZP,		//0x92
	"NOP",			//opNOP,			//0x93
	"STY $,X",		//opSTY_ZPX,		//0x94
	"STA $,X",		//opSTA_ZPX,		//0x95
	"STX $,X",		//opSTX_ZPY,		//0x96
	"SMB1 $",		//opSMB1,			//0x97
	"TYA",			//opTYA,			//0x98
	"STA %,Y",		//opSTA_ADDRESSY,	//0x99
	"TXS",			//opTXS,			//0x9A
	"NOP",			//opNOP,			//0x9B
	"STZ %",		//opSTZ_ADDRESS,	//0x9C
	"STA %,X",		//opSTA_ADDRESSX,	//0x9D
	"STZ %,X",		//opSTZ_ADDRESSX,	//0x9E
	"BBS1 $,$",		//opBBS1,			//0x9F
	"LDY #$",		//opLDY_IMMED,		//0xA0
	"LDA ($,X)",	//opLDA_IX,			//0xA1
	"LDX #$",		//opLDX_IMMED,		//0xA2
	"NOP",			//opNOP,			//0xA3
	"LDY $",		//opLDY_ZP,			//0xA4
	"LDA $",		//opLDA_ZP,			//0xA5
	"LDX $",		//opLDX_ZP,			//0xA6
	"SMB2 $",		//opSMB2_ZP,		//0xA7
	"TAY",			//opTAY,			//0xA8
	"LDA #$",		//opLDA_IMMED,		//0xA9
	"TAX",			//opTAX,			//0xAA
	"NOP",			//opNOP,			//0xAB
	"LDY %",		//opLDY_ADDRESS,	//0xAC
	"LDA %",		//opLDA_ADDRESS,	//0xAD
	"LDX %",		//opLDX_ADDRESS,	//0xAE
	"BBS2 $,$",		//opBBS2,			//0xAF
	"BCS r",		//opBCS,			//0xB0
	"LDA ($),Y",	//opLDA_IY,			//0xB1
	"LDA ($)",		//opLDA_IZP,		//0xB2
	"NOP",			//opNOP,			//0xB3
	"LDY $,X",		//opLDY_ZPX,		//0xB4
	"LDA $,X",		//opLDA_ZPX,		//0xB5
	"LDX $,Y",		//opLDX_ZPY,		//0xB6
	"SMB3 $",		//opSMB3,			//0xB7
	"CLV",			//opCLV,			//0xB8
	"LDA %,Y",		//opLDA_ADDRESSY,	//0xB9
	"TSX",			//opTSX,			//0xBA
	"NOP",			//opNOP,			//0xBB
	"LDY %,X",		//opLDY_ADDRESSX,	//0xBC
	"LDA %,X",		//opLDA_ADDRESSX,	//0xBD
	"LDX %,Y",		//opLDX_ADDRESSY,	//0xBE
	"BBS3 $,$",		//opBBS3,			//0xBF
	"CPY #$",		//opCPY_IMMED,		//0xC0
	"CMP ($,X)",	//opCMP_IX,			//0xC1
	"NOP",			//opNOP_IMMED,		//0xC2
	"NOP",			//opNOP,			//0xC3
	"CPY $",		//opCPY_ZP,			//0xC4
	"CMP $",		//opCMP_ZP,			//0xC5
	"DEC $",		//opDEC_ZP,			//0xC6
	"SMB4 $",		//opSMB4,			//0xC7
	"INY",			//opINY,			//0xC8
	"CMP #$",		//opCMP_IMMED,		//0xC9
	"DEX",			//opDEX,			//0xCA
	"WAI",			//opWAI,			//0xCB
	"CPY %",		//opCPY_ADDRESS,	//0xCC
	"CMP %",		//opCMP_ADDRESS,	//0xCD
	"DEC %",		//opDEC_ADDRESS,	//0xCE
	"BBS4 $,$",		//opBBS4,			//0xCF
	"BNE r",		//opBNE,			//0xD0
	"CMP ($),Y",	//opCMP_IY,			//0xD1
	"CMP ($)",		//opCMP_IZP,		//0xD2
	"NOP",			//opNOP,			//0xD3
	"NOP",			//opNOP_ZPX,		//0xD4
	"CMP $,X",		//opCMP_ZPX,		//0xD5
	"DEC $,X",		//opDEC_ZPX,		//0xD6
	"SMB5 $",		//opSMB5,			//0xD7
	"CLD",			//opCLD,			//0xD8
	"CMP %,Y",		//opCMP_ADDRESSY,	//0xD9
	"PHX",			//opPHX,			//0xDA
	"STP",			//opSTP,			//0xDB
	"NOP",			//opNOP_ADDRESS,	//0xDC
	"CMP %,X",		//opCMP_ADDRESSX,	//0xDD
	"DEC %,X",		//opDEC_ADDRESSX,	//0xDE
	"BBS5 $,$",		//opBBS5,			//0xDF
	"CPX #$",		//opCPX_IMMED,		//0xE0
	"SBC ($,X)",	//opSBC_IX,			//0xE1
	"NOP",			//opNOP_IMMED,		//0xE2
	"NOP",			//opNOP,			//0xE3
	"CPX $",		//opCPX_ZP,			//0xE4
	"SBC $",		//opSBC_ZP,			//0xE5
	"INC $",		//opINC_ZP,			//0xE6
	"SMB6 $",		//opSMB6,			//0xE7
	"INX",			//opINX,			//0xE8
	"SBC #$",		//opSBC_IMMED,		//0xE9
	"NOP",			//opNOP,			//0xEA
	"NOP",			//opNOP,			//0xEB
	"CPX %",		//opCPX_ADDRESS,	//0xEC
	"SBC %",		//opSBC_ADDRESS,	//0xED
	"INC %",		//opINC_ADDRESS,	//0xEE
	"BBS6 $,$",		//opBBS6,			//0xEF
	"BEQ r",		//opBEQ,			//0xF0
	"SBC ($),Y",	//opSBC_IY,			//0xF1
	"SBC ($)",		//opSBC_IZP,		//0xF2
	"NOP",			//opNOP,			//0xF3
	"NOP",			//opNOP_ZPX,		//0xF4
	"SBC $,X",		//opSBC_ZPX,		//0xF5
	"INC $,X",		//opINC_ZPX,		//0xF6
	"SMB7 $",		//opSMB7,			//0xF7
	"SED",			//opSED,			//0xF8
	"SBC %,Y",		//opSBC_ADDRESSY,	//0xF9
	"PLX",			//opPLX,			//0xFA
	"NOP",			//opNOP,			//0xFB
	"NOP",			//opNOP_ADDRESS,	//0xFC
	"SBC %,X",		//opSBC_ADDRESSX,	//0xFD
	"INC %,X",		//opINC_ADDRESSX,	//0xFE
	"BBS7 $,$",		//opBBS7			//0xFF
];

export default instructions;
