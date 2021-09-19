
const identiferChar0= "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const identiferChars= "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
const numberChars= ".0123456789";
const ws= " \t";

const SIZE= {
	byte: 1,
	word: 2,
	long: 3,
}

const TYPES= {
	string: 1,
	int: 2,
	float: 3,
	var: 4,
	fn: 5,
	iterator: 6,
	byte: 7,
	local: 8,


	END: 0x00,
	CLOSE: 0x60,

	// MASK
	SCALAR: 0x1F,
	FLAGS: 0xE0,

	FUNCTION: 0x20,
	ARRAY: 0x40,
	UNDECLARED: 0x80,
};

const CMDS= {
	REM: 0x00,
	DIM: 0x01,

	PRINT: 0x05,
	LET: 0x06,
	SET: 0x07,
	AS: 0x08,

	INPUT: 0x10,

	BYTE: 0x20,
	WORD: 0x21,
	INT: 0x22,
	LONG: 0x23,
	FLOAT: 0x24,
	STRING: 0x25,

	IF: 0x30,
	THEN: 0x31,
	ELSE: 0x32,

	FOR: 0x40,
	TO: 0x41,
	STEP: 0x42,
	NEXT: 0x43,

	GOTO: 0x50,
	GOSUB: 0x51,
	RETURN: 0x52,
	FUNCTION: 0x53,
	END_FUNCTION: 0x54,

	LIST: 0x60,

	"(": 0xE0,
	")": 0xE1,
	"$": 0xE2,
	"=": 0xE3,
	",": 0xE4,
	";": 0xE5,
	":": 0xE6,

	END: 0xFF,

};

const TOKENS = {
	LEFT_PARENT: CMDS["("],
	RIGHT_PARENT: CMDS[")"],
	DOLLAR: CMDS["$"],
	EQUAL: CMDS["="],
	COMMA: CMDS[","],
	SEMICOLON: CMDS[";"],
	COLON: CMDS[":"],

	_INT: 0xF0,
	_FLOAT: 0xF1,
	_STRING: 0xF2,
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
	USER_DEF: 0,
	GET_ITEM: 10,
	INT: 100,
	RND: 101,
	CHR$: 200,
};

const ERRORS= {
	SYNTAX_ERROR: 0xDEAD,
	TYPE_MISMATCH: 0xCAFE,
	UNKNOWN_FUNCTION: 0xFECA,
	UNDECLARED_VARIABLE: 0xCACA,
	OVERFLOW: 0xFEFE,
	DUPLICATE_NAME: 0xDAFE,
	LINE_MISSING: 0xDADA,
	UNKNOWN_STATEMENT: 0xDADE,
	ILLEGAL_STATEMENT: 0xDEDE,
	NOT_ENOUGH_PARMS: 0xDEAF,
	UNKNOWN_VARIABLE: 0xFEDE
};

const HEADER= {
	VERSION: 0,
	START: 2,
	VARS: 4,
	STRINGS: 6,
	LINES: 8,
	ARRAYS: 10,
};

const prgCode= {
	buffer: new Uint8Array(255),
	idx: 0
};

const prgLines= {
	buffer: new Uint8Array(255),
	idx: 0
};

const headers= new Uint8Array(12);

let source= {
	buffer: "",
	idx: 0
};

export {
	source,
	identiferChar0,
	identiferChars,
	numberChars,
	ws,
	headers,
	prgLines,
	prgCode,
	ERRORS,
	CMDS,
	TOKENS,
	FNS,
	OPERATORS,
	SIZE,
	TYPES,
	HEADER
};
