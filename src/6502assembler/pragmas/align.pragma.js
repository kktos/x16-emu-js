import { getExpression } from "../expression.js";
import { ET_P, ET_S, logError, logLine } from "../log.js";
import { getHexByte, getHexWord, hexPrefix } from "../utils.js";

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

export function processAlign(ctx, pragma) {
	let pcOffset= 2,
		fillbyte= 0,
		delta;

	ctx.pict+= pragma;
	if(ctx.sym.length > ctx.ofs) {
		ctx.pict+=' ';

		// console.log(1, { ofs:ctx.ofs, sym: ctx.sym});

		let r= getExpression(ctx, ctx.sym[ctx.ofs++]);
		if (r.error) {
			ctx.pict+=r.pict;
			logError(ctx, r.et||ET_P, r.error);
			return false;
		}

		// console.log(10, {sym: ctx.sym[ctx.ofs], ofs:ctx.ofs, len:ctx.sym.length});

		pcOffset= r.v&0xffff;
		ctx.pict+= ctx.pass==1 ?
					r.pict
					:
					hexPrefix+(r.v<0x100 ? getHexByte(pcOffset) : getHexWord(pcOffset));

		if(ctx.sym.length > ctx.ofs) { // fill-byte
			ctx.pict+=' ';

			// console.log(2, {sym: ctx.sym[ctx.ofs]});

			let r= getExpression(ctx, ctx.sym[ctx.ofs++]);
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
	ctx.addrStr= getHexWord(ctx.pc);
	logLine(ctx);

	return true;
}
