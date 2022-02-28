import { getExpression } from "../expression.js";
import { ET_C, ET_P, ET_S, logError, logLine } from "../log.js";
import { nextSyms } from "../symbol.js";
import { getHexByte, getHexWord, hexPrefix } from "../utils.js";

function setRepeat(ctx, interval, step) {
	ctx.repeatSym=[];
	for (let i=0; i<ctx.sym.length; i++)
		ctx.repeatSym.push(ctx.sym[i]);
	ctx.repeatInterval= interval||0;
	ctx.repeatStep= step||1;
	ctx.repeatCntr= -1,
	ctx.repeatLine= ctx.rawLine.replace(/^.*?\.REPEAT\s+\S+\s*(STEP\s+\S+\s*)?/i, '');
}

export function processRepeat(ctx, pragma) {

	ctx.pict+= pragma;
	if (ctx.repeatInterval>0) {
		logError(ctx, ET_P,'already repeating');
		return false;
	}
	var interval=0, step=1;
	ctx.sym.shift();
	var temp= ctx.sym.shift();
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
		temp= ctx.sym.shift();
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
	return true;
}
