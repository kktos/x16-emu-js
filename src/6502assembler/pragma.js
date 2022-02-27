import { getExpression } from "./expression.js";
import { ET_C, ET_P, ET_S, logError, logLine } from "./log.js";
import { nextSyms } from "./symbol.js";
import { compile, getHexByte, getHexWord, hexPrefix, pcSymbol } from "./utils.js";

function c64Start() {
	if (ctx.code.length) {
		logError(ctx, ET_C, '".'+pragma+'" must be the first instruction.');
		return false;
	}
	let basicLineNo='',
		remText='',
		// lineLengthMax=88,
		lineNumberMax='63999',
		basicAddr=pragma=='PETSTART'? 0x0401:0x0801,
		rem=[],
		linkAddr,
		ofs=1;

	ctx.pc= basicAddr;
	ctx.addrStr=getHexWord(ctx.pc);
	ctx.pict='.'+pragma;
	if (ctx.sym[1] && (/^[0-9]+$/).test(ctx.sym[1])) {
		basicLineNo=ctx.sym[1];
		ofs++;
		ctx.pict+=' '+basicLineNo;
	}
	if (ctx.sym[ofs] && ctx.sym[ofs].charAt(0)!='"') {
		ctx.pict+=' '+ctx.sym[ofs].charAt(0);
		logError(ctx, ET_S, basicLineNo? 'string expected':'line number or string expected');
		return false;
	}
	while (ctx.sym[ofs]) {
		remText+=ctx.sym[ofs++].replace(/^"/,'').replace(/"\s*,?$/,'').replace(/","/g, '\\n');
		if (ctx.sym[ofs]==',') ofs++;
		if (ctx.sym[ofs]) {
			ctx.sym[ofs]=ctx.sym[ofs].replace(/^,\s*/,'');
			if (ctx.sym[ofs].charAt(0)!='"') {
				ctx.pict+=' "'+remText.replace(/\\n/g, '", "')+'", '+ctx.sym[ofs].charAt(0);
				logError(ctx, ET_S,'string expected');
				return false;
			}
			remText+='\\n';
		}
	}

	if (!basicLineNo || basicLineNo>lineNumberMax)
		basicLineNo=''+(new Date()).getFullYear();

	if (remText) {
		ctx.pict+=' "';
		var cnt=0, t=[];
		for (var i=0; i<remText.length; i++) {
			var c=remText.charAt(i), cc=remText.charCodeAt(i);
			ctx.pict+=c;
			if (cc==0x03C0) cc=0xff; //pi
			if (cc>0xff) {
				logError(ctx, ET_P, 'illegal character');
				return false;
			}
			if (c=='\\' && remText.charAt(i+1)=='n') {
				ctx.pict+='n';
				i++;
				cnt=0;
				rem.push(t);
				t=[];
				continue;
			}
			if (++cnt>80) {
				logError(ctx, ET_C, 'REM line too long (80 characters max.)');
				return false;
			}
			t.push(encodePetscii(cc));
		}
		if (t.length) rem.push(t);
		ctx.pict+='"';
		if (parseInt(basicLineNo,10)<rem.length) basicLineNo=''+rem.length;
	}
	logLine(ctx);
	if (ctx.pass==2) ctx.listing+='>>>>  COMPILING BASIC PREAMBLE...\n';
	if (rem.length) {
		for (var ln=0; ln<rem.length; ln++) {
			var remLine=rem[ln];
			linkAddr= ctx.pc+7+remLine.length;
			if (ctx.pass==2) {
				var linkLo=linkAddr&0xff,
					linkHi=linkAddr>>8
					lnLo=ln&0xff,
					lnHi=ln>>8,
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, linkLo);
				compile(ctx, ctx.pc++, linkHi);
				ctx.asm=getHexByte(linkLo)+' '+getHexByte(linkHi);
				ctx.pict='$'+getHexWord(linkAddr)+' ;LINE LINK';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, lnLo);
				compile(ctx, ctx.pc++, lnHi);
				ctx.asm=getHexByte(lnLo)+' '+getHexByte(lnHi);
				ctx.pict='$'+getHexWord(ln)+' ;LINE NO. ("'+ln+'")';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, 0x8f);
				compile(ctx, ctx.pc++, 0x20);
				ctx.asm='8F 20';
				ctx.pict=';"REM "';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				ctx.asm='';
				ctx.pict=';';
				for (var i=0; i<remLine.length; i++) {
					compile(ctx, ctx.pc++, remLine[i]);
					ctx.asm+=(ctx.asm? ' ':'')+getHexByte(remLine[i]);
					ctx.pict+='.'
					if ((i+1)%3==0) {
						logLine(ctx);
						ctx.addrStr=getHexWord(ctx.pc);
						ctx.asm='';
						ctx.pict=';';
					}
				}
				if (ctx.asm) logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, 0);
				ctx.asm='00';
				ctx.pict='$00   ;EOL';
				logLine(ctx);
			}
			ctx.pc= linkAddr;
		}
	}
	ctx.addrStr=getHexWord(ctx.pc);
	linkAddr= ctx.pc+11;
	cbmStartAddr=linkAddr+2;
	if (ctx.pass==2) {
		var linkLo=linkAddr&0xff,
			linkHi=linkAddr>>8,
			ln=parseInt(basicLineNo,10),
			lnLo=ln&0xff,
			lnHi=ln>>8,
			saStr=''+cbmStartAddr;
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, linkLo);
		compile(ctx, ctx.pc++, linkHi);
		ctx.asm=getHexByte(linkLo)+' '+getHexByte(linkHi);
		ctx.pict='$'+getHexWord(linkAddr)+' ;LINE LINK';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, lnLo);
		compile(ctx, ctx.pc++, lnHi);
		ctx.asm=getHexByte(lnLo)+' '+getHexByte(lnHi);
		ctx.pict='$'+getHexWord(ln)+' ;LINE NO. ("'+basicLineNo+'")';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, 0x9e);
		compile(ctx, ctx.pc++, 0x20);
		ctx.asm='9E 20';
		ctx.pict=';"SYS "';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		ctx.asm='';
		ctx.pict=';TEXT "';
		for (var i=0, max=saStr.length-1; i<=max; i++) {
			var c=saStr.charAt(i), cc=saStr.charCodeAt(i);
			compile(ctx, ctx.pc++, cc);
			ctx.asm+=(ctx.asm? ' ':'')+getHexByte(cc);
			ctx.pict+=c;
			if ((i+1)%3==0) {
				if (i==max) ctx.pict+='"';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				ctx.asm='';
				ctx.pict=';TEXT "';
			}
		}
		if (ctx.asm) {
			ctx.pict+='"';
			logLine(ctx);
		}
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, 0);
		ctx.asm='00';
		ctx.pict='$00   ;EOL';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, 0);
		compile(ctx, ctx.pc++, 0);
		ctx.asm='00 00';
		ctx.pict='$0000 ;END OF BASIC TEXT (EMPTY LINK)';
		logLine(ctx);
	}
	ctx.pc= cbmStartAddr;
	if (ctx.pass==2)
		ctx.listing+='>>>>  START OF ASSEMBLY AT $'+getHexWord(ctx.pc)+' ("SYS '+cbmStartAddr+'")\n';
	nextSyms(ctx);
	return true;
}

