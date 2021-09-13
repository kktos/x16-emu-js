import {
	ERRORS,
	FNS,
	OPERATORS,
	SIZE,
	TYPES,
	numberChars,
} from "./defs.mjs";
import { writeBufferProgram } from "./buffer.mjs";
import { addVar, findVar, isVarArray, setVarFunction } from "./vars.mjs";
import { addString } from "./strings.mjs";
import { lexer } from "./lexer.mjs";

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
		const tok= lexer(true);
		switch(tok) {
			case ">": {
				lexer();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.GT);

				break;
			}
			case "<": {
				lexer();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.LT);

				break;
			}
			case "=": {
				lexer();

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
		const tok= lexer(true);
		switch(tok) {
			case "+": {
				lexer();

				const err= parseAdd();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.ADD);

				break;
			}
			case "-": {
				lexer();

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
		const tok= lexer(true);
		switch(tok) {
			case "*": {
				lexer();

				const err= parseTerm();
				if(err)
					return err;

				writeBufferProgram(SIZE.byte, TYPES.fn);
				writeBufferProgram(SIZE.byte, OPERATORS.MULT);
				break;
			}
			case "/": {
				lexer();

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
	const tok= lexer(true);
	if(!tok)
		return ERRORS.syntax;

	if(tok == ")")
		return;

	lexer();

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

		if(lexer() != ")")
			return ERRORS.syntax;

		return 0;
	}

	if(FNS.hasOwnProperty(tok.toUpperCase())) {
		const fn= FNS[tok.toUpperCase()];
		if(lexer() != "(")
			return ERRORS.syntax;

		const err= parseExpr();
		if(err)
			return err;

		if(lexer() != ")")
			return ERRORS.syntax;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, fn);
		return 0;
	}

	if(tok == '$') {
		const varName= lexer();
		const nameIdx= addString(varName);
		writeBufferProgram(SIZE.byte, TYPES.local);
		writeBufferProgram(SIZE.word, nameIdx);
		return 0;
	}

	const isFnCall= lexer(true) == "(";
	let varIdx= findVar(tok);
	if(varIdx<0) {
		varIdx= addVar(tok, 0);
		if(isFnCall)
			setVarFunction(varIdx);
	}

	if(isFnCall) {
		lexer();

		const err= parseExpr();
		if(err)
			return err;

		if(lexer() != ")")
			return ERRORS.syntax;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, FNS.USER_DEF);
		writeBufferProgram(SIZE.word, varIdx);

		return 0;
	}

	writeBufferProgram(SIZE.byte, TYPES.var);
	writeBufferProgram(SIZE.word, varIdx);

	if(isVarArray(varIdx)) {
		lexer();

		const err= parseExpr();
		if(err)
			return err;

		if(lexer() != ")")
			return ERRORS.syntax;

		writeBufferProgram(SIZE.byte, TYPES.fn);
		writeBufferProgram(SIZE.byte, FNS.GET_ITEM);

		// writeBufferProgram(SIZE.byte, TYPES.END);
	}

	return 0;
}
