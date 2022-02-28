import { getExpression } from "../expression.js";
import { ET_P, ET_S, logError, logLine } from "../log.js";
import { nextSyms } from "../symbol.js";
import { compile, getHexByte, getHexWord, hexPrefix } from "../utils.js";

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

export function hex(ctx) {
	if(ctx.sym.length<2) {
		ctx.addrStr= getHexWord(ctx.pc);
		ctx.pict+= pragma;
		logError(ctx, ET_S, 'expression expected');
		return false;
	}
	let numbers= symToArgs(ctx.sym,1);
	for(const num of numbers) {
		ctx.addrStr= getHexWord(ctx.pc);
		ctx.pict= '.db $'+num;
		if(!/^[0-9A-F]+$/.test(num)) {
			logError(ctx, ET_P, "Not a valid hexa number");
			return false;
		}
		if(ctx.pass == 2) {
			let byte= Number.parseInt(num, 16) & 0xFF;
			compile(ctx, ctx.pc, byte);
			ctx.asm= getHexByte(byte);
			ctx.pict= `.DB ${hexPrefix}${ctx.asm}`;
		}
		logLine(ctx);
		ctx.pc++;
	}
	nextSyms(ctx);
	return true;
}

export function processData(ctx, pragma, dataSize) {
	if(ctx.sym.length<2) {
		ctx.addrStr= getHexWord(ctx.pc);
		ctx.pict+= pragma;
		logError(ctx, ET_S, 'expression expected');
		return false;
	}

	let isFirst= true;
	let args= symToArgs(ctx.sym,1);
	for(let j=0; j<args.length; j++) {
		let v= 0;
		let arg= args[j];
		if(!arg)
			return true;
		if(isFirst)
			isFirst= false;

		ctx.addrStr= getHexWord(ctx.pc);
		ctx.pict= '.'+pragma+' ';

		if (arg.charAt(0)=='#') {
			// ignore literal value prefix
			ctx.pict+= '#';
			arg= arg.substring(1);
		}
		if (arg) {
			let r= getExpression(ctx, arg, ctx.pc, Math.abs(dataSize)==4);
			ctx.pict+= r.pict;
			if (r.error) {
				logError(ctx, r.et||ET_P, r.error);
				return false;
			}
			v= r.v;
		}
		if (ctx.pass==2) {
			v&= (Math.abs(dataSize)==4)? 0xffffffff : 0xffff;
			let lb=(v>>8)&0xff;
			let rb=v&0xff;

			switch(dataSize) {
				// byte
				case 1:
					compile(ctx, ctx.pc, rb);
					ctx.asm= getHexByte(rb);
					ctx.pict= '.DB '+hexPrefix+getHexByte(rb);
					break;

				// word (2 bytes) little endian
				case 2:
					compile(ctx, ctx.pc, rb);
					compile(ctx, ctx.pc+1, lb);
					ctx.asm= getHexByte(rb)+' '+getHexByte(lb);
					ctx.pict= '.DW '+hexPrefix+getHexWord(v);
					break;

				// long (4 bytes) little endian
				case 4: {
					const b0= (v>>24)&0xff, b1=(v>>16)&0xff;

					compile(ctx, ctx.pc, rb);
					compile(ctx, ctx.pc+1, lb);
					ctx.asm= getHexByte(rb)+' '+getHexByte(lb);

					ctx.pict= '.DL '+hexPrefix+getHexByte(b0)+getHexByte(b1)+getHexByte(lb)+getHexByte(rb);
					logLine(ctx);

					ctx.pc+= 2;
					ctx.addrStr= getHexWord(ctx.pc);
					compile(ctx, ctx.pc, b1);
					compile(ctx, ctx.pc+1, b0);
					ctx.asm= getHexByte(b1)+' '+getHexByte(b0);
					ctx.pict='';
					break;
				}

				// long (4 bytes) big endian
				case -4: {
					const b0= (v>>24)&0xff, b1=(v>>16)&0xff;
					compile(ctx, ctx.pc, b0);
					compile(ctx, ctx.pc+1, b1);
					ctx.asm= getHexByte(b0)+' '+getHexByte(b1);
					ctx.pict= '.DWORD '+hexPrefix+getHexByte(b0)+getHexByte(b1)+getHexByte(lb)+getHexByte(rb);
					logLine(ctx);
					ctx.pc+= 2;
					ctx.addrStr= getHexWord(ctx.pc);
					compile(ctx, ctx.pc, lb);
					compile(ctx, ctx.pc+1, rb);
					ctx.asm= getHexByte(lb)+' '+getHexByte(rb);
					ctx.pict='';
					break;
				}

				// word (2 bytes) big endian
				case -2:
					compile(ctx, ctx.pc, lb);
					compile(ctx, ctx.pc+1, rb);
					ctx.asm= getHexByte(lb)+' '+getHexByte(rb);
					ctx.pict= '.DBYTE '+hexPrefix+getHexWord(v);
					break;
			}

		}
		logLine(ctx);
		ctx.pc+= Math.abs(dataSize);
	}
	nextSyms(ctx);
	return true;
}
