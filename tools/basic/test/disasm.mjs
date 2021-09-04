import { hexWord, hexByte } from "./utils.mjs";
import {
	prgLines,
	strings,
	prgCode,
	CMDS,
	FNS,
	HEADER
} from "./defs.mjs";
import { TYPES } from "./defs.mjs";
import { OPERATORS } from "./defs.mjs";
import { getVar, getVarName } from "./vars.mjs";
import { readBufferHeader } from "./buffer.mjs";

let prgCursor= 0;
let lineCursor= 0;
let addr= 0;

function readProgramByte(lookahead= false) {
	addr= prgCursor;
	return prgCode.buffer[lookahead ? prgCursor : prgCursor++];
}

function readProgramWord() {
	addr= prgCursor;
	return prgCode.buffer[prgCursor++] | (prgCode.buffer[prgCursor++]<<8);
}

function readLineWord() {
	return prgLines.buffer[lineCursor++] | (prgLines.buffer[lineCursor++]<<8);
}

function disasmVar() {
	const varType= readProgramByte();
	console.log(hexWord(addr),":", hexByte(varType), "  ;");
	switch(varType) {
		case TYPES.string: {
			const strIdx= readProgramWord();
			console.log(hexWord(addr),":", hexWord(strIdx), "  ;", strings[strIdx]);
			break;
		}
		case TYPES.var: {
			const strIdx= readProgramWord();
			console.log(hexWord(addr),":", hexWord(strIdx), "  ;", getVar(strIdx));
			break;
		}
	}
}

function disasLine() {
	const cmd= readProgramByte();
	const cmdIdx= Object.values(CMDS).findIndex(id=>id==cmd);
	const cmdName= Object.keys(CMDS)[cmdIdx];

	console.log(hexWord(addr),":", hexByte(cmd), "       ;", cmdName);

	switch(cmd) {
		case CMDS.END_FUNCTION: {
			break;
		}

		case CMDS.RETURN: {
			disasmExpr();
			break;
		}

		case CMDS.GOTO: {
			const lineIdx= readProgramWord();
			const line= prgLines.buffer[lineIdx] | (prgLines.buffer[lineIdx+1]<<8);
			console.log(hexWord(addr),":", hexWord(lineIdx), "  ;", line);
			break;
		}
		case CMDS.IF: {
			disasmExpr();
			disasLine();
			break;
		}
		case CMDS.FOR: {
			// disasmVar();
			let varIdx= readProgramWord();
			console.log(hexWord(addr),":", hexWord(varIdx), "  ; iterator", getVarName(varIdx));

			// varIdx= readProgramWord();
			// console.log(hexWord(addr),":", hexWord(varIdx), "  ;", getVar(varIdx));
			disasmExpr();

			// varIdx= readProgramWord();
			// console.log(hexWord(addr),":", hexWord(varIdx), "  ;", getVar(varIdx));
			disasmExpr();

			// varIdx= readProgramWord();
			// console.log(hexWord(addr),":", hexWord(varIdx), "  ;", getVar(varIdx));
			disasmExpr();
			break;
		}
		case CMDS.NEXT: {
			let varIdx= readProgramWord();
			console.log(hexWord(addr),":", hexWord(varIdx), "  ; iterator", getVarName(varIdx));
			break;
		}
		case CMDS.PRINT: {
			let sep;
			while(sep != TYPES.END) {
				disasmExpr();
				sep= readProgramByte();
				switch(sep) {
					case 0x09:
						dumpByte(sep, "tab");
						break;
					case 0x0A:
						dumpByte(sep, "no CR");
						break;
				}
				//dumpByte(readProgramByte(), "END");
			}
			break;
		}
		case CMDS.LET: {
			const varIdx= readProgramWord();
			console.log(hexWord(addr),":", hexWord(varIdx), "     ;", getVarName(varIdx)+" =");
			disasmExpr();
			break;
		}
		case CMDS.REM: {
			const strIdx= readProgramWord();
			console.log(hexWord(addr),":", hexWord(strIdx), "  ;", strings[strIdx]);
			break;
		}
		default: {
			disasmVar();
		}
	}
}

function dumpByte(b1, cmt) {
	console.log(hexWord(addr),":", hexByte(b1), cmt ? `       ;${cmt}` : "");
}

function dump2Bytes(b1, b2, cmt) {
	console.log(hexWord(addr),":", hexByte(b1), hexByte(b2), cmt ? `    ;${cmt}` : "");
}

function dumpWord(word, cmt) {
	console.log(hexWord(addr),":", hexWord(word), cmt ? `     ;${cmt}` : "");
}

function dumpByteWord(byte, word, cmt) {
	console.log(hexWord(addr),":", hexByte(byte), hexWord(word), cmt ? `  ;${cmt}` : "");
}

function disasmExpr() {
	while(true) {
		const memaddr= prgCursor;
		const itemType= readProgramByte();
		switch(itemType) {
			case TYPES.fn: {
				const fn= readProgramByte();
				// dumpByte(itemType, " function");
				let name;
				let nameIdx= Object.values(FNS).indexOf(fn);
				if(nameIdx>=0)
					name= Object.keys(FNS)[nameIdx] + "()";
				else {
					nameIdx= Object.values(OPERATORS).indexOf(fn);
					name= Object.keys(OPERATORS)[nameIdx];
				}
				addr= memaddr;
				dump2Bytes(itemType, fn, name);
				break;
			}
			case TYPES.string: {
				const str= readProgramWord();
				addr= memaddr;
				dumpByte(itemType, " string");
				dumpWord(str, '"' + strings[str]+ '"');
				break;
			}
			case TYPES.int: {
				const num= readProgramWord();
				addr= memaddr;
				dumpByteWord(itemType, num, "int: "+num);
				break;
			}
			case TYPES.var: {
				const v= readProgramByte();
				addr= memaddr;
				dumpByteWord(itemType, v, "var: "+getVarName(v));
				break;
			}
			case TYPES.CLOSE: {
				addr= memaddr;
				dumpByte(itemType, " )");
				break;
			}
			case TYPES.END: {
				addr= memaddr;
				dumpByte(itemType, " END OF EXPR");
				return;
			}
		}
	}
}

export function disasmPrg() {

	lineCursor= readBufferHeader(HEADER.START);
	while(lineCursor != 0xFFFF) {

		const lineNum= readLineWord();
		prgCursor= readLineWord();
		lineCursor= readLineWord();

		console.log("----  ", lineNum, hexWord(prgCursor), hexWord(lineCursor));

		if(prgCursor != 0xFFFF)
			disasLine();

		console.log("");
	}

}

export function dumpLines() {
	lineCursor= 0;
	while(lineCursor < prgLines.idx) {
		console.log(
			hexWord(lineCursor),":",
			readLineWord(),
			hexWord(readLineWord()),
			hexWord(readLineWord())
		);

	}
	console.log("");
}