function setRepeat(ctx, interval, step) {
	ctx.repeatSym=[];
	for (let i=0; i<ctx.sym.length; i++)
		ctx.repeatSym.push(ctx.sym[i]);
	ctx.repeatInterval= interval||0;
	ctx.repeatStep= step||1;
	ctx.repeatCntr= -1,
	ctx.repeatLine= rawLine.replace(/^.*?\.REPEAT\s+\S+\s*(STEP\s+\S+\s*)?/i, '');
}

function fill(ctx, addr, b) {
	addr&= 0xffff;
	b&= 0xff;
	let start = Math.min(ctx.pc, ctx.codeStart),
		end = Math.max(ctx.pc, ctx.codeEnd);
	if (addr<start) {
		for (let i=addr; i<start; i++) {
			if (typeof ctx.code[i]=='undefined') ctx.code[i]=b;
		}
		if (ctx.codeEnd<start) ctx.codeEnd=Math.max(0,start-1);
		ctx.codeStart=addr;
	}
	else if (addr>end) {
		if (typeof ctx.code[end]=='undefined') ctx.code[end]=b;
		for (let i=end+1; i<addr; i++) ctx.code[i]=b;
		if (end<ctx.codeStart) ctx.codeStart= end;
		ctx.codeEnd= Math.max(0,addr-1);
	}
}

