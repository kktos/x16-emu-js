// 6502 assembler
// n. landsteiner, mass:werk, www.masswerk.at
// 2021: added compatibility for opcode extensions (".b", ".w"),
//       accepts now colons after labels, alt. prgama ".ORG" for origin;
//       support for illegal opcodes, support for expressions,
//       auto-zeropage addr. default, slightly modernized UI.

"use strict";

let assembler = (function() {

// lookup tables

let hextab= ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'],
	instrLegals = {
		'ADC': [  -1,  -1,0x69,0x6d,0x7d,0x79,0x65,0x75,  -1,  -1,0x61,0x71,  -1],
		'AND': [  -1,  -1,0x29,0x2d,0x3d,0x39,0x25,0x35,  -1,  -1,0x21,0x31,  -1],
		'ASL': [  -1,0x0a,  -1,0x0e,0x1e,  -1,0x06,0x16,  -1,  -1,  -1,  -1,  -1],
		'BCC': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0x90],
		'BCS': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0xb0],
		'BEQ': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0xf0],
		'BIT': [  -1,  -1,  -1,0x2c,  -1,  -1,0x24,  -1,  -1,  -1,  -1,  -1,  -1],
		'BMI': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0x30],
		'BNE': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0xd0],
		'BPL': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0x10],
		'BRK': [0x00,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'BVC': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0x50],
		'BVS': [  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,0x70],
		'CLC': [0x18,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'CLD': [0xd8,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'CLI': [0x58,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'CLV': [0xb8,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'CMP': [  -1,  -1,0xc9,0xcd,0xdd,0xd9,0xc5,0xd5,  -1,  -1,0xc1,0xd1,  -1],
		'CPX': [  -1,  -1,0xe0,0xec,  -1,  -1,0xe4,  -1,  -1,  -1,  -1,  -1,  -1],
		'CPY': [  -1,  -1,0xc0,0xcc,  -1,  -1,0xc4,  -1,  -1,  -1,  -1,  -1,  -1],
		'DEC': [  -1,  -1,  -1,0xce,0xde,  -1,0xc6,0xd6,  -1,  -1,  -1,  -1,  -1],
		'DEX': [0xca,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'DEY': [0x88,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'EOR': [  -1,  -1,0x49,0x4d,0x5d,0x59,0x45,0x55,  -1,  -1,0x41,0x51,  -1],
		'INC': [  -1,  -1,  -1,0xee,0xfe,  -1,0xe6,0xf6,  -1,  -1,  -1,  -1,  -1],
		'INX': [0xe8,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'INY': [0xc8,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'JMP': [  -1,  -1,  -1,0x4c,  -1,  -1,  -1,  -1,  -1,0x6c,  -1,  -1,  -1],
		'JSR': [  -1,  -1,  -1,0x20,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'LDA': [  -1,  -1,0xa9,0xad,0xbd,0xb9,0xa5,0xb5,  -1,  -1,0xa1,0xb1,  -1],
		'LDX': [  -1,  -1,0xa2,0xae,  -1,0xbe,0xa6,  -1,0xb6,  -1,  -1,  -1,  -1],
		'LDY': [  -1,  -1,0xa0,0xac,0xbc,  -1,0xa4,0xb4,  -1,  -1,  -1,  -1,  -1],
		'LSR': [  -1,0x4a,  -1,0x4e,0x5e,  -1,0x46,0x56,  -1,  -1,  -1,  -1,  -1],
		'NOP': [0xea,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'ORA': [  -1,  -1,0x09,0x0d,0x1d,0x19,0x05,0x15,  -1,  -1,0x01,0x11,  -1],
		'PHA': [0x48,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'PHP': [0x08,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'PLA': [0x68,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'PLP': [0x28,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'ROL': [  -1,0x2a,  -1,0x2e,0x3e,  -1,0x26,0x36,  -1,  -1,  -1,  -1,  -1],
		'ROR': [  -1,0x6a,  -1,0x6e,0x7e,  -1,0x66,0x76,  -1,  -1,  -1,  -1,  -1],
		'RTI': [0x40,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'RTS': [0x60,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SBC': [  -1,  -1,0xe9,0xed,0xfd,0xf9,0xe5,0xf5,  -1,  -1,0xe1,0xf1,  -1],
		'SEC': [0x38,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SED': [0xf8,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SEI': [0x78,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'STA': [  -1,  -1,  -1,0x8d,0x9d,0x99,0x85,0x95,  -1,  -1,0x81,0x91,  -1],
		'STX': [  -1,  -1,  -1,0x8e,  -1, -18,0x86,  -1,0x96,  -1,  -1,  -1,  -1],
		'STY': [  -1,  -1,  -1,0x8c, -17,  -1,0x84,0x94,  -1,  -1,  -1,  -1,  -1],
		'TAX': [0xaa,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'TAY': [0xa8,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'TSX': [0xba,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'TXA': [0x8a,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'TXS': [0x9a,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'TYA': [0x98,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1]
	},
	instrIllegals = {
		'ALR': [  -1,  -1,0x4b,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'ANC': [  -1,  -1,0x0b,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'ANC2':[  -1,  -1,0x2b,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'ANE': [  -1,  -1,0x8b,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'ARR': [  -1,  -1,0x6b,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'DCP': [  -1,  -1,  -1,0xcf,0xdf,0xdb,0xc7,0xd7,  -1,  -1,0xc3,0xd3,  -1],
		'ISC': [  -1,  -1,  -1,0xef,0xff,0xfb,0xe7,0xf7,  -1,  -1,0xe3,0xf3,  -1],
		'LAS': [  -1,  -1,  -1,  -1,  -1,0xbb,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'LAX': [  -1,  -1,0xab,0xaf,  -1,0xbf,0xa7,  -1,0xb7,  -1,0xa3,0xb3,  -1],
		'LXA': [  -1,  -1,0xab,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'NOP': [0xea,  -1,0x80,0x0c,0x1c,  -1,0x04,0x14,  -1,  -1,  -1,  -1,  -1],
		'RLA': [  -1,  -1,  -1,0x2f,0x3f,0x3b,0x27,0x37,  -1,  -1,0x23,0x33,  -1],
		'RRA': [  -1,  -1,  -1,0x6f,0x7f,0x7b,0x67,0x77,  -1,  -1,0x63,0x73,  -1],
		'SAX': [  -1,  -1,  -1,0x8f,  -1,  -1,0x87,  -1,0x97,  -1,0x83,  -1,  -1],
		'USBC':[  -1,  -1,0xeb,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SBX': [  -1,  -1,0xcb,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SHA': [  -1,  -1,  -1,  -1,  -1,0x9f,  -1,  -1,  -1,  -1,  -1,0x93,  -1],
		'SHX': [  -1,  -1,  -1,  -1,  -1,0x9e,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SHY': [  -1,  -1,  -1,  -1,0x9c,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'SLO': [  -1,  -1,  -1,0x0f,0x1f,0x1b,0x07,0x17,  -1,  -1,0x03,0x13,  -1],
		'SRE': [  -1,  -1,  -1,0x4f,0x5f,0x5b,0x47,0x57,  -1,  -1,0x43,0x53,  -1],
		'TAS': [  -1,  -1,  -1,  -1,  -1,0x9b,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'JAM': [0x02,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1],
		'DOP': [  -1,  -1,0x80,  -1,  -1,  -1,0x04,0x14,  -1,  -1,  -1,  -1,  -1],
		'TOP': [  -1,  -1,  -1,0x0c,0x1c,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1]
	},
	instrSynonyms = {
		'ASO': 'SLO',
		'LSE': 'SRE',
		'AXS': 'SAX',
		'AAX': 'SAX',
		'DCM': 'DCP',
		'ISB': 'ISC',
		'INS': 'ISC',
		'LAR': 'LAS',
		'LAE': 'LAS',
		'SHS': 'TAS',
		'XAS': 'TAS',
		'AXA': 'SHA',
		'AHX': 'SHA',
		'SAY': 'SHY',
		'SYA': 'SHY',
		'ASR': 'ALR',
		'XAA': 'ANE',
		'ATX': 'LAX',
		'HLT': 'JAM',
		'KIL': 'JAM',
		'SKB': 'DOP',
		'SKW': 'TOP'
	},
	steptab = [1,1,2,3,3,3,2,2,2,3,2,2,2],
	addrtab = {
		'imp':0,
		'acc':1,
		'imm':2,
		'abs':3,
		'abx':4,
		'aby':5,
		'zpg':6,
		'zpx':7,
		'zpy':8,
		'ind':9,
		'inx':10,
		'iny':11,
		'rel':12
	};


// statics

let codesrc, code, codeStart, codeEnd, srcl, srcc, pc, symtab,
	listing, listingElement, srcLnNo,
	optAutoZpg, comment, rawLine,showCodeAddresses=true, charEncoding,
	instrtab, instrAll, useIllegals=false, codeStore, emulator=null,
	bbcMode=false, hexPrefix='$', commentChar=';', pcSymbol='*', redefSyms=false,
	pass, continueInLine, bbcBlock=false, isHead, repeatCntr, repeatStep, convertPi, cbmStartAddr, anonymousTargets;

let ET_S='syntax error',
	ET_P='parse error',
	ET_C='compile error';

let bbcBasicIgnored = [ 'FOR','NEXT','DIM','CALL','DEF','ENDPROC','PRINT' ];

let origin = self.location.protocol+'//'+self.location.hostname+(self.location.port? ':'+self.location.port:'');

// functions

function setup() {
	var p;
	instrAll = {};
	for (p in instrLegals) instrAll[p]=instrLegals[p];
	for (p in instrIllegals) instrAll[p]=instrIllegals[p];
	for (p in instrSynonyms) instrAll[p]=instrIllegals[instrSynonyms[p]];
	instrtab = useIllegals? instrAll:instrLegals;
}

function assemble(src) {
	return new Promise(resolve => {
		setTimeout(() => {
			startAssembly(src);
			resolve(code);
		}, 0);
	});
}

function log(str) {
	console.log(str);
}

function startAssembly(src) {
	symtab={};
	optAutoZpg=true;
	charEncoding=encodeAscii;
	comment='';
	codeStore=null;

	// getSrc(document.getElementById('srcfield').value);
	getSrc(src);

	var empty=true;
	for (var i=0; i<codesrc.length; i++) {
		if ((/\S/).test(codesrc[i])) {
			empty=false;
			break;
		}
	}
	if (empty) {
		log('no source code.');
		return;
	}
	// listingElement.value=listing='pass 1\n\nLINE  LOC          LABEL     PICT\n\n';
	listing='pass 1\n\nLINE  LOC          LABEL     PICT\n\n';

	var pass1=false, pass2=false, range;
	code=[];
	codeStart=0x10000;
	codeEnd=0;
	cbmStartAddr=0;
	pass=1;
	pass1=asmPass();
	if (pass1) {
		listing+='\n';
		listSymbols();
		listing+='pass 2\n\nLOC   CODE         LABEL     INSTRUCTION\n\n';
		pass=2;
		pass2=asmPass();
		if (pass2) {
			if (codeStart==0x10000) codeStart=0;
			range=getHexWord(codeStart)+'..'+getHexWord(codeEnd);
			// listCode();
			if (code.length) {
				listing+='\ndone (code: '+range+').';
			}
			else {
				listing+='\ndone.\nno code generated.';
			}
			// document.getElementById('outputOption').style.visibility='visible';
		}
	}
	log(listing);

	if (pass1 && pass2) {
		if (code.length) {
			log('6502 Assembler','Assembly complete ('+range+'), ok.');
		}
		else {
			log('6502 Assembler','No code generated.');
		}
	}
	else {
		// listingElement.value+='\nfailed.\n';
		log('6502 Assembler','Assembly failed (see listing).');
	}
}

function compile(addr, b) {
	addr&=0xffff;
	code[addr]=b;
	if (addr<codeStart) codeStart=addr;
	if (addr>codeEnd) codeEnd=addr;
}

function fill(addr, pc, b) {
	addr&=0xffff;
	b&=0xff;
	var start = Math.min(pc,codeStart),
		end = Math.max(pc, codeEnd);
	if (addr<start) {
		for (var i=addr; i<start; i++) {
			if (typeof code[i]=='undefined') code[i]=b;
		}
		if (codeEnd<start) codeEnd=Math.max(0,start-1);
		codeStart=addr;
	}
	else if (addr>end) {
		if (typeof code[end]=='undefined') code[end]=b;
		for (var i=end+1; i<addr; i++) code[i]=b;
		if (end<codeStart) codeStart=end;
		codeEnd=Math.max(0,addr-1);
	}
}

function listCode() {
	var s='',
		ofs=showCodeAddresses? codeStart%8:0,
		fillbyte=bbcMode? 0xff:0;
	if (code.length) {
		for (var i=codeStart-ofs; i<=codeEnd; i++) {
			if (i%8==0) {
				if (showCodeAddresses) s+=getHexWord(i)+': ';
			}
			if (i<codeStart) {
				s+='.. ';
			}
			else {
				s+=getHexByte(typeof code[i] == 'undefined'? fillbyte:code[i] || 0);
				s+=(i%8==7 || i==code.length-1)? '\n':' ';
			}
		}
	}
	storeCode(codeStart,s, cbmStartAddr||codeStart);

	console.log("---- HEXDUMP");
	console.log({codeStart, codeEnd, code});
	console.log(s);
	// document.getElementById('codefield').value=s;
	// document.getElementById('codeLink').className= code.length? 'visible':'';
	// document.getElementById('downloadLink').className= code.length? 'visible':'';
}

function listSymbols() {
	var keys=[];
	for (var k in symtab) keys.push(k);
	keys.sort();
	if (keys.length) {
		listing+='symbols\n';
		for (var i=0; i<keys.length; i++) {
			var n = keys[i],
				sym = symtab[n];
			while (n.length<11) n+=' ';
			listing+=' '+n+(sym.isWord ||sym.v>0xff? hexPrefix+getHexWord(sym.v):'  '+hexPrefix+getHexByte(sym.v))+'\n';
		}
		listing+='\n';
	}
}

function getSrc(value) {
	if ( value.indexOf('\r\n')>=0) {
		codesrc= value.split('\r\n');
	}
	else if ( value.indexOf('\r')>=0) {
		codesrc= value.split('\r');
	}
	else {
		codesrc= value.split('\n');
	}
	if (bbcMode) {
		//remove BASIC line numbers
		for (var i=0;i<codesrc.length; i++) codesrc[i]=codesrc[i].replace(/^[0-9]+\s*/,'');
	}
}

function getChar(isQuote) {
	if (srcl>=codesrc.length) return 'EOF';
	if (srcc>=codesrc[srcl].length) {
		srcc=0;
		srcl++;
		return '\n';
	}
	else {
		var c=codesrc[srcl].charAt(srcc++);
		if (!isQuote && ((!bbcMode && c==';') || (bbcMode && c=='\\'))) {
			comment=pass==1? c:commentChar;
			while (srcc<codesrc[srcl].length) {
				var c1=codesrc[srcl].charAt(srcc++);
				if (bbcMode && c1==':') {
					continueInLine=true;
					isHead=false;
					break;
				}
				comment+=c1;
			}
		}
		else {
			rawLine+=c;
		}
		return c;
	}
}

function getSym() {
	if (comment) {
		listing+=comment+'\n';
		comment='';
	}
	rawLine='';
	if (!continueInLine) srcLnNo=srcl+1;
	var c=getChar();
	if (bbcMode && (c=='[' || c==']')) {
		continueInLine=(srcc<codesrc[srcl].length);
		return [c];
	}
	if (c=='EOF') return null;
	var sym=[''],
		s=0,
		m=0,
		quote='';
	while (!(!bbcMode && c==';' && !quote) && !(bbcMode && c=='\\' && !quote) && c!='\n' && c!='EOF' && !(bbcMode && (c==':'||c==']') && !quote)) {
		if (m<2 && (c==' ' || c=='\t')) {
			if (m>0) {
				m=0;
				if (sym[s] && sym[s].length) {
					sym[++s]='';
					if (bbcMode && !bbcBlock && sym[s-1]=='REM') {
						var cr=codesrc[srcl].charAt(srcc++);
						while (cr!='\n' || cr!='\r') {
							sym[s]+=cr=='\t'? ' ':cr;
							cr=codesrc[srcl].charAt(srcc++);
							if (srcc>codesrc[srcl].length) break;
						}
						break;
					}
				}
			}
		}
		else if (bbcMode && m<2 && !sym[s] && c=='[') {
			sym[s]=c;
			break;
		}
		else if (m<2 && (c=='=' || (bbcMode && (!bbcBlock && (c=='?' || c=='!' || c=='$'))))) {
			if (m>0) s++;
			sym[s]=c;
			m=0;
			sym[++s]='';
		}
		else if (m==2) {
			if (c==quote) {
				sym[s]+='"';
				quote='';
				m=1;
			}
			else {
				sym[s]+=c;
			}
		}
		else if (c=='"') {
			sym[s]+='"';
			m=2;
			quote=c;
		}
		else if (c=='\'') {
			sym[s]+=c;
			quote=c;
			m=3;
		}
		else if (m==0 && c=='!' && !bbcMode) {
			if (sym[s].length) s++;
			sym[s]=c;
			m=1;
			if (s>1) {
				var c1=getChar(false);
				while (c1=='+' || c1=='-') {
					sym[s]+=c1;
					c1=getChar(false);
				}
				c=c1;
				continue;
			}
		}
		else {
			if (m==3) {
				sym[s]+=c;
				quote='';
			}
			else {
				sym[s]+=c.toUpperCase();
			}
			m=1;
		}
		c=getChar(m>=2);
	}
	if (bbcMode && c==']' && srcc<=codesrc[srcl].length) srcc--;
	while (sym.length && sym[sym.length-1]=='') sym.length--;
	continueInLine=(bbcMode && (c==':' || sym[sym.length-1]=='[') && !quote);
	return c=='EOF'? null: sym;
}

function encodePetscii(b) {
	if (b >= 0x41 && b <= 0x5A) return b | 0x80; // A..Z
	if (b >= 0x61 && b <= 0x7A) return b - 0x20; // a..z
	return b;
}

function encodeCommodoreScreenCode(b) {
	if (b >= 0x61 && b <= 0x7A) return b-0x60; // a..z
	if (b >= 0x5B && b <= 0x5F) return b-0x40; // [\]^_
	if (b == 0x60) return 0x40;                // `
	if (b == 0x40) return 0;                   // @
	return b;
}

function encodeAscii(b) {
	return b;
}

function getNumber(s, idx, doubleWord) {
	var c0=s.charAt(idx),
		size=doubleWord? 0xffffffff:0xffff;
	if (c0=='$' || c0=='&') {
		for (var i=idx+1; i<s.length; i++) {
			var c=s.charAt(i);
			if ((c<'A' || c>'F') && (c<'0' || c>'9')) break;
		}
		if (i==idx+1) return {'v': -1, 'idx': i, 'error': true, 'et': ET_P};
		var n=s.substring(idx+1, i),
			isWord=(n.length>=4 && n.indexOf('00')==0) || !!doubleWord;
		return {'v': parseInt(n,16)&size, 'idx': i, 'error': false, 'isWord': isWord};
	}
	else if (c0=='%') {
		for (var i=idx+1; i<s.length; i++) {
			var c=s.charAt(i);
			if (c!='1' && c!='0') break;
		}
		if (i==idx+1) return {'v': -1, 'idx': i, 'error': true, 'et': ET_P};
		return {'v': parseInt(s.substring(idx+1, i),2)&size, 'idx': i, 'error': false};
	}
	else if (c0=='@') {
		for (var i=idx+1; i<s.length; i++) {
			var c=s.charAt(i);
			if (c<'0' || c>'7') break;
		}
		if (i==idx+1) return {'v': -1, 'idx': i, 'error': true};
		return {'v': parseInt(s.substring(idx+1, i),8)&size, 'idx': i, 'error': false};
	}
	else if (c0=='\'') {
		idx++;
		var quote=c0;
		if (idx<s.length) {
			var v=s.charCodeAt(idx);
			if (bbcMode && v==0xA3) v=0x60; //£
			else if (convertPi && v==0x03C0) v=0xff; //CBM pi
			if (v>0xff) return {'v': v, 'idx': idx, 'error': true, 'et': ET_P};
			idx++;
			return {'v': charEncoding(v), 'idx': idx, 'error': false};
		}
		return {'v': -1, 'idx': idx, 'error': true};
	}
	else if (c0=='0') {
		if (s.length==idx+1) return {'v': 0, 'idx': idx+1};
		var ofs=idx+1, base=8, c=s.charAt(ofs);
		if (c=='X') {
			base=16;
			ofs++;
		}
		else if (c=='O') {
			base=8;
			ofs++;
		}
		else if (c=='B') {
			base=2;
			ofs++;
		}
		else if (c=='D') {
			base=10;
			ofs++;
		}
		if (ofs>=s.length) return {'v': -1, 'idx': s.length, 'error': true, 'et': ET_P};
		for (var i=ofs; i<s.length; i++) {
			c=s.charAt(i);
			if (base==2 && (c!='0' && c!='1')) break;
			if (base==8 && (c<'0' || c>'7')) break;
			if (base==10 && (c<'0' || c>'9')) break;
			if (base==16 && (c<'0' || c>'9') && (c<'A' || c>'F')) break;
		}
		var n=s.substring(ofs, i),
			isWord=(base==16 && n.length>=4 && n.indexOf('00')==0) || !!doubleWord;
		return {'v': parseInt(n,base)&size, 'idx': i, 'error': false, 'isWord': isWord, 'lc': base!=8? ofs-1:-1 };
	}
	else {
		for (var i=idx; i<s.length; i++) {
			var c=s.charAt(i);
			if (c<'0' || c>'9') break;
		}
		if (i==idx) return {'v': -1, 'idx': i, 'error': true};
		return {'v': parseInt(s.substring(idx, i),10)&size, 'idx': i, 'error': false };
	}
	return {'v': -1, 'idx': idx, 'error': true};
}

function getIdentifier(s, idx, stripColon) {
	for (var i=idx; i<s.length; i++) {
		var c=s.charAt(i);
		if ((c<'A' || c>'Z') && (c<'0' || c>'9') && c!='_') break;
	}
	var end=i, suffix='';
	if (bbcMode && i<s.length && s.charAt(i)=='%') {
		i++;
		suffix='%';
	}
	if (stripColon && i<s.length && s.charAt(i)==':') i++;
	var l=Math.min(end-idx, 8);
	return { 'v': s.substr(idx, l)+suffix, 'idx': i };
}

function getExpression(s, pc, doubleWord) {
	var idx=0, c, v, r, state=0, max=s.length, root=[], stack=root, parent=[], pict='', last='', lvl=0,
		size=doubleWord? 0xffffffff:0xffff;
	while (idx < max) {
		c=s.charAt(idx);
		if (state==0) {
			if (c=='-') {
				pict+=c;
				stack.push({'type': 'sign'});
				idx++;
				if (idx<max) {
					c=s.charAt(idx);
					if (c=='>'||c=='<') {
						stack.push({'type': 'mod', 'v': c});
						idx++;
					}
				}
				state++;
				continue;
			}
			else if (c=='>'||c=='<') {
				pict+=c;
				stack.push({'type': 'mod', 'v': c});
				idx++;
				if (idx<max) {
					c=s.charAt(idx);
					if (c=='-') {
						pict+=c;
						stack.push({'type': 'sign'});
						idx++;
					}
				}
				state++;
				continue;
			}
			state++;
		}
		if (state==1) {
			if (bbcMode && c=='$') {
				pict+=c;
				return { 'v': -1, 'pict': pict, 'error': 'number or identifier expected\nuse "&" for hexadecimal notation in BBC mode.', 'et': ET_S };
			}
			if (c=='$' || c=='%' || c=='@' || c=='&' || (c>='0' && c<='9') || c=='\'') {
				r=getNumber(s, idx, doubleWord);
				var ns=(r.lc && r.lc>0)?
					s.substring(idx, r.lc)+s.charAt(r.lc).toLowerCase()+s.substring(r.lc+1, r.idx):
					s.substring(idx, r.idx);
				if (ns && ns.charAt(0)=='"') ns='\''+ns.substring(1,2);
				pict+=ns;
				if (r.error) {
					if (!(c>='0' && c<='9') && r.idx-idx<=1 && r.idx<s.length) pict+=s.charAt(r.idx);
					if (c=='\'' && r.v>=0) return { 'v': -1, 'pict': pict, 'error': 'illegal quantity', 'et': ET_P };
					return { 'v': -1, 'pict': pict, 'error': 'number character expected', 'et': ET_P };
				}
				stack.push({'type': 'num', 'v': r.v, 'isWord': r.isWord||false});
				idx=r.idx;
				last='figure';
			}
			else if ((c>='A' && c<='Z') || c=='_') {
				if (c=='P' && idx+1<max && s.charAt(idx+1)=='%') {
					pict+='P%';
					stack.push({'type': 'num', 'v': pc});
					idx+=2;
					last='';
				}
				else if (!bbcMode && c=='R' && idx+1<max && s.charAt(idx+1)=='%') {
					pict+='R%';
					stack.push({'type': 'num', 'v': repeatCntr*repeatStep});
					idx+=2;
					last='';
				}
				else if (bbcBlock && s.indexOf('ASC', idx)==idx) {
					pict+='ASC';
					idx+=3;
					if (s.charAt(idx)=='"') {
						pict+='"';
						c=s.charAt(++idx);
						if (c) pict+=c;
						if (!c) return { 'v': -1, 'pict': pict, 'error': 'character expected', 'et': ET_P };
						if (c=='"') return { 'v': -1, 'pict': pict, 'error': 'empty string', 'et': ET_P };
						var q=s.charAt(++idx);
						if (q!='"') return { 'v': -1, 'pict': pict+(q?q:''), 'error': 'quote expected', 'et': ET_P };
						v=c.charCodeAt(0);
						if (v==0xA3) v=0x60; //£
						pict+=q;
						if (v>0xff) return { 'v': -1, 'pict': pict, 'error': 'illegal quantity', 'et': ET_P };
						idx++;
						stack.push({'type': 'num', 'v': v});
						if (idx>max) idx=max;
						last='name character';
					}
					else {
						if (s.length>idx+1) pict+=s.charAt(idx);
						return { 'v': -1, 'pict': pict, 'error': 'quote expected', 'et': ET_S };
					}
				}
				else {
					r=getIdentifier(s, idx);
					pict+=r.v;
					if (instrtab[r.v]) return {'v': -1, 'pict': pict, 'error': 'illegal identifier (opcode '+r.v+')', 'et': ET_P};
					if (pass==2 && typeof symtab[r.v] == 'undefined') return { 'v': -1, 'pict': pict, 'error': 'undefined symbol', 'undef': r.v, 'et': ET_C };
					stack.push({'type': 'ident', 'v': r.v});
					idx=r.idx;
					last='name character';
				}
			}
			else if (c=='.') {
				pict+='.';
				if (bbcMode) return { 'v': -1, 'pict': pict, 'error': 'illegal character', 'et': ET_S };
				stack.push({'type': 'num', 'v': pc});
				idx++;
				last='';
			}
			else if (c=='*' && !bbcMode) {
				pict+='*';
				stack.push({'type': 'num', 'v': pc});
				idx++;
				last='';
			}
			else if (c=='[') {
				pict+=c;
				parent[lvl]=stack;
				stack=[];
				parent[lvl++].push({'type': 'paren', 'stack': stack, 'pict': pict});
				state=0;
				idx++;
				continue;
			}
			else {
				pict+=c;
				return { 'v': -1, 'pict': pict, 'error': 'number or identifier expected', 'et': ET_P };
			}
			state++;
		}
		else if (state==2) {
			pict+=c;
			if (c=='+' || c=='-' || c=='*' || c=='/') {
				stack.push({'type': 'op', 'v': c});
				idx++;
				state=0;
			}
			else if (c==']') {
				lvl--;
				if (lvl<0) return { 'v': -1, 'pict': pict, 'error': 'non matching parenthesis "]"', 'et': ET_P };
				stack=parent[lvl];
				stack[stack.length-1].pict=pict;
				idx++;
				state=2;
			}
			else {
				var message = last? last+' or operator expected':'operator expected';
				return { 'v': -1, 'pict': pict, 'error': 'unexpected token, '+message, 'et': ET_P };
			}
		}
	}
	if (state != 2)
		return { 'v': -1, 'pict': pict, 'error': 'number or identifier expected', 'et': ET_P };
	if (lvl != 0)
		return { 'v': -1, 'pict': pict, 'error': 'non matching parenthesis, "]" expected.', 'et': ET_S };
	return resolveExpression(root, pict, doubleWord);
}

function resolveExpression(stack, pict, doubleWord) {
	var result=0, item, pr, op='', sign=false, mod=false, modSign=false, isWord=!!doubleWord,
		size=doubleWord? 0xffffffff:0xffff;
	for (var i=0; i<stack.length; i++) {
		item=stack[i];
		switch (item.type) {
			case 'sign':
				sign=true;
				break;
			case 'mod':
				mod=item.v;
				modSign=sign;
				sign=false;
				break;
			case 'num':
			case 'ident':
			case 'paren':
				if (item.type=='paren') {
					if (item.stack.length==0) return { 'v': -1, 'pict': exp.pict+']', 'error': 'unexpected token "]"', 'et': ET_P };
					var exp=resolveExpression(item.stack, item.pict, doubleWord);
					if (exp.error || exp.undef) return exp;
					if (exp.isWord && !mod) isWord=true;
					pr=exp.v;
				}
				else if (item.type=='num') {
					pr=item.v;
					if (item.isWord && !mod) isWord=true;
				}
				else {
					var sym=symtab[item.v];
					if (!sym) {
						if (pass==1) return { 'v': 0xffff, 'pict': pict, 'error': false, 'isWord': true, 'undef': item.v };
						else return { 'v': -1, 'pict': pict, 'error': true, 'isWord': true, 'undef': item.v, 'et': ET_C };
					}
					if (!mod && (sym.isWord || sym.pc>pc)) isWord=true;
					pr=sym.v;
				}
				if (sign) {
					pr=size&(-pr);
					sign=false;
				}
				if (mod) {
					if (mod=='>') {
						pr=(pr>>8)&0xff;
					}
					else {
						pr&=0xff;
					}
					if (modSign) pr=size&(-pr);
					modSign=false;
				}
				if (op=='+') result=size&(result+pr);
				else if (op=='-') result=size&(result-pr);
				else if (op=='*') result=size&(result*pr);
				else if (op=='/') {
					if (pr==0) return { 'v': -1, 'pict': pict, 'error': 'division by zero', 'et': ET_C };
					result=size&(result/pr);
				}
				else {
					result=pr;
				}
				op='';
				break;
			case 'op':
				op=item.v;
				break;
		}
	}
	return { 'v': result, 'pict': pict, 'error': false, 'isWord': isWord, 'pc': pc };
}

function hasZpgMode(opc) {
	var instr=instrtab[opc];
	return instr && (instr[6]>=0 || instr[7]>=0 || instr[8]>=0);
}

function hasWordMode(opc) {
	var instr=instrtab[opc];
	return instr && (instr[3]>=0 || instr[4]>=0 || instr[5]>=0);
}

function symToArgs(sym, ofs) {
	var args=[], chunk;
	for (var i=ofs; i<sym.length; i++) {
		var s=sym[i], quote=false, k=0;
		chunk='';
		while (k<s.length) {
			var c=s.charAt(k++);
			if (c=='"') {
				chunk+='"';
				quote=!quote;
				if (!quote) {
					args.push(chunk);
					chunk='';
				}
			}
			else if (!quote) {
				if (c==' ' || c=='\t') continue;
				if (c==',') {
					if (chunk.length) args.push(chunk);
					if (bbcMode) args.push(',');
					chunk='';
				}
				else {
					chunk+=c;
				}
			}
			else {
				chunk+=c;
			}
		}
		if (chunk.length) args.push(chunk);
	}
	return args;
}

function asmPass() {
	var sym, pict, asm, addrStr, labelStr, srcLnStr,
		headComments=false,
		expressionStartChars = "$%@&'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_*-<>[].",
		labelStartChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_',
		operatorChars = "+-*/",
		asmSpace="           ",
		pass1Spc=asmSpace.substring(6),
		pageHead='',
		pageCnt=1,
		lastDlrPpct=-1,
		repeatInterval,
		repeatSym,
		repeatLine,
		anonMark;

	if (pass==1) anonymousTargets=[];

	function setRepeat(interval, step) {
		repeatSym=[];
		for (var i=0; i<sym.length; i++) repeatSym.push(sym[i]);
		repeatInterval=interval||0;
		repeatStep=step||1;
		repeatCntr=-1,
		repeatLine=rawLine.replace(/^.*?\.REPEAT\s+\S+\s*(STEP\s+\S+\s*)?/i, '');
	}
	function nextSyms() {
		if (repeatInterval>0) {
			if (++repeatCntr>=repeatInterval) {
				repeatInterval=repeatStep=repeatCntr=0;
			}
			else {
				sym=[];
				for (var i=0; i<repeatSym.length; i++) sym.push(repeatSym[i]);
				rawLine=repeatLine;
				return;
			}
		}
		sym=getSym();
	}
	function getAnonymousTarget(targetSym) {
		var offset=0, pict=pass==1? targetSym.charAt(0):'!';
		while (targetSym.charAt(0)=='!' || targetSym.charAt(0)==':') targetSym=targetSym.substring(1);
		for (var i=0; i<targetSym.length; i++) {
			var c=targetSym.charAt(i);
			pict+=c;
			if (c=='+') {
				if (offset<0) return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
				offset++;
			}
			else if (c=='-') {
				if (offset>0) return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
				offset--;
			}
			else {
				return { 'pict': pict, 'error': 'unexpected character in offset operand' };
			}
		}
		if (offset==0) return { 'pict': pict, 'error': 'missing qualifier in offset operand, "+" or "-" expected' };
		if (pass==1) return { 'pict': pict, 'error': false };
		if (anonymousTargets.length==0) return { 'pict': pict, 'error': 'out of range, no anonymous targets defined' };
		var idx = 0;
		while (idx<anonymousTargets.length && anonymousTargets[idx]<=pc) idx++;
		idx--;
		if (offset<0) offset++;
		idx+=offset;
		if (idx<0 || idx>=anonymousTargets.length) {
			return { 'pict': pict, 'error': 'anonymous offset out of range (no such anonymous label)' };
		}
		return { 'pict': pict, 'error': false, 'address': anonymousTargets[idx] };
	}
	function logError(e, message, isWarning) {
		var s,
			lines=message.split('\n'),
			prefix = isWarning? '####  ':'****  ',
			separator = isWarning? ' ## ':' ** ';
		while (addrStr.length<6) addrStr+=' ';
		if (pass==2) {
			s=addrStr+asm;
			if (asm.length<asmSpace.length) s+=asmSpace.substr(asm.length);
		}
		else {
			srcLnStr=''+srcLnNo;
			while (srcLnStr.length<4) srcLnStr=' '+srcLnStr;
			s=srcLnStr+'  '+addrStr+pass1Spc;
		}
		s+= anonMark? anonMark+' ':'  ';
		while (labelStr.length<9) labelStr+=' ';
		s+=labelStr;
		listing+=s+' '+pict;
		if (isWarning && comment) {
			if (pict) listing+=' ';
			listing+= comment;
			comment='';
		}
		listing+='\n'+prefix+e+separator+lines[0]+'\n';
		for (var i=1; i<lines.length; i++) {
			listing+=prefix+lines[i]+'\n';
		}
		if (isWarning) {
			addrStr=asm=pict='';
			labelStr='         ';
		}
		anonMark='';
	}
	function logLine() {
		var s;
		while (addrStr.length<6) addrStr+=' ';
		if (pass==2) {
			s=addrStr+asm;
			if (asm.length<asmSpace.length) s+=asmSpace.substr(asm.length);
		}
		else {
			srcLnStr=''+srcLnNo;
			while (srcLnStr.length<4) srcLnStr=' '+srcLnStr;
			s=srcLnStr+'  '+addrStr+pass1Spc;
		}
		s+= anonMark? anonMark+' ':'  ';
		while (labelStr.length<9) labelStr+=' ';
		s+=labelStr;
		listing+=s+' '+pict;
		if (comment) {
			if (pict) listing+=' ';
			listing+= comment;
			comment='';
		}
		listing+='\n';
		addrStr=asm=pict='';
		labelStr='         ';
		anonMark='';
	}
	function bbcPragmaBlockError(pragma) {
		logError(ET_S,'illegal pragma\nin BBC mode, the directive "'+pragma+'" may be used inside "[...]" blocks only.');
	}
	function getAsmExpression(sym, ofs) {
		var s=sym[ofs];
		while(sym[ofs+1]=='$') s+=(sym[++ofs]||'')+(sym[++ofs]||'');
		var funcRE=/([A-Z]+)\(/, matches=funcRE.exec(s);
		while (matches) {
			var idx=matches.index,
				strIdx=idx+matches[1].length+1,
				s2=s.substring(strIdx);
			if (matches[1]!='ASC' && matches[1]!='LEN') {
				return {'error': 'unsupported function "'+matches[1]+'()"', 'pict': s.substring(0,strIdx), 'et': ET_S };
			}
			var	r = getBBCBasicString(s2, ')');
			if (r.error) return { 'pict': s.substring(0,strIdx)+r.pict, 'error': r.error };
			if (r.length==0) return { 'pict': s.substring(0,strIdx)+r.pict, 'error': 'string expected', 'et': ET_P };
			if (matches[1]=='ASC') {
				if (r.v.length>1) return {'error': 'illegal quantity, string too long', 'pict': s.substring(0,strIdx)+r.v, 'et': ET_P };
				s=s.substring(0,idx)+(r.v.length? r.v.charCodeAt(0)&0xff:0)+s.substring(strIdx+r.idx);
			}
			else if (matches[1]=='LEN') {
				s=s.substring(0,idx)+r.v.length+s.substring(strIdx+r.idx);
			}
			matches=funcRE.exec(s);
		};
		s=s.replace(/\(/g, '[').replace(/\)/g, ']');
		return {'pict':s, 'error': false, 'ofs': ofs};
	}
	function getBBCBasicString(s, stopChar) {
		s=s.replace(/^\s+/, '').replace(/\s+$/,'');
		var pict='', i=0, result='', c, mode=0, max=s.length, hasContent=false, chunk;
		function getArgNum(stopChar) {
			var chunk='', paren=0, quote=false;
			while (i<max) {
				c=s.charAt(i++);
				if (!quote && (c==stopChar && (c!=')' || paren==0))) break;
				if (c=='"') quote=!quote;
				if (quote || (c!=' ' && c!='\t')) chunk+=c;
				if (!quote) {
					if (c=='(') paren++;
					else if (c==')') paren--;
				}
			}
			if (c!=stopChar) return { 'pict': pict+chunk+c, 'v': result, 'error': '"'+stopChar+'" expected', 'et': ET_S};
			if (!chunk) return { 'pict': pict+stopChar, 'v': result, 'error': 'expression expected', 'et': ET_P};
			return { 'v': chunk, 'error': false }
		}
		while (i<max) {
			c=s.charAt(i++);
			pict+=c;
			if (mode==0) {
				if (c=='"') {
					mode=1;
					continue;
				}
				else if (c=='$') {
					chunk='';
					while (i<max) {
						c=s.charAt(i++);
						pict+=c;
						if ((c<'A' || c>'Z') && c!='%') break;
						chunk+=c;
					}
					if (chunk=='P%') {
						var l=lastDlrPpct-pc;
						if (l>0) {
							for (var a=pc; a<lastDlrPpct; a++) result+=String.fromCharCode(code[a]);
						}
						hasContent=true;
						mode=2;
					}
					else return { 'pict': pict, 'v': result, 'error': 'illegal identifier "'+chunk+'"', 'et': ET_P};
				}
				else if ('&0123456789%@'.indexOf(c)>=0) {
					return { 'pict': pict, 'v': result, 'error': 'type mismatch', 'et': ET_P};
				}
				else if (c>='A' && c<='Z') {
					chunk=c;
					while (i<max) {
						c=s.charAt(i++);
						if ((c<'A' || c>'Z') && c!='$') break;
						pict+=c;
						chunk+=c;
					}
					if (c=='(') {
						chunk+=c;
						pict+=c;
						//if (i<max) i++;
					}
					if (chunk=='CHR$(') {
						var r=getArgNum(')');
						if (r.error) return r;
						r=getAsmExpression([r.v],0);
						if (r.error) return { 'pict': pict+r.pict, 'v': result, 'error': r.error, 'et': e.et};
						r=getExpression(r.pict, pc);
						if (r.error || r.undef) return { 'pict': pict+r.pict, 'v': result, 'error': r.error, 'et': r.et};
						pict+=r.pict+')';
						result+=String.fromCharCode(r.v&0xff);
						hasContent=true;
						mode=2;
						if (i<max && (/^\s*[+-\/\*]\s*[&0123456789%@\(]/).test(s.substring(i))) break;
						continue;
					}
					else if (chunk=='STRING$(') {
						var r=getArgNum(',');
						if (r.error) return r;
						r=getAsmExpression([r.v],0);
						if (r.error) return { 'pict': pict+r.pict, 'v': result, 'error': r.error, 'et': r.et};
						var rv=getExpression(r.pict, pc);
						if (rv.error || rv.undef) {
							return { 'pict': pict+rv.pict, 'v': result, 'error': r.error, 'et': r.et};
						}
						if (pass==2 && rv.v<0) return { 'pict': pict+rv.v, 'v': result, 'error': 'illegal quantity', 'et': ET_P};
						pict+=rv.pict+',';
						var rs=getBBCBasicString(s.substring(i), ')');
						if (rs.error) {
							return { 'pict': pict+rs.pict, 'v': result, 'error': rs.error, 'et': rs.et};
						}
						pict+=rs.pict;
						for (var k=0, kn = Math.min(rv.v,0xff); k<kn; k++) result+=rs.v;
						i+=rs.idx;
						hasContent=true;
						mode=2;
						if (i<max && (/^\s*[+-\/\*]\s*[&0123456789%@\(]/).test(s.substring(i))) break;
						continue;
					}
					else if (c=='(') {
						return { 'pict': pict, 'v': result, 'error': 'unsupported function "'+chunk+')"', 'et': ET_S};
					}
					else {
						return { 'pict': pict, 'v': result, 'error': 'unrecognized token "'+chunk+'"', 'et': ET_P};
					}
				}
				else if (c!=' ' && c!='\t') {
					return { 'pict': pict, 'v': result, 'error': 'illegal character, quote or identifier expected', 'et': ET_P};
				}
			}
			else if (mode==1) {
				if (c=='"') {
					hasContent=true;
					mode=2;
					continue;
				}
				if (c.charCodeAt(0)>255 )return { 'pict': pict, 'v': result, 'error': 'illegal character', 'et': ET_P};
				result+=c;
			}
			if (mode==2 && i<max) {
				if (stopChar && c==stopChar) break;
				if (c=='+') {
					mode=0;
				}
				else if (c!=' ' && c!='\t') {
					return { 'pict': pict, 'v': result, 'error': 'illegal character, "+" expected.', 'et': ET_P};
				}
			}
		}
		if (mode==0 && hasContent) return { 'pict': pict, 'v': result, 'error': 'string expected', 'et': ET_P };
		if (mode==1) return { 'pict': pict, 'v': result, 'error': 'quote expected', 'et': ET_S };
		return { 'pict': pict, 'v': result,'error': false, 'idx': i };
	}

	continueInLine=bbcBlock=convertPi=false;
	srcl=srcc=pc=srcLnNo=0;
	isHead=true;
	sym=getSym();
	labelStr='         ';
	anonMark='';
	repeatCntr=repeatStep=repeatInterval=0;

	while (sym) {
		addrStr=pict=asm='';
		if (sym.length==0) {
			if (comment) {
				if (isHead) {
					if (pass==1) {
						srcLnStr=''+srcLnNo;
						while (srcLnStr.length<4) srcLnStr=' '+srcLnStr;
						listing+=srcLnStr+'               '+comment+'\n';
					}
					else {
						listing+='                   '+comment+'\n';
					}
					if (!pageHead) pageHead=comment;
					headComments=true;
				}
				else logLine();
				comment='';
			}
			nextSyms();
			continue;
		}
		if (isHead) {
			if (headComments) listing+='\n';
			isHead=false;
		}
		if (bbcMode && !bbcBlock && bbcBasicIgnored.indexOf(sym[0])>=0) {
			pict=sym[0];
			if (sym[0]=='FOR' && sym[1]) {
				var r=getIdentifier(sym[1],0);
				if (r.v) {
					pict+=' '+r.v;
					/*
					if (!redefSyms && pass==1 && symtab[r.v]) {
						logError(ET_P, 'symbol already defined');
						return false;
					}
					*/
					symtab[r.v]={ 'v': 0, 'isWord': false, 'pc': pc }
				}
			}
			if (pass==1) {
				pict+=' (ignored)';
				logLine();
			}
			nextSyms();
			continue;
		}
		if (bbcMode && sym[0]=='REM') {
			if (pass==1) {
				pict='REM';
				if (!bbcBlock) {
					if (sym[1]) pict+=' \''+sym[1].replace(/'/g, '\\\'')+'\'';
					if (pass==1) logLine();
				}
				else {
					logError(ET_S,'REM inside assembler block\nuse "\\" for comments in assembler mode.');
					return false;
				}
			}
			nextSyms();
			continue;
		}
		pc&=0xffff;
		var ofs=0,
			c0=sym[0].charAt(0),
			v,
			pragma = '';

		if (bbcMode) {
			if (labelStartChars.indexOf(c0)>=0 || sym[0]=='[' || sym[0]==']') pragma=sym[0];

			// BBC BASIC indirection
			if (!bbcBlock && (c0=='?' || c0=='!' || c0=='$' || (pragma && sym.length>1 && (sym[1]=='?' || sym[1]=='!')))) {
				var baseAddress=0;
				if (pragma) {
					if (pragma=='P%') {
						baseAddress=pc;
					}
					else {
						var r=getIdentifier(pragma,0),
							ident=r.v,
							symbl = symtab[ident];
						pict=(pass==1)? pragma:ident;
						if (!symbl) {
							logError(ET_P,'undefined symbol "'+ident+'"');
							return false;
						}
						baseAddress=symbl.v;
					}
					sym.shift();
					baseAddress=pc;
				}
				pict+=sym[0];
				if (sym.length>1) {
					ofs=1;
					var asmExpr=getAsmExpression(sym, ofs);
					if (asmExpr.error) {
						pict+=asmExpr.pict;
						logError(asmExpr.et||ET_P, asmExpr.error);
						return false;
					}
					ofs=asmExpr.ofs;
					var expr=asmExpr.pict,
						ra=getExpression(expr,pc),
						isP=expr=='P%';
					if (ra.error || ra.undef) {
						pict+=ra.pict;
						logError(ra.et||ET_P, ra.error || 'undefined symbol "'+ra.undef+'"');
						return false;
					}
					pict+=asmExpr.pict;
					ofs++;
					if (sym.length>ofs && (sym[ofs]=='=' || (!bbcMode && sym[ofs]=='EQU'))) {
						pict+=' = ';
						ofs++;
						if (sym.length>ofs) {
							var vi, values=[];
							if (sym[0]=='?' || sym[0]=='!') {
								var asmExpr=getAsmExpression(sym, ofs);
								if (asmExpr.error) {
									pict+=asmExpr.pict;
									logError(asmExpr.et||ET_P, asmExpr.error);
									return false;
								}
								ofs=asmExpr.ofs;
								var expr=asmExpr.pict,
									rv=getExpression(expr,pc,sym[0]=='!');
								pict+=rv.pict;
								if (rv.error || rv.undef) {
									logError(rv.et||ET_P, rv.error || 'undefined symbol "'+rv.undef+'"');
									return false;
								}
							}
							else if (sym[0]=='$') {
								var strExpr=getBBCBasicString(rawLine.replace(/^.*?=\s*/,'')),
									str=strExpr.v;
								pict+=strExpr.pict;
								if (strExpr.error) {
									logError(strExpr.et||ET_P,strExpr.error);
									return false;
								}
								if (!str) {
									logError(ET_P,'string expected');
									return false;
								}
								if (isP) lastDlrPpct=pc;
								for (var vi=0; vi<str.length; vi++) {
									var v=str.charCodeAt(vi);
									if (v==0xA3) v=0x60; //£
									if (isP) lastDlrPpct++;
									if (pass==2) values.push(v);
								}
								ofs=sym.length;
							}
							if (sym.length>ofs+1) {
								pict+=' '+sym[ofs+1].charAt(0);
								logError(ET_S,'unexpected extra character');
								return false;
							}
							if (pass==2) {
								if (sym[0]=='?') {
									values.push(rv.v&0xff);
								}
								else if (sym[0]=='!') {
									for (vi=0; vi<4; vi++) values.push((rv.v>>(vi*8))&0xff);
								}
								for (vi=0; vi<values.length; vi++) {
									var a=(baseAddress+ra.v+vi)&0xffff, b=values[vi];
									if (a<codeStart) codeStart=a;
									if (a>codeEnd) codeEnd=a;
									compile(a, b);
									asm=getHexByte(b);
									addrStr=getHexWord(a);
									pict='?(&'+addrStr+') = &'+asm;
									if (sym[0]=='$') pict+=' \\"'+(b==0x60? '£':String.fromCharCode(b))+'"';
									logLine();
								}
							}
							else {
								logLine();
							}
							nextSyms();
							continue;
						}
						else {
							logError(ET_S, sym[0]=='$'? 'string expected':'expression expected');
							return false;
						}
					}
					else {
						if (sym[2]) pict+=' '+sym[2].charAt(0);
						logError(ET_S, 'assignment expected');
						return false;
					}
				}
				else {
					logError(ET_S, 'expression expected');
					return false;
				}
			}
			else {
				if (pragma && pragma.charAt(pragma.length-1)=='%' && pragma!='P%') pragma=='';
			}
		}
		else {
			if (c0=='.') {
				pict+='.';
				pragma=sym[0].substr(1);
				if (!pragma) {
					logError(ET_S,'pragma expected');
					return false;
				}
			}
			else if (sym[0]=='*' || sym[0]=='P%') {
				pragma=sym[0];
			}
			else if (code.length==0 && sym[0]=='PROCESSOR' && (sym[1]=='6502' || sym[1]=='6510')) {
				pict=sym.join(' ');
				asm='-IGNORED';
				logLine();
				nextSyms();
				continue;
			}
			if (pragma=='PETSTART' || pragma=='C64START') {
				if (code.length) {
					logError(ET_C, '".'+pragma+'" must be the first instruction.');
					return false;
				}
				var basicLineNo='',
					remText='',
					lineLengthMax=88,
					lineNumberMax='63999',
					basicAddr=pragma=='PETSTART'? 0x0401:0x0801,
					rem=[],
					linkAddr,
					ofs=1;
				pc=basicAddr;
				addrStr=getHexWord(pc);
				pict='.'+pragma;
				if (sym[1] && (/^[0-9]+$/).test(sym[1])) {
					basicLineNo=sym[1];
					ofs++;
					pict+=' '+basicLineNo;
				}
				if (sym[ofs] && sym[ofs].charAt(0)!='"') {
					pict+=' '+sym[ofs].charAt(0);
					logError(ET_S, basicLineNo? 'string expected':'line number or string expected');
					return false;
				}
				while (sym[ofs]) {
					remText+=sym[ofs++].replace(/^"/,'').replace(/"\s*,?$/,'').replace(/","/g, '\\n');
					if (sym[ofs]==',') ofs++;
					if (sym[ofs]) {
						sym[ofs]=sym[ofs].replace(/^,\s*/,'');
						if (sym[ofs].charAt(0)!='"') {
							pict+=' "'+remText.replace(/\\n/g, '", "')+'", '+sym[ofs].charAt(0);
							logError(ET_S,'string expected');
							return false;
						}
						remText+='\\n';
					}
				}
				if (!basicLineNo || basicLineNo>lineNumberMax) basicLineNo=''+(new Date()).getFullYear();
				if (remText) {
					pict+=' "';
					var cnt=0, t=[];
					for (var i=0; i<remText.length; i++) {
						var c=remText.charAt(i), cc=remText.charCodeAt(i);
						pict+=c;
						if (cc==0x03C0) cc=0xff; //pi
						if (cc>0xff) {
							logError(ET_P, 'illegal character');
							return false;
						}
						if (c=='\\' && remText.charAt(i+1)=='n') {
							pict+='n';
							i++;
							cnt=0;
							rem.push(t);
							t=[];
							continue;
						}
						if (++cnt>80) {
							logError(ET_C, 'REM line too long (80 characters max.)');
							return false;
						}
						t.push(encodePetscii(cc));
					}
					if (t.length) rem.push(t);
					pict+='"';
					if (parseInt(basicLineNo,10)<rem.length) basicLineNo=''+rem.length;
				}
				logLine();
				if (pass==2) listing+='>>>>  COMPILING BASIC PREAMBLE...\n';
				if (rem.length) {
					for (var ln=0; ln<rem.length; ln++) {
						var remLine=rem[ln];
						linkAddr=pc+7+remLine.length;
						if (pass==2) {
							var linkLo=linkAddr&0xff,
								linkHi=linkAddr>>8
								lnLo=ln&0xff,
								lnHi=ln>>8,
							addrStr=getHexWord(pc);
							compile(pc++, linkLo);
							compile(pc++, linkHi);
							asm=getHexByte(linkLo)+' '+getHexByte(linkHi);
							pict='$'+getHexWord(linkAddr)+' ;LINE LINK';
							logLine();
							addrStr=getHexWord(pc);
							compile(pc++, lnLo);
							compile(pc++, lnHi);
							asm=getHexByte(lnLo)+' '+getHexByte(lnHi);
							pict='$'+getHexWord(ln)+' ;LINE NO. ("'+ln+'")';
							logLine();
							addrStr=getHexWord(pc);
							compile(pc++, 0x8f);
							compile(pc++, 0x20);
							asm='8F 20';
							pict=';"REM "';
							logLine();
							addrStr=getHexWord(pc);
							asm='';
							pict=';';
							for (var i=0; i<remLine.length; i++) {
								compile(pc++, remLine[i]);
								asm+=(asm? ' ':'')+getHexByte(remLine[i]);
								pict+='.'
								if ((i+1)%3==0) {
									logLine();
									addrStr=getHexWord(pc);
									asm='';
									pict=';';
								}
							}
							if (asm) logLine();
							addrStr=getHexWord(pc);
							compile(pc++, 0);
							asm='00';
							pict='$00   ;EOL';
							logLine();
						}
						pc=linkAddr;
					}
				}
				addrStr=getHexWord(pc);
				linkAddr=pc+11;
				cbmStartAddr=linkAddr+2;
				if (pass==2) {
					var linkLo=linkAddr&0xff,
						linkHi=linkAddr>>8,
						ln=parseInt(basicLineNo,10),
						lnLo=ln&0xff,
						lnHi=ln>>8,
						saStr=''+cbmStartAddr;
					addrStr=getHexWord(pc);
					compile(pc++, linkLo);
					compile(pc++, linkHi);
					asm=getHexByte(linkLo)+' '+getHexByte(linkHi);
					pict='$'+getHexWord(linkAddr)+' ;LINE LINK';
					logLine();
					addrStr=getHexWord(pc);
					compile(pc++, lnLo);
					compile(pc++, lnHi);
					asm=getHexByte(lnLo)+' '+getHexByte(lnHi);
					pict='$'+getHexWord(ln)+' ;LINE NO. ("'+basicLineNo+'")';
					logLine();
					addrStr=getHexWord(pc);
					compile(pc++, 0x9e);
					compile(pc++, 0x20);
					asm='9E 20';
					pict=';"SYS "';
					logLine();
					addrStr=getHexWord(pc);
					asm='';
					pict=';TEXT "';
					for (var i=0, max=saStr.length-1; i<=max; i++) {
						var c=saStr.charAt(i), cc=saStr.charCodeAt(i);
						compile(pc++, cc);
						asm+=(asm? ' ':'')+getHexByte(cc);
						pict+=c;
						if ((i+1)%3==0) {
							if (i==max) pict+='"';
							logLine();
							addrStr=getHexWord(pc);
							asm='';
							pict=';TEXT "';
						}
					}
					if (asm) {
						pict+='"';
						logLine();
					}
					addrStr=getHexWord(pc);
					compile(pc++, 0);
					asm='00';
					pict='$00   ;EOL';
					logLine();
					addrStr=getHexWord(pc);
					compile(pc++, 0);
					compile(pc++, 0);
					asm='00 00';
					pict='$0000 ;END OF BASIC TEXT (EMPTY LINK)';
					logLine();
				}
				pc=cbmStartAddr;
				if (pass==2) listing+='>>>>  START OF ASSEMBLY AT $'+getHexWord(pc)+' ("SYS '+cbmStartAddr+'")\n';
				nextSyms();
				continue;
			}
		}

		if ((!bbcMode && (pragma=='*' || pragma=='ORG' || pragma=='RORG')) || pragma=='P%') {
			// set pc
			pict=(pragma=='ORG' || pragma=='RORG'? '.':'')+pragma;
			var assignmentRequired = (pragma=='*' || pragma=='P%');
			ofs=1;
			if (sym.length>1 && (sym[1]=='=' || (!bbcMode && sym[1]=='EQU'))) {
				pict+=' '+sym[1];
				ofs++;
			}
			else if (assignmentRequired) {
				if (sym.length>1) pict+=' '+sym[1].charAt(0);
				logError(ET_S, 'assignment expected');
				return false;
			}
			if (sym.length<=ofs) {
				logError(ET_S, 'expression expected');
				return false;
			}
			pict+=' ';
			var expr=sym[ofs];
			if (bbcMode) {
				var asmExpr=getAsmExpression(sym, ofs);
				if (asmExpr.error) {
					pict+=asmExpr.pict;
					logError(asmExpr.et||ET_P, asmExpr.error);
					return false;
				}
				ofs=asmExpr.ofs;
				expr=asmExpr.pict;
			}
			var r=getExpression(expr, pc), fillbyte=-1;
			pict+=r.pict;
			if (r.undef) { logError(r.et||ET_P, 'undefined symbol "'+r.undef+'"'); return false; }
			if (r.error) { logError(r.et||ET_P, r.error); return false; }
			if (sym.length > ofs+1) {
				var flbr=getExpression(sym[++ofs], pc);
				pict+=' '+flbr.pict;
				if (flbr.error) { logError(flbr.et||ET_P, flbr.error); return false; }
				fillbyte=flbr.v&0xff;
			}
			if (sym.length > ofs+1) {
				pict+=' '+sym[ofs+1].charAt(0);
				logError(ET_S, 'unexpected extra characters'); return false;
			}
			addrStr=getHexWord(r.v);
			if (pass==2) {
				if (r.error) { logError(r.et||'error', r.error); return false; }
				pict=pcSymbol+' = '+hexPrefix+addrStr;
				if (fillbyte>=0) pict+=' '+hexPrefix+getHexByte(fillbyte);
				asm=asmSpace;
				if (fillbyte>=0) fill(r.v, pc, fillbyte);
			}
			pc=r.v;
			if (bbcBlock && pragma=='P%' && pass==1) {
				logError('warning','assignment to P% inside assembler block', true);
			}
			else {
				logLine();
			}
			nextSyms();
			continue;
		}

		if (pragma) {
			if (pragma=='END') {
				if (bbcBlock && pass==1) logError('warning','unclosed assembler block', true);
				pict+=pragma;
				logLine();
				return true;
			}
			if (bbcMode && pragma==']') {
				if (pass==1) {
					pict+=pragma;
				}
				if (bbcBlock) {
					bbcBlock=false;
					if (pass==1) logLine();
					sym.shift();
					if (sym.length==0) nextSyms();
					continue;
				}
				else {
					logError(ET_S, 'illegal character, not inside assembly block');
					return false;
				}
			}
			else if (bbcMode && pragma=='[') {
				if (pass==1) {
					pict+=pragma;
				}
				if (bbcBlock) {
					logError(ET_S, 'illegal character, already inside assembly block');
					return false;
				}
				bbcBlock=true;
				if (pass==1) logLine();
				sym.shift();
				if (sym.length==0) nextSyms();
				continue;
			}
			else if (pragma=='OPT') {
				pict+='OPT';
				if (sym.length >= 2) {
					var opt=sym[1];
					pict+=' '+opt;
					if (opt=='ZPGA' || opt=='ZPA' || opt=='ZPG') {
						optAutoZpg=true;
						asm='-AUTO-ZPG ON';
					}
					else if (opt=='WORDA') {
						optAutoZpg=false;
						asm='-AUTO-ZPG OFF';
					}
					else if (opt=='PETSCII' || opt=='PETSCI') {
						charEncoding=encodePetscii;
						convertPi=true;
						asm='-ENC. PETSCII';
					}
					else if (opt=='ASCII') {
						charEncoding=encodeAscii;
						convertPi=false;
						asm='-ENC. ASCII';
					}
					else if (opt=='PETSCR' || opt=='C64SCR') {
						charEncoding=encodeCommodoreScreenCode;
						convertPi=true;
						asm='-ENC. '+opt;
					}
					else if (
						opt=='ILLEGALS' || opt=='NOILLEGALS' || opt=='NOILLEGA' ||
						opt=='LEGALS' || opt=='LEGALSONLY' || opt=='LEGALSON'
					) {
						useIllegals=opt=='ILLEGALS';
						instrtab = useIllegals? instrAll:instrLegals;
						asm='-ILLEGALS '+(useIllegals? 'ON':'OFF');
					}
					else if (opt=='REDEF' || opt=='NOREDEF') {
						redefSyms=opt=='REDEF';
						asm='-REDEF SYMBOLS '+(redefSyms? 'ON':'OFF');
					}
					else if (
						opt=='XREF' || opt=='NOXREF' ||
						opt=='COUNT' || opt=='NOCOUNT' ||
						opt=='CNT' || opt=='NOCNT' ||
						opt=='LIST' || opt=='NOLIST' ||
						opt=='MEMORY' || opt=='NOMEMORY' ||
						opt=='GENERATE' || opt=='NOGENERATE' || opt=='NOGENERA'
					) {
						// MOS cross-assembler directives
						asm='-IGNORED';
					}
					else {
						if (bbcBlock) {
							var r=getExpression(opt, pc);
							if (!r.error && r.v>=0) {
								if (pass==1) {
									logError('warning', 'reporting levels not implemented', true);
								}
								else {
									asm='-IGNORED';
									if (pass==2) comment='';
									logLine();
								}
								nextSyms();
								continue;
							}
						}
						logError(ET_S, 'invalid option');
						return false;
					}
					if (sym.length > 2) {
						pict+=' '+sym[2].charAt(0);
						logError(ET_S, 'unexpected extra characters');
						return false;
					}
					if (bbcMode && !bbcBlock && pass==1) {
						logError('warning', 'option outside assembler block', true);
					}
					else {
						logLine();
					}
				}
				else {
					logError(ET_S, 'option expected');
					return false;
				}
				nextSyms();
				continue;
			}
			else if (
				(!bbcMode && (
					pragma=='WORD' || pragma=='DBYTE' || pragma=='DBYT' ||
				( (pragma=='BYTE' || pragma=='BYT' || pragma=='DB') && sym.length>=2 && sym[1].charAt(0)!='"' ))) ||
				(bbcMode && (pragma=='EQUB' || pragma=='EQUW' || pragma=='EQUD'))
			) {
				if (bbcMode && !bbcBlock) {
					pict+=pragma;
					bbcPragmaBlockError(pragma);
					return false;
				}
				if (sym.length>=2) {
					var isFirst=true;
					var args=symToArgs(sym,1);
					for (var j=0; j<args.length; j++) {
						var arg=args[j];
						if (!arg) continue;
						if (isFirst) isFirst=false;
						v=0;
						addrStr=getHexWord(pc);
						pict=(bbcMode? '':'.')+pragma+' ';
						var a1=arg.charAt(0);
						if (a1=='#') {
							// ignore literal value prefix
							pict+='#';
							arg=arg.substr(1);
							a1=arg.charAt(0);
						}
						if ((!bbcMode && arg=='*') || arg=='P%') {
							pict+=arg;
							v=pc;
						}
						if (arg) {
							var r=getExpression(arg, pc, pragma=='EQUD');
							pict+=r.pict;
							if (r.error) {
								logError(r.et||ET_P, r.error);
								return false;
							}
							v=r.v;
						}
						if (pass==2) {
							v&=(pragma=='EQUD')? 0xffffffff:0xffff;
							var lb=(v>>8)&0xff;
							var rb=v&0xff;
							if (pragma=='WORD' || pragma=='EQUW') { // little endian
								compile(pc, rb);
								compile(pc+1, lb);
								asm=getHexByte(rb)+' '+getHexByte(lb);
								pict=(bbcMode? 'WORD':'.EQUW')+' '+hexPrefix+getHexWord(v);
							}
							else if (pragma=='DBYTE' || pragma=='DBYT') { // big endian
								compile(pc, lb);
								compile(pc+1, rb);
								asm=getHexByte(lb)+' '+getHexByte(rb);
								pict=(bbcMode? '':'.')+'DBYTE '+hexPrefix+getHexWord(v);
							}
							else if (pragma=='EQUD') { // 4 bytes
								var b0=(v>>24)&0xff, b1=(v>>16)&0xff;
								compile(pc, b0);
								compile(pc+1, b1);
								asm=getHexByte(b0)+' '+getHexByte(b1);
								pict='EQUD &'+getHexByte(b0)+getHexByte(b1)+getHexByte(lb)+getHexByte(rb);
								logLine();
								pc+=2;
								addrStr=getHexWord(pc);
								compile(pc, lb);
								compile(pc+1, rb);
								asm=getHexByte(lb)+' '+getHexByte(rb);
								pict='';
							}
							else { // single byte
								compile(pc, rb);
								asm=getHexByte(rb);
								pict=(bbcMode? 'EQUB':'.BYTE')+' '+hexPrefix+getHexByte(rb);
							}
						}
						logLine();
						pc+=(pragma=='BYTE' || pragma=='BYT' || pragma=='DB' || pragma=='EQUB')? 1:2;
						if (bbcMode && j+1<args.length) {
							arg=args[++j];
							if (arg!=',') {
								pict+=arg;
								logError(ET_S,'"," expected');
								return false;
							}
						}
					}
					nextSyms();
					continue;
				}
				else if (sym.length==1) {
					addrStr=getHexWord(pc);
					pict+=pragma;
					logError(ET_S,'expression expected');
					return false;
				}
			}
			else if ((pragma=='BYTE' || pragma=='BYT' || pragma=='DB') && sym.length==1) {
				addrStr=getHexWord(pc);
				pict+=pragma;
				logError(ET_S,'expression expected');
				return false;
			}
			else if (
				(!bbcMode && (
					pragma=='TEXT' || pragma=='ASCII' ||
					pragma=='PETSCII' ||
					pragma=='PETSCR' || pragma=='C64SCR' ||
					pragma=='BYTE' || pragma=='BYT' || pragma=='DB'
				)) || (bbcMode && pragma=='EQUS')
			) {
				if (bbcMode && !bbcBlock) {
					pict+=pragma;
					bbcPragmaBlockError(pragma);
					return false;
				}
				var cbBuffer=[],
					enc,
					convertPiLocal,
					re= bbcMode? new RegExp('^\\s*'+pragma+'\\s*(.*?)\\s*$', 'i'): new RegExp('^\\s*\\.'+pragma+'\\s*(.*?)\\s*$', 'i'),
					matches=rawLine.match(re),
					txt;
				if (pass==2) {
					if (pragma=='ASCII' || pragma=='EQUS') {
						enc=encodeAscii;
						convertPiLocal=false;
					}
					else if (pragma=='PETSCII') {
						enc=encodePetscii;
						convertPiLocal=true;
					}
					else if (pragma=='PETSCR' || pragma=='C64SCR') {
						enc=encodeCommodoreScreenCode;
						convertPiLocal=true;
					}
					else {
						enc=charEncoding;
						convertPiLocal=convertPi;
					}
					if (pragma=='BYT') pragma='BYTE';
					if (pragma=='DB') pragma='BYTE';
				}
				addrStr=getHexWord(pc);
				pict+=pragma+' ';
				if (bbcMode) {
					var rt=getBBCBasicString(matches[1]);
					if (rt.error) {
						pict+=rt.pict;
						logError(rt.et||ET_P, rt.error);
						return false;
					}
					txt=rt.v;
				}
				else {
					if (!matches || matches[1].charAt(0)!='"') {
						logError(ET_S,'quote expected');
						return false;
					}
					txt=matches[1].substring(1);
				}
				pict+='"';
				for (var i=0, tmax=txt.length-1; i<=tmax; i++) {
					var c=txt.charAt(i), cc=c.charCodeAt(0);
					if (bbcMode && cc==0xA3) cc=0x60; //£
					else if (convertPiLocal && v==0x03C0) v=0xff; //CBM pi
					if (!bbcMode && c=='"') {
						if (i!=tmax) {
							pict+=txt.substring(i+1).replace(/^(\s)?\s*(.).*/,'$1"$2');
							logError(ET_S,'unexpected extra character');
							return false;
						}
						break;
					}
					if (bbcMode && c=='"') pict+='\\';
					pict+=c;
					if (cc>0xff) {
						logError(ET_P, 'illegal character');
						return false;
					}
					if (pass==2) {
						cc=enc(cc);
						cbBuffer.push(getHexByte(cc));
						compile(pc, cc);
						if (cbBuffer.length==3) {
							asm=cbBuffer.join(' ');
							cbBuffer.length=0;
							if (i==tmax-1 && txt.charAt(tmax)=='"') pict+='"';
							logLine();
							addrStr=getHexWord(pc);
							pict+=(bbcMode? '':'.')+pragma+' "';
						}
					}
					else if (i%40==39) {
						logLine();
						addrStr=getHexWord(pc);
						pict+=(bbcMode? '':'.')+pragma+' "';
					}
					pc++;
				}
				pict+='"';
				if (pass==1 && i%40!=39) logLine();
				if (pass==2 && cbBuffer.length) {
					asm=cbBuffer.join(' ');
					logLine();
				}
				nextSyms();
				continue;
			}
			else if (pragma=='ALIGN' || (pragma=='FILL' && !bbcMode)) {
				var pcOffset=bbcMode? 4:2,
					fillbyte=bbcMode? 0xff:0,
					delta;
				pict+=pragma;
				if (!bbcMode && sym.length>ofs+1) {
					pict+=' ';
					var r=getExpression(sym[++ofs], pc);
					if (r.error) {
						pict+=r.pict;
						logError(r.et||ET_P, r.error);
						return false;
					}
					pcOffset=r.v&0xffff;
					pict+=pass==1?r.pict:hexPrefix+(r.v<0x100? getHexByte(pcOffset):getHexWord(pcOffset));
					if (sym.length>ofs+1) { // fill-byte
						pict+=' ';
						var r=getExpression(sym[++ofs], pc);
						if (r.error) {
							pict+=r.pict;
							logError(r.et||ET_P, r.error);
							return false;
						}
						fillbyte=r.v&0xff;
						pict+=pass==1?r.pict:hexPrefix+getHexByte(fillbyte);
					}
				}
				else if (pragma=='FILL') {
					logError(ET_S,'expression expected');
					return false;
				}
				if (sym.length > ofs+1) {
					pict+=' '+sym[ofs+1].charAt(0);
					logError(ET_S, 'unexpected extra characters');
					return false;
				}
				else if (pragma=='FILL') {
					if (pcOffset<0) {
						logError(ET_C, 'negative offset value');
						return false;
					}
					delta=pcOffset;
				}
				else {
					delta=pcOffset-(pc%pcOffset);
				}
				if (delta) {
					var pc1=pc+delta;
					if (pass==2) {
						if (codeStart>=0x10000) codeStart=pc;
						fill(pc1, pc, fillbyte);
					}
					pc=pc1;
				}
				addrStr=getHexWord(pc);
				logLine();
				nextSyms();
				continue;
			}
			else if (!bbcMode && pragma=='REPEAT') {
				pict+=pragma;
				if (repeatInterval>0) {
					logError(ET_P,'already repeating');
					return false;
				}
				var interval=0, step=1;
				sym.shift();
				var temp=sym.shift();
				if (!temp) {
					logError(ET_S,'expression expected');
					return false;
				}
				pict+=' ';
				var rt=getExpression(temp, pc);
				if (rt.error || rt.undef) {
					pict+=rt.pict;
					if (rt.undef) logError(ET_P, 'undefined symbol "'+rt.undef+'"');
					else logError(rt.et||ET_P, rt.error);
					return false;
				}
				if (rt.v<0) {
					pict+=temp;
					logError(ET_C, 'illegal interval (n<0)');
					return false;
				}
				if (pass==1) pict+=temp;
				else pict+=' '+hexPrefix+(rt.v<0x100? getHexByte(rt.v):getHexWord(rt.v));
				interval=temp;
				if (sym[0]=='STEP') {
					pict+=' STEP';
					sym.shift();
					temp=sym.shift();
					if (!temp) {
						logError(ET_S,'expression expected');
						return false;
					}
					pict+=' ';
					rt=getExpression(temp, pc);
					if (rt.error || rt.undef) {
						pict+=rt.pict;
						if (rt.undef) logError(ET_P, 'undefined symbol "'+rt.undef+'"');
						else logError(rt.et||ET_P, rt.error);
						return false;
					}
					if (rt.v<1) {
						pict+=temp;
						logError(ET_C, 'illegal step increment (n<1)');
						return false;
					}
					if (pass==1) pict+=temp;
					else pict+=' '+hexPrefix+(rt.v<0x100? getHexByte(rt.v):getHexWord(rt.v));
					step=temp;
				}
				if (sym.length==0) {
					if (pass==1) logError('warning', 'nothing to repeat', true);
				}
				else {
					logLine();
					setRepeat(interval, step);
				}
				nextSyms();
				continue;
			}
			else if (pragma=='SKIP' || pragma=='PAGE') {
				if (bbcMode && !bbcBlock) {
					pict+=pragma;
					bbcPragmaBlockError(pragma);
					return false;
				}
				if (pass==1) {
					pict+=pragma;
					logLine();
				}
				else {
					if (comment) logLine();
					else listing+='\n';
					if (pragma=='PAGE') {
						listing+='                   '+(pageHead||commentChar+'page')+'  ';
						listing+='('+(++pageCnt)+')\n\n';
					}
				}
				nextSyms();
				continue;
			}
			else if (!bbcMode && pragma=='DATA') {
				if (pass==1) {
					pict+=sym.join(' ');
					labelStr='-ignored';
					logLine();
				}
				nextSyms();
				continue;
			}
			else if (bbcMode) {
				pict+=addrStr='';
				ofs=0;
			}
			else {
				pict+=pragma;
				logError(ET_S,'invalid pragma');
				return false;
			}
		}

		if (!bbcMode && (c0=='!' || c0==':')) {
			addrStr=getHexWord(pc);
			if (sym[ofs].length>1) {
				labelStr=(pass==1? c0:'!')+sym[ofs].charAt(1);
				logError(ET_S,'illegal character adjacent to anonymous label');
				return false;
			}
			anonMark=(pass==1? c0:'!');
			if (pass==1) anonymousTargets.push(pc);
			ofs++;
			if (sym.length>ofs) {
				c0=sym[ofs].charAt(0);
			}
			else {
				logLine();
				nextSyms();
				continue;
			}
		}
		if ((c0<'A' || c0>'Z') && c0!='_' && (bbcMode && c0!='.')) {
			pict+=c0;
			logError(ET_S,'character expected');
			return false;
		}

		var identRaw, identCooked, labelPrefix='';
		if (bbcMode && (sym.length-ofs<2 || sym[ofs+1].charAt(0)!='=')) {
			if (c0=='.') {
				identRaw=sym[ofs].substr(1);
				labelPrefix='.';
				if (!identRaw) {
					pict+='.';
					logError(ET_S, 'name character expected');
					return false;
				}
			}
			else identRaw='';
		}
		else identRaw = sym[ofs];

		identCooked = identRaw.indexOf('.')>0? identRaw.split('.')[0]:identRaw;
		if (identCooked && instrtab[identCooked]==null) {
			// identifier
			var r=getIdentifier(identRaw, 0, true),
				ident=r.v;
			if (pass==1) {
				if (r.idx!=identRaw.length) {
					var parsed=identRaw.substring(0,r.idx),
						illegalChar=identRaw.charAt(r.idx),
						message = 'illegal character "'+illegalChar+'"';
					pict+=labelPrefix+parsed+illegalChar;
					if (parsed=='P' && illegalChar=='%') message+='\n\nmeant assignment to P%?';
					logError(ET_P,message);
					return false;
				}
				if (ident=='' || identCooked!=identRaw) {
					pict=sym[0];
					logError(ET_S,'invalid identifier');
					return false;
				}
				if (symtab[ident] && !(redefSyms || (sym[1]=='=' && bbcMode && !bbcBlock))) {
					pict+=sym[0];
					if (sym[1]=='=') {
						pict+=' =';
						logError(ET_P,'symbol already defined');
					}
					else {
						logError(ET_P,'label already defined');
					}
					return false;
				}
			}
			ofs++;
			if (sym.length>1 && (sym[ofs]=='=' || (!bbcMode && sym[ofs]=='EQU'))) {
				pict=ident+' '+sym[ofs]+' ';
				if (bbcBlock) {
					logError(ET_S,'assignment inside assembler block');
					return false;
				}
				ofs++;
				if (sym.length<=ofs) {
					logError(ET_S, 'unexpected end of line, expression expected');
					return false;
				}
				var arg=sym[ofs],
					a1=arg.charAt(0);
				if ((arg=='*' && !bbcMode) || arg=='P%') {
					pict+=pass==1?arg:pcSymbol;
					r={ 'v': pc, 'isWord': false, 'pc': pc };
				}
				else {
					if (bbcMode) {
						var asmExpr=getAsmExpression(sym, ofs);
						if (asmExpr.error) {
							pict+=asmExpr.pict;
							logError(ET_P, asmExpr.error);
							return false;
						}
						ofs=asmExpr.ofs,
						arg=asmExpr.pict;
					}
					var r=getExpression(arg, pc);
					pict+=r.pict;
					if (r.error) {
						logError(r.et||ET_P, r.error);
						return false;
					}
					if (r.undef) {
						logError(r.et||ET_C, 'undefined symbol "'+r.undef+'"');
						return false;
					}
				}
				ofs++;
				if (sym.length>ofs) {
					if (sym.length==ofs+1 && sym[ofs]=='W') { // ignore 'W' suffix
						pict+=' '+(bbcMode && !bbcBlock? ':REM ':commentChar)+'w';
					}
					else {
						pict+=' '+sym[ofs].charAt(0);
						logError(ET_S,'unexpected extra characters');
						return false;
					}
				}
				if (pass==1) {
					symtab[ident]=r;
				}
				else {
					if (r.isWord || r.v>0xff) {
						asm=ident+' = '+hexPrefix+getHexWord(r.v);
					}
					else {
						asm=ident+' = '+hexPrefix+getHexByte(r.v);
					}
					pict=asm;
					asm=asmSpace;
				}
				if (ident=='A' && pass==1) logError('warning', 'symbol "A" may be ambiguous in address context.', true);
				else logLine();
				nextSyms();
				continue;
			}
			else {
				addrStr=getHexWord(pc);
				labelStr=labelPrefix+ident+' ';
				if (ident.length && ident.indexOf('%')==ident.length-1) {
					logError(ET_S,'assignment expected');
					return false;
				}
				if (pass==1) symtab[ident]={ 'v': pc, 'isWord': false, 'pc': pc };
				if (sym.length>=ofs+1) {
					c0=sym[ofs].charAt(0);
				}
				else {
					logLine();
					nextSyms();
					continue;
				}
			}
		}

		if (sym.length<ofs) {
			// end of line
			logLine();
			nextSyms();
			continue;
		}

		if (ofs==0) addrStr=getHexWord(pc);

		if (c0<'A' || c0>'Z') {
			if (!useIllegals && instrAll[sym[Math.max(0,ofs-1)]]) {
				pict+=sym[ofs];
				logError(ET_S,'character expected.\n\nmeant to activate illegal opcodes?\n-> use "'+(bbcMode? '':'.')+'OPT ILLEGALS"');
			}
			else {
				pict+=c0;
				if (ofs>0 && c0=='.' && !bbcMode) logError(ET_S,'character expected\n(no labels allowed on same line as pragmas)');
				else if (ofs>0) logError(ET_S,'character or assignment operator expected');
				else logError(ET_S,'character expected');
			}
			return false;
		}
		else {
			// opcode
			var opc=sym[ofs], dot=sym[ofs].indexOf('.'), ext='', opctab, instr, addr, mode=0;
			if (dot>0) {
				var lsym=opc.substring(0,dot),
					rsym=opc.substring(dot+1);
				if ( (rsym=='B' && hasZpgMode(lsym)) || (rsym=='W' && hasWordMode(lsym)) ) {
					ext=rsym.toLowerCase();
					opc=lsym;
					pict+=(pass==1)?lsym+'.'+ext:lsym;
				}
				else {
					pict+=opc;
					if (rsym=='B' || rsym=='W') {
						logError(ET_C,'invalid extension '+rsym+' for opcode '+lsym);
					}
					else {
						logError(ET_S, 'invalid extension format: '+opc);
					}
					return false;
				}
			}
			else pict+=opc;
			opctab=instrtab[opc];
			if (opctab==null) {
				if (!useIllegals && instrAll[opc]) {
					logError(ET_S,'opcode expected.\nmeant to activate illegal opcodes?\n-> use "'+(bbcMode? '':'.')+'OPT ILLEGALS"');
				}
				else {
					logError(ET_S, ofs==0? 'opcode or label expected':'opcode expected');
				}
				return false;
			}
			addr=sym[ofs+1];
			if (typeof addr=='undefined') {
				// implied
				var addrmode = (opctab[0]<0 && opctab[1]>=0)? 1:0;
				if (addrmode==1 && pass==2) pict+=' A';
				if (opctab[addrmode]<0) {
					logError(ET_S,'unexpected end of line, operand expected');
					return false;
				}
				else if (pass==2) {
					// compile
					asm=getHexByte(opctab[addrmode]);
					compile(pc, opctab[addrmode]);
				}
				logLine();
				pc++;
			}
			else {
				var a1=addr.charAt(0),
					b1=0,
					b2=addr.length,
					coda='';
				if (addr=='A' && opctab[1]>=0) {
					pict+=' A';
					b1=1;
					mode=1;
				}
				else if (a1=='#') {
					pict+=' #';
					b1=1;
					mode=2;
				}
				else if (a1=='*') {
					if (bbcMode || (b2>1 && operatorChars.indexOf(addr.charAt(1))<0) || addr=='**') {
						pict+=' *';
						b1=1;
						mode=6;
					}
					else {
						pict+=' ';
						mode=(opctab[12]<0)? 3:12;
					}
				}
				else if (a1=='(') {
					pict+=' (';
					b1=1;
					mode=9;
				}
				else {
					pict+=' ';
					mode=(opctab[12]<0)? 3:12;
				}
				if (ext) {
					if (ext=='b' && (mode==3 || mode==6)) {
						mode=6;
					}
					else if (mode!=3) {
						logError(ET_P,'extension conflicts with operand type');
						return false;
					}
				}
				if (mode==9) {
					var b3=addr.indexOf(',X)');
					if (b3>0 && b3==b2-3) {
						mode+=1;
						coda=',X)';
					}
					else {
						b3=addr.indexOf('),Y');
						if (b3>0 && b3==b2-3) {
							mode+=2;
							coda='),Y';
						}
						else {
							b3=addr.indexOf(')Y');
							if (b3>=0 && b3==b2-2) {
								mode+=2;
								coda=pass==1? ')Y':'),Y';
							}
						}
					}
					if (mode==9 && addr.indexOf(')')==b2-1) {
						b3=b2-1;
						coda=')';
					}
					else if (b3<0) {
						pict+=addr;
						logError(ET_S,'invalid address format');
						return false;
					}
					b2=b3;
				}
				else if (mode>2) {
					var b3=addr.indexOf(',X');
					if (b3>0 && b3==b2-2) {
						mode+=1;
						coda=',X';
					}
					else {
						b3=addr.indexOf(',Y');
						if (b3>0 && b3==b2-2) {
							mode+=2;
							coda=',Y';
						}
					}
					if (b3>0) b2=b3;
				}

				instr=opctab[mode];
				if (instr<=-10) {
					// redirect to implicit fallback
					mode = -instr - 10;
					instr=opctab[mode];
				}
				if (instr<0) {
					pict+=addr.substr(b1);
					logError(ET_C,'invalid address mode for '+opc);
					return false;
				}

				// operand
				if (!bbcMode && (mode==12 || (opc=='JMP' && mode==3)) && addr && (addr.charAt(0)=='!' || addr.charAt(0)==':')) {
					// anonymous target
					var target=getAnonymousTarget(addr);
					if (target.error) {
						pict+=target.pict;
						logError(pass==1? ET_S:ET_C, target.error);
						return false;
					}
					if (pass==1) {
						pict+=target.pict;
					}
					else {
						oper=target.address;
						pict+=''+hexPrefix+getHexWord(oper);
					}
				}
				else if (mode>1) {
					var expr=addr.substring(b1,b2),
						e0=expr.charAt(0),
						oper=0,
						autoZpg = optAutoZpg && !ext && mode>=3 && mode<=5 && hasZpgMode(opc);
					if (expressionStartChars.indexOf(e0)<0 || (bbcMode && e0=='.')) {
						pict+=e0;
						logError(ET_S,'illegal character');
						return false;
					}
					var r=getExpression(expr, pc);
					if (r.error) {
						pict+=r.pict;
						if (r.undef) {
							logError(r.et||ET_C,'undefined symbol "'+r.undef+'"');
						}
						else {
							logError(r.et||ET_P,r.error);
						}
						return false;
					}
					oper=r.v;
					if (r.isWord) autoZpg=false;
					if (autoZpg && oper<0x100 && opctab[mode+3]>=0) mode+=3;
					if (pass==1) {
						pict+=r.pict;
					}
					else if (mode==12) {
						pict+=hexPrefix+getHexWord(oper);
					}
					else {
						pict+=(steptab[mode]>2)? hexPrefix+getHexWord(oper):hexPrefix+getHexByte(oper);
					}
					pict+=coda;
				}
				if (sym.length>ofs+2) {
					pict+=' '+sym[ofs+2].charAt(0);
					logError(ET_S,'unexpected extra characters');
					return false;
				}

				if (pass==2) {
					instr=opctab[mode];
					if (mode==12) {
						// rel
						oper=oper-((pc+2)&0xffff);
						if (oper>127 || oper<-128) {
							logError(ET_C,'branch target out of range');
							return false;
						}
					}
					// compile
					compile(pc, instr);
					asm=getHexByte(instr);
					if (mode>1) {
						var op=oper&0xff;
						compile(pc+1, op);
						asm+=' '+getHexByte(op);
						if (steptab[mode]>2) {
							op=(oper>>8)&0xff;
							compile(pc+2, op);
							asm+=' '+getHexByte(op);
						}
					}
				}
				logLine();
				pc+=steptab[mode];
			}
		}
		nextSyms();
	}
	if (bbcBlock && pass==1) logError('warning','unclosed assembler block', true);
	return true;
}

function getHexByte(v) {
	return ''+hextab[(v>>4)&0x0f]+hextab[v&0x0f];
}

function getHexWord(v) {
	return ''+hextab[(v>>12)&0x0f]+hextab[(v>>8)&0x0f]+hextab[(v>>4)&0x0f]+hextab[v&0x0f];
}

function storeCode(addr, code, startAddr) {
	if (code) {
		var id=new Date().getTime().toString(36);
		codeStore = {
			'type': '6502CodeTransfer',
			'id': id,
			'addr': addr,
			'code': code,
			'bbcMode': bbcMode,
			'startAddr': startAddr
		};
	}
	else {
		codeStore=null;
	}
}

return {
	'assemble': assemble,
	'setup': setup,
	// 'start': assemble,
	// 'setAddressDisplay': setAddressDisplay,
	// 'setBBCMode': setBBCMode,
	// 'showBBCInfo': showBBCInfo,
	// 'loadFile': loadFile,
	// 'closeDialog': hideDialog,
	// 'transferCodeToEmulator': transferCodeToEmulator,
	// 'loadSource': loadSource,
	// 'getBinary': getBinary
};

})();

// eof
