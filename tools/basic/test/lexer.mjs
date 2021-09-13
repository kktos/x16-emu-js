import { source, identiferChars, ws, CMDS } from "./defs.mjs";

export function lexer(lookahead= false) {
	let currIdx= source.idx;

	// skip whitespaces
	while(currIdx<source.buffer.length && ws.includes(source.buffer[currIdx]))
		currIdx++;

	let idxSOT= currIdx;

	// check for string
	const isString= source.buffer[currIdx]=='"';

	if(isString) {
		while( ++currIdx<source.buffer.length && source.buffer[currIdx] != '"');
	} else {
		if(identiferChars.includes(source.buffer[currIdx++])) {
			while(currIdx<source.buffer.length && identiferChars.includes(source.buffer[currIdx])) {
				currIdx++;
			}
			if("$%".includes(source.buffer[currIdx]))
				currIdx++
		}
	}

	const token= source.buffer.slice(idxSOT, currIdx);

	// console.log(lookahead ? "lookahead" : "source",` <${token}> len:${token.length}`);

	if(!lookahead)
		source.idx= currIdx + (isString?1:0);

	return token.length ? token : null;
}

export function tokenizer(lookahead= false) {
	let token= lexer(lookahead);
	if(!token)
		return -1;
	token= token.toUpperCase();
	if(CMDS.hasOwnProperty(token))
		return CMDS[token];
	return -1;
}
