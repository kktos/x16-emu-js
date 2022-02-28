import { ET_S, logError, logLine } from "./log.js";
import { processAlign } from "./pragmas/align.js";
import { c64Start } from "./pragmas/c64Start.js";
import { hex, processData } from "./pragmas/data.js";
import { processOption } from "./pragmas/option.js";
import { processOrg } from "./pragmas/org.js";
import { processRepeat } from "./pragmas/repeat.js";
import { processString } from "./pragmas/string.js";
import { nextSyms } from "./symbol.js";
import { commentChar } from "./utils.js";

export function resolveAliases(pragma) {

	// const PRAGMA_IGNORED= [
	// 	"XREF",
	// 	"NOXREF",
	// 	"COUNT",
	// 	"NOCOUNT",
	// 	"CNT",
	// 	"NOCNT",
	// 	"LIST",
	// 	"NOLIST",
	// 	"MEMORY",
	// 	"NOMEMORY",
	// 	"GENERATE",
	// 	"NOGENERATE",
	// 	"NOGENERA",
	// ];

	switch(pragma) {

		case "BYTE":
		case "BYT":
			return "DB";

		case "WORD":
			return "DW";

		case "LONG":
			return "DL";

		case "DBYT":
			return "DBYTE";

		case "RORG":
		case "*":
			return "ORG";

		case "STRING":
		case "STR":
			return "TEXT";

		case "CSTR":
			return "CSTRING";

		case "PSTR":
			return "PSTRING";

		default:
			return pragma;
	}


	// if(PRAGMA_IGNORED.includes(pragma))
	// 	pragma= "IGNORED";

}

export function processPragma(pragma, ctx) {
	switch(pragma) {

		case "PETSTART":
		case "C64START":
			return c64Start(ctx, pragma) ? null : false;

		case "ORG":
			return processOrg(ctx, pragma) ? null : false;

		case "END":
			ctx.pict+=pragma;
			logLine(ctx);
			return true;

		case "OPT":
			return processOption(ctx, pragma) ? null : false;


		case "FILL":
		case "ALIGN":
			return processAlign(ctx, pragma) ? null : false;

		case "DATA":
			if (ctx.pass==1) {
				ctx.pict+=ctx.sym.join(' ');
				labelStr='-ignored';
				logLine(ctx);
			}
			nextSyms(ctx);
			return null;

		case "REPEAT":
			return processRepeat(ctx, pragma) ? null : false;

		case "SKIP":
		case "PAGE":
			if (ctx.pass==1) {
				ctx.pict+= pragma;
				logLine(ctx);
			}
			else {
				if(ctx.comment)
					logLine(ctx);
				else ctx.listing+='\n';
				if(pragma=='PAGE') {
					ctx.listing+='                   '+(ctx.pageHead||commentChar+'page')+'  ';
					ctx.listing+='('+(++ctx.pageCnt)+')\n\n';
				}
			}
			nextSyms(ctx);
			return null;

		case "TEXT":
		case "ASCII":
		case "PETSCII":
		case "PETSCR":
		case "C64SCR":
		case "CSTRING":
		case "PSTRING":
			return processString(ctx, pragma) ? null : false;

		case "HEX":
			return hex(ctx) ? null : false;

		case "DB":
			return processData(ctx, pragma, 1) ? null : false;

		case "DW":
			return processData(ctx, pragma, 2) ? null : false;

		case "DL":
			return processData(ctx, pragma, 4) ? null : false;

		case "DBYTE":
			return processData(ctx, pragma, -2) ? null : false;

		case "DWORD":
			return processData(ctx, pragma, -4) ? null : false;

		default:
			ctx.pict+=pragma;
			logError(ctx, ET_S,'invalid pragma');
			return false;

	}
}