function symToArgs(sym, ofs) {
	let args=[], chunk;
	for (let i=ofs; i<sym.length; i++) {
		let s=sym[i], quote=false, k=0;
		chunk='';
		while (k<s.length) {
			let c=s.charAt(k++);
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

function processString(ctx, pragma) {
	let cbBuffer=[],
		enc,
		convertPiLocal,
		re= new RegExp('^\\s*\\.'+pragma+'\\s*(.*?)\\s*$', 'i'),
		matches= ctx.rawLine.match(re),
		txt;

	if (ctx.pass==2) {
		switch(pragma) {
			case "ASCII":
				enc= encodeAscii;
				convertPiLocal= false;
				break;
			case "PETSCII":
				enc= encodePetscii;
				convertPiLocal= true;
				break;
			case "PETSCR":
			case "C64SCR":
				enc= encodeCommodoreScreenCode;
				convertPiLocal= true;
				break;
			default:
				enc= ctx.charEncoding ? ctx.charEncoding : encodeAscii;
				convertPiLocal= ctx.convertPi;
				break;
		}
	}

	ctx.addrStr= getHexWord(ctx.pc);
	ctx.pict+= pragma+' ';
	if (!matches || matches[1].charAt(0)!='"') {
		logError(ctx, ET_S,'quote expected');
		return false;
	}
	txt= matches[1].substring(1);
	ctx.pict+= '"';
	let i, tmax;
	for (i=0, tmax=txt.length-1; i<=tmax; i++) {
		let c=txt.charAt(i), cc=c.charCodeAt(0);
		if (convertPiLocal && v==0x03C0) v=0xff; //CBM pi
		if (c=='"') {
			if (i!=tmax) {
				ctx.pict+=txt.substring(i+1).replace(/^(\s)?\s*(.).*/,'$1"$2');
				logError(ctx, ET_S,'unexpected extra character');
				return false;
			}
			break;
		}
		ctx.pict+=c;
		if (cc>0xff) {
			logError(ctx, ET_P, 'illegal character');
			return false;
		}
		if (ctx.pass==2) {
			cc=enc(cc);
			cbBuffer.push(getHexByte(cc));
			compile(ctx, ctx.pc, cc);
			if (cbBuffer.length==3) {
				ctx.asm=cbBuffer.join(' ');
				cbBuffer.length=0;
				if (i==tmax-1 && txt.charAt(tmax)=='"') ctx.pict+='"';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				ctx.pict+='.'+pragma+' "';
			}
		}
		else if (i%40==39) {
			logLine(ctx);
			ctx.addrStr=getHexWord(ctx.pc);
			ctx.pict+='.'+pragma+' "';
		}
		ctx.pc++;
	}
	ctx.pict+= '"';

	if (ctx.pass==1 && i%40!=39)
		logLine(ctx);

	if (ctx.pass==2 && cbBuffer.length) {
		ctx.asm=cbBuffer.join(' ');
		logLine(ctx);
	}
	nextSyms(ctx);
	return true;
}

export function processPragma(pragma, ctx) {
	switch(pragma) {

		case "PETSTART":
		case "C64START":
			if(!c64Start())
				return false;
			else
				return null;

		case "ORG":
			// set pc
			ctx.pict= (pragma=='ORG' ? '.':'')+pragma;
			let assignmentRequired = (pragma=='*' || pragma=='P%');
			ctx.ofs=1;
			if (ctx.sym.length>1 && (ctx.sym[1]=='=' || (ctx.sym[1]=='EQU'))) {
				ctx.pict+=' '+ctx.sym[1];
				ctx.ofs++;
			}
			else if (assignmentRequired) {
				if (ctx.sym.length>1) ctx.pict+=' '+ctx.sym[1].charAt(0);
				logError(ctx, ET_S, 'assignment expected');
				return false;
			}
			if (ctx.sym.length<=ctx.ofs) {
				logError(ctx, ET_S, 'expression expected');
				return false;
			}
			ctx.pict+= ' ';
			let expr= ctx.sym[ctx.ofs];
			let r= getExpression(ctx, expr, ctx.pc), fillbyte=-1;
			ctx.pict+=r.pict;
			if (r.undef) { logError(ctx, r.et||ET_P, 'undefined symbol "'+r.undef+'"'); return false; }
			if (r.error) { logError(ctx, r.et||ET_P, r.error); return false; }
			if (ctx.sym.length > ctx.ofs+1) {
				let flbr= getExpression(ctx, ctx.sym[++ctx.ofs], ctx.pc);
				ctx.pict+=' '+flbr.pict;
				if (flbr.error) { logError(flbr.et||ET_P, flbr.error); return false; }
				fillbyte=flbr.v&0xff;
			}
			if (ctx.sym.length > ctx.ofs+1) {
				ctx.pict+=' '+ctx.sym[ctx.ofs+1].charAt(0);
				logError(ctx, ET_S, 'unexpected extra characters'); return false;
			}
			ctx.addrStr=getHexWord(r.v);
			if (ctx.pass==2) {
				if (r.error) { logError(ctx, r.et||'error', r.error); return false; }
				ctx.pict= pcSymbol+' = '+hexPrefix+ctx.addrStr;
				if (fillbyte>=0) ctx.pict+=' '+hexPrefix+getHexByte(fillbyte);
				ctx.asm= ctx.asmSpace;
				if (fillbyte>=0)
					fill(ctx, r.v, fillbyte);
			}
			ctx.pc= r.v;
			logLine(ctx);
			nextSyms(ctx);
			return null;

		case "END":
			ctx.pict+=pragma;
			logLine(ctx);
			return true;

		case "OPT":
			ctx.pict+= 'OPT';

			if (ctx.sym.length < 2) {
				logError(ctx, ET_S, 'option expected');
				return false;
			}


			var opt=ctx.sym[1];
			ctx.pict+=' '+opt;
			if (opt=='ZPGA' || opt=='ZPA' || opt=='ZPG') {
				optAutoZpg=true;
				ctx.asm='-AUTO-ZPG ON';
			}
			else if (opt=='WORDA') {
				optAutoZpg=false;
				ctx.asm='-AUTO-ZPG OFF';
			}
			else if (opt=='PETSCII' || opt=='PETSCI') {
				ctx.charEncoding= encodePetscii;
				ctx.convertPi=true;
				ctx.asm='-ENC. PETSCII';
			}
			else if (opt=='ASCII') {
				ctx.charEncoding= encodeAscii;
				ctx.convertPi=false;
				ctx.asm='-ENC. ASCII';
			}
			else if (opt=='PETSCR' || opt=='C64SCR') {
				ctx.charEncoding= encodeCommodoreScreenCode;
				ctx.convertPi=true;
				ctx.asm='-ENC. '+opt;
			}
			else if (
			opt=='ILLEGALS' || opt=='NOILLEGALS' || opt=='NOILLEGA' ||
			opt=='LEGALS' || opt=='LEGALSONLY' || opt=='LEGALSON'
			) {
				useIllegals=opt=='ILLEGALS';
				instrtab = useIllegals? instrAll:instrLegals;
				ctx.asm='-ILLEGALS '+(useIllegals? 'ON':'OFF');
			}
			else if (opt=='REDEF' || opt=='NOREDEF') {
				redefSyms=opt=='REDEF';
				ctx.asm='-REDEF SYMBOLS '+(redefSyms? 'ON':'OFF');
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
				ctx.asm='-IGNORED';
			}
			else {
				logError(ctx, ET_S, 'invalid option');
				return false;
			}
			if (ctx.sym.length > 2) {
				ctx.pict+=' '+ctx.sym[2].charAt(0);
				logError(ctx, ET_S, 'unexpected extra characters');
				return false;
			}
			logLine(ctx);

			nextSyms(ctx);
			return null;

		case "FILL":
		case "ALIGN": {
			let pcOffset= 2,
				fillbyte= 0,
				delta;
			ctx.pict+=pragma;
			if (ctx.sym.length>ctx.ofs+1) {
				ctx.pict+=' ';
				let r=getExpression(ctx, ctx.sym[++ctx.ofs], ctx.pc);
				if (r.error) {
					ctx.pict+=r.pict;
					logError(ctx, r.et||ET_P, r.error);
					return false;
				}
				pcOffset=r.v&0xffff;
				ctx.pict+=ctx.pass==1?r.pict:hexPrefix+(r.v<0x100? getHexByte(pcOffset):getHexWord(pcOffset));
				if (ctx.sym.length>ctx.ofs+1) { // fill-byte
					ctx.pict+=' ';
					let r=getExpression(ctx, ctx.sym[++ctx.ofs], ctx.pc);
					if (r.error) {
						ctx.pict+=r.pict;
						logError(ctx, r.et||ET_P, r.error);
						return false;
					}
					fillbyte=r.v&0xff;
					ctx.pict+=ctx.pass==1?r.pict:hexPrefix+getHexByte(fillbyte);
				}
			}
			else if (pragma=='FILL') {
				logError(ctx, ET_S,'expression expected');
				return false;
			}
			if (ctx.sym.length > ctx.ofs+1) {
				ctx.pict+=' '+ctx.sym[ctx.ofs+1].charAt(0);
				logError(ctx, ET_S, 'unexpected extra characters');
				return false;
			}
			else if (pragma=='FILL') {
				if (pcOffset<0) {
					logError(ctx, ET_C, 'negative offset value');
					return false;
				}
				delta=pcOffset;
			}
			else {
				delta=pcOffset-(ctx.pc%pcOffset);
			}
			if (delta) {
				let pc1= ctx.pc+delta;
				if (ctx.pass==2) {
					if (ctx.codeStart>=0x10000) ctx.codeStart= ctx.pc;
					fill(ctx, pc1, fillbyte);
				}
				ctx.pc= pc1;
			}
			ctx.addrStr=getHexWord(ctx.pc);
			logLine(ctx);
			nextSyms(ctx);
			return null;
		}

		case "DATA":
			if (ctx.pass==1) {
				ctx.pict+=ctx.sym.join(' ');
				labelStr='-ignored';
				logLine(ctx);
			}
			nextSyms(ctx);
			return null;

		case "REPEAT":

			ctx.pict+=pragma;
			if (repeatInterval>0) {
				logError(ctx, ET_P,'already repeating');
				return false;
			}
			var interval=0, step=1;
			ctx.sym.shift();
			var temp=ctx.sym.shift();
			if (!temp) {
				logError(ctx, ET_S,'expression expected');
				return false;
			}
			ctx.pict+=' ';
			var rt=getExpression(ctx, temp, ctx.pc);
			if (rt.error || rt.undef) {
				ctx.pict+=rt.pict;
				if (rt.undef) logError(ctx, ET_P, 'undefined symbol "'+rt.undef+'"');
				else logError(ctx, rt.et||ET_P, rt.error);
				return false;
			}
			if (rt.v<0) {
				ctx.pict+=temp;
				logError(ctx, ET_C, 'illegal interval (n<0)');
				return false;
			}
			if (ctx.pass==1) ctx.pict+=temp;
			else ctx.pict+=' '+hexPrefix+(rt.v<0x100? getHexByte(rt.v):getHexWord(rt.v));
			interval=temp;
			if (ctx.sym[0]=='STEP') {
				ctx.pict+=' STEP';
				ctx.sym.shift();
				temp=ctx.sym.shift();
				if (!temp) {
					logError(ctx, ET_S,'expression expected');
					return false;
				}
				ctx.pict+=' ';
				rt=getExpression(ctx, temp, ctx.pc);
				if (rt.error || rt.undef) {
					ctx.pict+=rt.pict;
					if (rt.undef) logError(ctx, ET_P, 'undefined symbol "'+rt.undef+'"');
					else logError(ctx, rt.et||ET_P, rt.error);
					return false;
				}
				if (rt.v<1) {
					ctx.pict+=temp;
					logError(ctx, ET_C, 'illegal step increment (n<1)');
					return false;
				}
				if (ctx.pass==1) ctx.pict+=temp;
				else ctx.pict+=' '+hexPrefix+(rt.v<0x100? getHexByte(rt.v):getHexWord(rt.v));
				step=temp;
			}
			if (ctx.sym.length==0) {
				if (ctx.pass==1) logError(ctx, 'warning', 'nothing to repeat', true);
			}
			else {
				logLine(ctx);
				setRepeat(ctx, interval, step);
			}
			nextSyms(ctx);
			return null;

		case "SKIP":
		case "PAGE":
			if (ctx.pass==1) {
				ctx.pict+= pragma;
				logLine(ctx);
			}
			else {
				if (comment) logLine(ctx);
				else listing+='\n';
				if (pragma=='PAGE') {
					listing+='                   '+(pageHead||commentChar+'page')+'  ';
					listing+='('+(++pageCnt)+')\n\n';
				}
			}
			nextSyms(ctx);
			return null;

		case "TEXT":
		case "ASCII":
		case "PETSCII":
		case "PETSCR":
		case "C64SCR":
			if(processString(ctx, pragma))
				return null;
			else
				return false;

		case "DB":
		case "DW":
			if(ctx.sym.length<2) {
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict+= pragma;
				logError(ctx, ET_S, 'expression expected');
				return false;
			}

			let isFirst= true;
			let args= symToArgs(ctx.sym,1);

			for(let j=0; j<args.length; j++) {
				let arg= args[j];
				if(!arg)
					return null;
				if(isFirst)
					isFirst= false;
				let v=0;
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict= '.'+pragma+' ';
				let a1= arg.charAt(0);
				if (a1=='#') {
					// ignore literal value prefix
					ctx.pict+='#';
					arg=arg.substring(1);
					a1=arg.charAt(0);
				}
				if (arg=='*') {
					ctx.pict+=arg;
					v= ctx.pc;
				}
				if (arg) {
					let r= getExpression(ctx, arg, ctx.pc, pragma=='EQUD');
					ctx.pict+= r.pict;
					if (r.error) {
						logError(ctx, r.et||ET_P, r.error);
						return false;
					}
					v=r.v;
				}
				if (ctx.pass==2) {
					v&=(pragma=='EQUD')? 0xffffffff:0xffff;
					let lb=(v>>8)&0xff;
					let rb=v&0xff;
					if (pragma=='DW') { // little endian
						compile(ctx, ctx, ctx.pc, rb);
						compile(ctx, ctx, ctx.pc+1, lb);
						ctx.asm= getHexByte(rb)+' '+getHexByte(lb);
						ctx.pict='.DW'+' '+hexPrefix+getHexWord(v);
					}
					else if (pragma=='DBYTE' || pragma=='DBYT') { // big endian
						compile(ctx, ctx, ctx.pc, lb);
						compile(ctx, ctx, ctx.pc+1, rb);
						ctx.asm= getHexByte(lb)+' '+getHexByte(rb);
						ctx.pict='.DBYTE '+hexPrefix+getHexWord(v);
					}
					else if (pragma=='EQUD') { // 4 bytes
						let b0=(v>>24)&0xff, b1=(v>>16)&0xff;
						compile(ctx, ctx, ctx.pc, b0);
						compile(ctx, ctx, ctx.pc+1, b1);
						ctx.asm= getHexByte(b0)+' '+getHexByte(b1);
						ctx.pict='EQUD &'+getHexByte(b0)+getHexByte(b1)+getHexByte(lb)+getHexByte(rb);
						logLine(ctx);
						ctx.pc+= 2;
						ctx.addrStr=getHexWord(ctx.pc);
						compile(ctx, ctx, ctx.pc, lb);
						compile(ctx, ctx, ctx.pc+1, rb);
						ctx.asm= getHexByte(lb)+' '+getHexByte(rb);
						ctx.pict='';
					}
					else { // single byte
						compile(ctx, ctx, ctx.pc, rb);
						ctx.asm= getHexByte(rb);
						ctx.pict= '.DB'+' '+hexPrefix+getHexByte(rb);
					}
				}
				logLine(ctx);
				ctx.pc+= pragma=='DB'? 1: 2;
			}
			nextSyms(ctx);
			return null;

		default:
			ctx.pict+=pragma;
			logError(ctx, ET_S,'invalid pragma');
			return false;

	}
}
