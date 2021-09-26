import { readBufferHeader } from "./buffer.mjs";
import { HEADER, TYPES, FNS, OPERATORS, prgLines, prgCode, CMDS } from "./defs.mjs";
import { EnumToName } from "./utils.mjs";
import { getVarName, getVar } from "./vars.mjs";
import { getString } from "./strings.mjs";
import { getArraySize } from "./arrays.mjs";

let prgCursor= 0;
let lineCursor= 0;
let indentStr= " ";

function readProgramByte(lookahead= false) {
	return prgCode.buffer[lookahead ? prgCursor : prgCursor++];
}

function readProgramWord() {
	return prgCode.buffer[prgCursor++] | (prgCode.buffer[prgCursor++]<<8);
}

function readLineWord() {
	return prgLines.buffer[lineCursor++] | (prgLines.buffer[lineCursor++]<<8);
}

function printVar() {
	// const varType= readProgramByte();
	// console.log(hexWord(addr),":", hexByte(varType), "  ;");
	// switch(varType & TYPES.SCALAR) {
	// 	case TYPES.string: {
	// 		const strIdx= readProgramWord();
	// 		console.log(hexWord(addr),":", hexWord(strIdx), "  ;", strings[strIdx]);
	// 		break;
	// 	}
	// 	case TYPES.var: {
	// 		const strIdx= readProgramWord();
	// 		console.log(hexWord(addr),":", hexWord(strIdx), "  ;", getVar(strIdx));
	// 		break;
	// 	}
	// }
}

function printExpr() {
	let out= "";

	while(true) {
		const itemType= readProgramByte();
		switch(itemType) {
			case TYPES.fn: {
				const fn= readProgramByte();
				let name;
				let nameIdx= Object.values(FNS).indexOf(fn);
				if(nameIdx>=0)
					name= Object.keys(FNS)[nameIdx] + "()";
				else {
					nameIdx= Object.values(OPERATORS).indexOf(fn);
					name= Object.keys(OPERATORS)[nameIdx];
				}
				if(fn == FNS.USER_DEF) {
					const varIdx= readProgramWord();
					name= getVarName(varIdx) + "()";
				}

				out+= name;

				break;
			}
			case TYPES.string: {
				const strIdx= readProgramWord();
				out+= `"${getString(strIdx)}"`;
				break;
			}
			case TYPES.int: {
				const num= readProgramWord();
				out+= num;
				break;
			}
			case TYPES.float: {
				const buffer= new Uint8Array(4);
				const view= new DataView(buffer.buffer);
				for(let idx= 0; idx<4; idx++) {
					view.setInt8(idx, readProgramByte());
				}
				out+= view.getFloat32(0);
				break;
			}
			case TYPES.var: {
				const v= readProgramWord();
				out+= getVarName(v);
				break;
			}
			case TYPES.local: {
				const strIdx= readProgramWord();
				out+= "$"+getString(strIdx);
				break;
			}
			case TYPES.CLOSE: {
				out+= ")";
				break;
			}
			case TYPES.END: {
				return out;
			}
		}
		out+= " ";
	}

}

function printLine(lineNum) {
	const cmd= readProgramByte();
	const cmdIdx= Object.values(CMDS).findIndex(id=>id==cmd);
	const cmdName= Object.keys(CMDS)[cmdIdx];
	let out= "";
	let wannaIndent= false;

	switch(cmd) {
		case CMDS.FUNCTION: {
			let varIdx= readProgramWord();
			let parmCount= readProgramByte();
			out+= getVarName(varIdx)+"(";
			for(let idx= 1; idx<=parmCount; idx++) {
				const parm= readProgramWord();
				const type= readProgramByte();
				out+= "$"+getString(parm)+": "+EnumToName(TYPES, type);
			}
			out+= ")";

			wannaIndent= true;
			break;
		}
		case CMDS.END: {
			out+= "\n";
			break;
		}
		case CMDS.END_FUNCTION: {
			indentStr= " ";
			break;
		}

		case CMDS.RETURN: {
			out+= printExpr();
			break;
		}

		case CMDS.GOTO: {
			const lineIdx= readProgramWord();
			const line= prgLines.buffer[lineIdx] | (prgLines.buffer[lineIdx+1]<<8);
			out+= line;
			break;
		}
		case CMDS.IF: {
			out+= printExpr();
			printLine();
			break;
		}
		case CMDS.FOR: {
			let varIdx= readProgramWord();
			out+= getVarName(varIdx)+"= ";
			out+= printExpr();
			out+= "TO ";
			out+= printExpr();
			out+= "STEP ";
			out+= printExpr();
			wannaIndent= true;
			break;
		}
		case CMDS.NEXT: {
			let varIdx= readProgramWord();
			out+= getVarName(varIdx);
			indentStr= " ";
			break;
		}
		case CMDS.PRINT: {
			let sep;
			while(sep != TYPES.END) {
				out+= printExpr();
				sep= readProgramByte();
				switch(sep) {
					case 0x09:
						out+= ",";
						break;
					case 0x0A:
						out+= ";";
						break;
				}
			}
			break;
		}
		case CMDS.LET: {
			const varIdx= readProgramWord();
			out+= getVarName(varIdx)+"= ";
			out+= printExpr();
			break;
		}
		case CMDS.SET: {
			const varIdx= readProgramWord();
			out += getVarName(varIdx) + "[";
			out+= printExpr();
			out+= "]=  ";
			out+= printExpr();
			break;
		}
		case CMDS.DIM: {
			const varIdx= readProgramWord();
			const arrayIdx= getVar(varIdx);
			const arraySize= getArraySize(arrayIdx);
			out += getVarName(varIdx) + "[" + arraySize + "]";
			break;
		}
		case CMDS.REM: {
			const strIdx= readProgramWord();
			out+= getString(strIdx);
			break;
		}
		default: {
			printVar();
		}
	}

	out= String(lineNum).padStart(3," ") +
			indentStr +
			cmdName +
			" " +
			out;

	if(wannaIndent)
		indentStr= "    ";
	return out;
}

export function list(fromLine= 0, toLine= 0) {

	lineCursor= readBufferHeader(HEADER.START);
	while(lineCursor != 0xFFFF) {
		const lineNum= readLineWord();
		prgCursor= readLineWord();
		lineCursor= readLineWord();
		if(prgCursor != 0xFFFF)
			console.log(printLine(lineNum));
	}

}
