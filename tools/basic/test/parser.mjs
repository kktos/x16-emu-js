import { hexWord, hexdump } from "./utils.mjs";
import { disasmPrg, dumpLines } from "./disasm.mjs";
import {
	headers,
	prgLines,
	strings,
	vars,
	prgCode,
	ERRORS,
	CMDS,
	SIZE,
	TYPES,
	lexer,
} from "./defs.mjs";
import { parseExpr, nextToken } from "./expr.mjs";
import { writeBufferProgram, writeBufferHeader, writeBufferLine } from "./buffer.mjs";
import { addVar, findVar, addIteratorVar, setIteratorVar, findIteratorVar, ITERATOR } from "./var.mjs";
import { addString } from "./string.mjs";

let currentLineNum;

export function parseSource(src) {
	const lines= src.split("\n");

	// version
	writeBufferHeader(0, 0x0001);
	// start lexer.buffer idx
	writeBufferHeader(8, 0xFFFF);

	lines.forEach(v => {
		lexer.idx= 0;
		lexer.buffer= v;
		const err= parseLine();
		if(err) {
			console.error("ERR", hexWord(err), ` at ${currentLineNum} : <${lexer.buffer.slice(lexer.idx)}>`);
			dump();
			return null;
		}
	});

	// clear screen
	// process.stdout.write('\0o33c');

	dump(lines);

	return {
		headers: headers,
		lines: prgLines,
		code: prgCode,
		strings: strings,
		vars: vars,
	}

}

function dump(lines) {
	console.log(lines);
	console.log("");
	console.log("----------- HEADER");
	console.log("");
	console.log(hexdump(headers, 0, 10, 2));

	console.log("");
	console.log("----------- STRINGS");
	console.log("");
	console.log(strings);

	console.log("");
	console.log("----------- VARS");
	console.log("");
	console.log(vars);

	console.log("");
	console.log("----------- CODE");
	console.log("");
	console.log(hexdump(prgCode.buffer, 0, prgCode.idx));
	console.log("");

	console.log("----------- LINES");
	console.log("");
	dumpLines();

	disasmPrg();
}

function parseGoto() {
	const linenum= parseNum();
	let lineIdx= findPrgLine(linenum);
	if(lineIdx<0)
		lineIdx= addPrgLine(linenum, 0xFFFF);
	writeBufferProgram(SIZE.word, lineIdx);
}

function parseLine() {

	const tok= nextToken();
	if(tok == null)
		return;

	currentLineNum= parseNum(tok);
	if(isNaN(currentLineNum))
		return ERRORS.SYNTAX_ERROR;

	const cmd= parseCmd();
	if(cmd == -1)
		return ERRORS.SYNTAX_ERROR;

	addPrgLine(currentLineNum, prgCode.idx);
	writeBufferProgram(SIZE.byte, cmd);

	switch(cmd) {
		case CMDS.LET: {
			const varName= nextToken();

			const varIdx= addVar(varName);
			writeBufferProgram(SIZE.word, varIdx);

			if(nextToken() != "=")
				return ERRORS.SYNTAX_ERROR;

			const err= parseExpr();
			if(err)
				return err;
			writeBufferProgram(SIZE.byte, TYPES.END);

			break;
		}
		case CMDS.REM: {
			const str= parseString();
			const idx= addString(str);
			writeBufferProgram(SIZE.word, idx);
			break;
		}
		case CMDS.GOTO:
		case CMDS.GOSUB: {
			parseGoto();
			break;
		}

		case CMDS.FOR: {
			const varName= nextToken();
			let varIdx= findVar(varName);
			if(varIdx<0) {
				varIdx= addVar(varName)
			}
			let iteratorIdx= addIteratorVar(varIdx);
			writeBufferProgram(SIZE.word, iteratorIdx);

			setIteratorVar(iteratorIdx, ITERATOR.VAR, varIdx);

			if(nextToken() != "=")
				return ERRORS.SYNTAX_ERROR;

			let err= parseExpr();
			if(err)
				return err;
			writeBufferProgram(SIZE.byte, TYPES.END);

			if(parseCmd() != CMDS.TO)
				return ERRORS.SYNTAX_ERROR;

			err= parseExpr();
			if(err)
				return err;
			writeBufferProgram(SIZE.byte, TYPES.END);

			if(parseCmd(true) == CMDS.STEP) {
				nextToken();
				err= parseExpr();
				if(err)
					return err;
			} else {
				writeBufferProgram(SIZE.byte, TYPES.int);
				writeBufferProgram(SIZE.word, 1);
			}
			writeBufferProgram(SIZE.byte, TYPES.END);

			break;
		}

		case CMDS.NEXT: {
			const varName= nextToken();

			let varIdx= findVar(varName);
			if(varIdx<0)
				varIdx= addVar(varName);

			let iteratorIdx= findIteratorVar(varIdx);
			if(iteratorIdx<0)
				iteratorIdx= addIteratorVar(varIdx);
			writeBufferProgram(SIZE.word, iteratorIdx);
			break;
		}

		case CMDS.PRINT: {
			let tok;
			let hasMore= false;
			do {
				const err= parseExpr();
				if(err)
					return err;
				writeBufferProgram(SIZE.byte, TYPES.END);

				tok= nextToken();
				hasMore= false;
				switch(tok) {
					case ",":
						hasMore= true;
						writeBufferProgram(SIZE.byte,0x09);
						break;
					case ";":
						hasMore= true;
						writeBufferProgram(SIZE.byte,0x0A);
						break;
				}
			} while(hasMore);
			writeBufferProgram(SIZE.byte, TYPES.END);

			break;
		}

		case CMDS.IF: {
			const err= parseExpr();
			if(err)
				return err;

			if(parseCmd() != CMDS.THEN)
				return ERRORS.SYNTAX_ERROR;

			writeBufferProgram(SIZE.byte, TYPES.END);

			writeBufferProgram(SIZE.byte, CMDS.GOTO);
			parseGoto();
			break;
		}

		default: {
			const err= parseParms();
			if(err)
				return err;
		}
	}

	// console.log(currentLineNum, cmd);
	return 0;
}

