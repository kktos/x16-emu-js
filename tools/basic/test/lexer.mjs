import { TOKENS } from "./defs.mjs";
import { source, identiferChar0, identiferChars, numberChars, ws, CMDS } from "./defs.mjs";
import { hexByte } from "./utils.mjs";

export let isString= false;
export let isIdentifer= false;
export let isNumber= false;
export let isFloat= false;
export let lexeme= null;

export function advance() {

	// skip whitespaces
	while(source.idx < source.buffer.length && ws.includes(source.buffer[source.idx]))
		source.idx++;

	const ch= source.buffer[source.idx++];

	if( ch == '"' ) {
		while( source.idx++ < source.buffer.length && source.buffer[source.idx] != '"');
		source.idx++;
		return;
	}

	if(identiferChar0.includes(ch)) {
		while(source.idx<source.buffer.length && identiferChars.includes(source.buffer[source.idx]))
			source.idx++;

		if("$%".includes(source.buffer[source.idx]))
			source.idx++

		return;
	}

	if(numberChars.includes(ch)) {
		while(source.idx<source.buffer.length && numberChars.includes(source.buffer[source.idx]))
			source.idx++;
		return;
	}

}

export function lexer(lookahead= false) {
	let currIdx= source.idx;

	// skip whitespaces
	while(currIdx<source.buffer.length && ws.includes(source.buffer[currIdx]))
		currIdx++;

	let idxSOT= currIdx;

	const ch= source.buffer[currIdx++];

	// check for string
	isString= ch == '"';
	isIdentifer= identiferChar0.includes(ch);
	isNumber= numberChars.includes(ch);

	if(isString) {
		while( currIdx++ < source.buffer.length && source.buffer[currIdx] != '"');
	}

	if(isIdentifer) {
		while(currIdx<source.buffer.length && identiferChars.includes(source.buffer[currIdx]))
			currIdx++;

		if("$%".includes(source.buffer[currIdx]))
			currIdx++
	}

	if(isNumber) {
		isFloat= ch == ".";
		while(currIdx<source.buffer.length && numberChars.includes(source.buffer[currIdx])) {
			if(source.buffer[currIdx] == ".")
				isFloat= true;
			currIdx++;
		}
		if(source.buffer[currIdx] == "f") {
			isFloat= true;
			currIdx++
		}
	}

	lexeme= source.buffer.slice(idxSOT, currIdx);

	// console.log(lookahead ? "lookahead" : "source",` <${lexeme}> len:${lexeme.length}`);

	if(!lookahead)
		source.idx= currIdx + (isString?1:0);

	return lexeme.length ? lexeme : null;
}

export function tokenizer0(lookahead= false) {
	let token= lexer(lookahead);
	if(!token)
		return -1;
	if(isString)
		return TOKENS._STRING;
	if(isNumber)
		return isFloat ? TOKENS._FLOAT : TOKENS._INT;

	token= token.toUpperCase();
	if(CMDS.hasOwnProperty(token))
		return CMDS[token];
	return -1;
}

export function tokenizer(lookahead= false) {
	let tok= tokenizer0(lookahead);
	// console.log("tokenizer", hexByte(tok));
	return tok;
}
