//import { ET_S, logError } from "./log.js";
import { getExpression } from "../expression.js";
import { logError, logLine } from "../log.js";


export function processASMOuput(ctx, pragma) {

	let msg= "";
	for(let idx= ctx.ofs; idx<ctx.sym.length; idx++) {

		// ctx.listing+= idx+" - "+ctx.sym[idx]+"\n";

		let r= getExpression(ctx, ctx.sym[idx]);

		// ctx.listing+= JSON.stringify(r)+"\n";

		if(r.error) {
			logError(ctx, r.et, r.error);
			return false;
		}
		msg+= r.v;
	}

	switch(pragma) {
		case "OUT":
			ctx.pict= msg;
			logLine(ctx, true);
			return true;

		case "WARNING":
			logError(ctx, "WARNING", msg, true);
			return true;

		case "ERROR":
			logError(ctx, "ERROR", msg, false);
			return false;

	}
	return false;
}
