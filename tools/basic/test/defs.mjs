
const identiferChars= "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
const numberChars= "0123456789";
const ws= " \t";

const SIZE= {
	byte: 1,
	word: 2,
}

const TYPES= {
	string: 1,
	int: 2,
	float: 3,
	var: 4,
	fn: 5,
	iterator: 6,
	END: 0xFF,
	CLOSE: 0xFE,
}

const CMDS= {
	REM: 0,
	PRINT: 1,
	LET: 2,
	IF: 0x30,
	THEN: 0x31,
	ELSE: 0x32,
	GOTO: 0x60,
	GOSUB: 0x61,
	INPUT: 8,
	FOR: 0x40,
	TO: 0x41,
	STEP: 0x42,
	NEXT: 0x43,
};

const OPERATORS= {
	MULT: 0xFF,
	DIV: 0xFE,
	ADD: 0xFD,
	SUB: 0xFC,
	LT: 0xFB,
	GT: 0xFA,
	EQ: 0xF9,
	NE: 0xF8,
	LTE: 0xF7,
	GTE: 0xF6,
};

const FNS= {
	INT: 100,
	RND: 101,
};

const ERRORS= {
	SYNTAX_ERROR: 0xDEAD,
	TYPE_MISMATCH: 0xCAFE
};

const prgCode= {
	buffer: new Uint8Array(255),
	idx: 0
};

const strings= [];
const vars= [];

const prgLines= {
	buffer: new Uint8Array(255),
	idx: 0
};

const headers= new Uint8Array(10);

let lexer= {
	buffer: "",
	idx: 0
};

export {
	lexer,
	identiferChars,
	numberChars,
	ws,
	headers,
	prgLines,
	strings,
	vars,
	prgCode,
	ERRORS,
	CMDS,
	FNS,
	OPERATORS,
	SIZE,
	TYPES
};
