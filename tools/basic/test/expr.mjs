import {
	ERRORS,
	FNS,
	OPERATORS,
	SIZE,
	TYPES,
	identiferChars,
	numberChars,
	ws,
	lexer
} from "./defs.mjs";
import { writeBufferProgram } from "./buffer.mjs";
import { addVar, findVar } from "./vars.mjs";
import { addString } from "./string.mjs";

export function nextToken(lookahead= false) {
	let currIdx= lexer.idx;

	// skip whitespaces
	while(currIdx<lexer.buffer.length && ws.includes(lexer.buffer[currIdx]))
		currIdx++;

	let idxSOT= currIdx;

	// check for string
	const isString= lexer.buffer[currIdx]=='"';

	if(isString) {
		while( ++currIdx<lexer.buffer.length && lexer.buffer[currIdx] != '"');
	} else {
		if(identiferChars.includes(lexer.buffer[currIdx++])) {
			while(currIdx<lexer.buffer.length && identiferChars.includes(lexer.buffer[currIdx])) {
				currIdx++;
			}
			if("$%".includes(lexer.buffer[currIdx]))
				currIdx++
		}
	}

	const token= lexer.buffer.slice(idxSOT, currIdx);

	console.log(lookahead ? "lookahead" : "nextToken",` <${token}> len:${token.length}`);

	if(!lookahead)
		lexer.idx= currIdx + (isString?1:0);

	return token.length ? token : null;
}

// export function parseExpr0() {

// 	function parseToken(tok) {
// 		if(tok ==")") {
// 			writeBufferProgram(SIZE.byte, TYPES.CLOSE);
// 			return 0;
// 		}

// 		if(numberChars.includes(tok[0])) {
// 			const num= parseInt(tok);
// 			writeBufferProgram(SIZE.byte, TYPES.int);
// 			writeBufferProgram(SIZE.word, num);
// 			return 0;
// 		}

// 		if(FNS.hasOwnProperty(tok.toUpperCase())) {
// 			const fn= FNS[tok.toUpperCase()];
// 			writeBufferProgram(SIZE.byte, TYPES.fn);
// 			writeBufferProgram(SIZE.byte, fn);
// 			if(fn >= 100 && nextToken() != "(")
// 				return ERRORS.syntax;
// 			return 0;
// 		}

// 		const v= findVar(tok);
// 		if(v>=0) {
// 			writeBufferProgram(SIZE.byte, TYPES.var);
// 			writeBufferProgram(SIZE.word, v);
// 			return 0;
// 		}

// 		return ERRORS.syntax;
// 	}

// 	let tok;
// 	while(tok= nextToken()) {
// 		const err= parseToken(tok);
// 		if(err)
// 			return err;
// 	}
// 	writeBufferProgram(SIZE.byte, TYPES.END);

// 	return 0;
// }

export function parseExpr() {
	const err= parseCmp();
	if(err)
		return err;

	return 0;
}

function parseCmp() {
	const err= parseAdd();
	if(err)
		return err;

	while(true) {
		const tok= nextToken(true);
		switch(tok) {
			case ">": {
				nextToken();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.GT);

				break;
			}
			case "<": {
				nextToken();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.LT);

				break;
			}
			case "=": {
				nextToken();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.EQ);

				break;
			}
			default:
				return 0
		}
	}

}

function parseAdd() {
	const err= parseProduct();
	if(err)
		return err;

	while(true) {
		const tok= nextToken(true);
		switch(tok) {
			case "+": {
				nextToken();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.ADD);

				break;
			}
			case "-": {
				nextToken();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.SUB);

				break;
			}
			default:
				return 0
		}
	}

}

function parseProduct() {
	const err= parseTerm();
	if(err)
		return err;

	while(true) {
		const tok= nextToken(true);
		switch(tok) {
			case "*": {
				nextToken();

				const err= parseTerm();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.MULT);
				break;
			}
			case "/": {
				nextToken();

				const err= parseTerm();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.DIV);
				break;
			}
			default:
				return 0
		}

	}
}

function parseTerm() {
	const tok= nextToken(true);
	if(!tok)
		return ERRORS.syntax;

	if(tok == ")")
		return;

	nextToken();

	if(numberChars.includes(tok[0])) {
		const num= parseInt(tok);
		writeBufferProgram(SIZE.byte, TYPES.int);
		writeBufferProgram(SIZE.word, num);
		return 0;
	}

	if(tok[0] == '"') {
		writeBufferProgram(SIZE.byte, TYPES.string);
		const idx= addString(tok.slice(1));
		writeBufferProgram(SIZE.word, idx);
		return 0;
	}

	if(tok == '(') {
		const err= parseExpr();
		if(err)
			return err;

		if(nextToken() != ")")
			return ERRORS.syntax;

		return 0;
	}

	if(FNS.hasOwnProperty(tok.toUpperCase())) {
		const fn= FNS[tok.toUpperCase()];
		if(nextToken() != "(")
			return ERRORS.syntax;

		const err= parseExpr();
		if(err)
			return err;

		if(nextToken() != ")")
			return ERRORS.syntax;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, fn);
		return 0;
	}

	if(nextToken(true) == "(") {
		nextToken();

		const err= parseExpr();
		if(err)
			return err;

		if(nextToken() != ")")
			return ERRORS.syntax;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, FNS.USER_DEF);
		return 0;
	}

	if(identiferChars.includes(tok[0])) {
		let varIdx= findVar(tok);
		if(varIdx<0) {
			varIdx= addVar(tok)
		}
		writeBufferProgram(SIZE.byte, TYPES.var);
		writeBufferProgram(SIZE.word, varIdx);
	}

	return 0;
	// return ERRORS.syntax;
}