function parseNum(tok) {
	const intStr= tok != undefined ? tok : nextToken();
	return parseInt(intStr);
}

function parseCmd(lookahead= false) {
	const cmdStr= nextToken(lookahead);
	if(!cmdStr)
		return -1;

	if(CMDS.hasOwnProperty(cmdStr.toUpperCase()))
		return CMDS[cmdStr.toUpperCase()];
	return -1;
}

function parseString() {
	return lexer.buffer.slice(lexer.idx);
}

function addPrgLine(lineNum, offset) {

	let lineIdx= findPrgLine(lineNum);
	if(lineIdx >= 0) {
		prgLines.buffer[lineIdx+2]= offset & 0xff;
		prgLines.buffer[lineIdx+3]= (offset >> 8) & 0xff;
		return lineIdx;
	}

	// console.log("addPrgLine", lineNum, hexWord(offset));

	const currLineIdx= prgLines.idx;

	let min= 0;
	let minIdx= -1;
	for(let idx= 0; idx<currLineIdx; idx+=6) {
		const currLineNum= prgLines.buffer[idx] | (prgLines.buffer[idx+1]<<8);
		if( (currLineNum < lineNum && currLineNum > min)) {
			min= currLineNum;
			minIdx= idx;
		}
	}

	let nextLineIdx= 0xFFFF;

	if(minIdx == -1) {
		nextLineIdx= headers[8] | (headers[9]<<8);
		writeBufferHeader(8, currLineIdx);
		// console.log("addPrgLine start", hexWord(nextLineIdx));
	} else {
		nextLineIdx= prgLines.buffer[minIdx+4] | (prgLines.buffer[minIdx+5]<<8);
		writeBufferLine(currLineIdx, minIdx+4);
		// console.log("addPrgLine prev", min, hexWord(minIdx));
	}


	lineIdx= prgLines.idx;
	writeBufferLine(lineNum);
	writeBufferLine(offset);
	writeBufferLine(nextLineIdx);

	// console.log(hexdump(prgLines.buffer, 0, prgLines.idx, 6));
	return lineIdx;
}

function findPrgLine(lineNum) {
	for(let idx= 0; idx<prgLines.idx; idx+=6) {
		const currLineNum= prgLines.buffer[idx] | (prgLines.buffer[idx+1]<<8);
		if(currLineNum == lineNum)
			return idx;
	}
	return -1;
}

function parseVar(tok) {
	let varIdx= findVar(tok);
	if(varIdx<0) {
		varIdx= addVar(tok)
	}
	writeBufferProgram(SIZE.word, varIdx);
	return varIdx;
}

function parseParms() {
	let tok= nextToken();

	if(!tok)
		return ERRORS.SYNTAX_ERROR;

	// string
	if(tok[0] == '"') {
		writeBufferProgram(SIZE.byte, TYPES.string);
		const idx= addString(tok.slice(1));
		writeBufferProgram(SIZE.word, idx);
		return;
	}

	// function

	// var
	writeBufferProgram(SIZE.byte, TYPES.var);
	parseVar(tok);

	return 0;
}
