import { ET_P, ET_S, logError, logLine } from "../log.js";
import { nextSyms } from "../symbol.js";
import { compile, getHexByte, getHexWord } from "../utils.js";

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

export function encodeAscii(b) {
	return b;
}

export function processString(ctx, pragma) {
	let cbBuffer=[],
		enc,
		convertPiLocal,
		re= new RegExp('\\s+(".*?")\\s*$', 'i'),
		matches= ctx.rawLine.match(re),
		txt,
		wannaTrailingZero= false,
		wannaLeadingLen= false;

	if (ctx.pass==2) {

		enc= ctx.charEncoding;
		convertPiLocal= ctx.convertPi;

		switch(pragma) {
			case "CSTRING":
				wannaTrailingZero= true;
				pragma= "TEXT";
				break;

			case "PSTRING":
				wannaLeadingLen= true;
				pragma= "TEXT";
				break;

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
				ctx.pict+= txt.substring(i+1).replace(/^(\s)?\s*(.).*/,'$1"$2');
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

			if(wannaLeadingLen) {
				wannaLeadingLen= false;
				compile(ctx, ctx.pc, tmax);
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict= '.DB $'+getHexByte(tmax);
				ctx.pc++;
				ctx.asm= getHexByte(tmax);
				logLine(ctx);

				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict+= '.'+pragma+' "';
			}

			cc= enc(cc);
			cbBuffer.push(getHexByte(cc));
			compile(ctx, ctx.pc, cc);
			if (cbBuffer.length==3) {
				ctx.asm= cbBuffer.join(' ');
				cbBuffer.length=0;
				if (i==tmax-1 && txt.charAt(tmax)=='"') ctx.pict+='"';
				logLine(ctx);
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict+= '.'+pragma+' "';
			}
		}
		else if (i%40==39) {
			logLine(ctx);
			ctx.addrStr= getHexWord(ctx.pc);
			ctx.pict+= '.'+pragma+' "';
		}
		ctx.pc++;
	}
	ctx.pict+= '"';

	switch(ctx.pass) {
		case 1:
			if(i%40 != 39)
				logLine(ctx);
			break;

		case 2:
			if(cbBuffer.length) {
				ctx.asm= cbBuffer.join(' ');
				logLine(ctx);
			}
			if(wannaTrailingZero) {
				compile(ctx, ctx.pc, 0);
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict= '.DB $00';
				ctx.pc++;
				ctx.asm= "00";
				logLine(ctx);
			}
			break;
	}


	nextSyms(ctx);
	return true;
}
