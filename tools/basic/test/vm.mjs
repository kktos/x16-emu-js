import { CMDS, SIZE, TYPES } from "./defs.mjs";
import { readBuffer, readBufferHeader, readBufferLine } from "./buffer.mjs";
import { hexWord, hexByte } from "./utils.mjs";
import { prgCode, strings, vars, ERRORS } from "./defs.mjs";
import { setVar, findIteratorVar, setIteratorVar, getIteratorVar, ITERATOR } from "./var.mjs";

let expr= {
	type: 0,
	value: 0
};
let program= {
	buffer: prgCode.buffer,
	idx: 0
};

/*
	headers: headers,
	lines: prgLines,
	code: prgCode,
	strings: strings,
	vars: vars,
*/
export function run(prg) {

	let err;
	let lineNum;
	let lineIdx= readBufferHeader(8);

	while(lineIdx != 0xFFFF) {
		lineNum= readBufferLine(lineIdx);
		program.idx= readBufferLine(lineIdx+2);
		lineIdx= readBufferLine(lineIdx+4);

		prg.lineNum= lineNum;

		// console.info("*** line", lineNum, hexWord(program.idx));

		if(program.idx == 0xFFFF) {
			err= `line ${lineNum} is missing`;
			break;
		}

		const cmd= readBuffer(program, SIZE.byte);

		// console.info("*** prg", hexWord(program.idx)," : ", hexByte(cmd));

		err= null;
		switch(cmd) {

			case CMDS.LET: {
				const err= assignVar();
				if(err)
					return err;
				break;
			}

			case CMDS.PRINT: {
				evalExpr();
				switch(expr.type) {
					case TYPES.string: {
						console.log(strings[expr.value]);
						break;
					}
					case TYPES.int: {
						console.log(expr.value);
						break;
					}
					case TYPES.float: {
						break;
					}
				}
				break;
			}

			case CMDS.FOR: {
				const iteratorIdx= readBuffer(program, SIZE.word);

				evalExpr();
				if(expr.type == TYPES.string)
					return ERRORS.TYPE_MISMATCH;

				const varIdx= getIteratorVar(iteratorIdx, ITERATOR.VAR);
				setVar(varIdx, expr.value);

				// upper bound
				evalExpr();
				setIteratorVar(iteratorIdx, ITERATOR.MAX, {type: expr.type, value: expr.value});

				// step
				evalExpr();
				setIteratorVar(iteratorIdx, ITERATOR.INC, {type: expr.type, value: expr.value});

				setIteratorVar(iteratorIdx, ITERATOR.PTR, lineIdx);

				break;
			}

			case CMDS.NEXT: {
				const iteratorIdx= readBuffer(program, SIZE.word);

				let inc= getIteratorVar(iteratorIdx, ITERATOR.INC).value;
				let max= getIteratorVar(iteratorIdx, ITERATOR.MAX).value;
				let varIdx= getIteratorVar(iteratorIdx, ITERATOR.VAR);

				const sum= addInt16(inc, vars[varIdx].value);
				setVar(varIdx, sum);

				if( cmpInt16( vars[varIdx].value, max, "<=") ) {
					lineIdx= getIteratorVar(iteratorIdx, ITERATOR.PTR);
				}

				break;
			}

			default: {
				err= "unknown statement";
				break;
			}

		}
		if(err)
			break;

	}

	if(err)
		console.error(err);
}

function addInt16(a ,b) {
	return a + b;
}

function cmpInt16(a ,b, op) {
	switch(op) {
		case "<=":
			return a <= b;
	}
	return false;
}

function assignVar(excluded= []) {
	const varIdx= readBuffer(program, SIZE.word);
	evalExpr();

	if(excluded.includes(expr.type))
		return ERRORS.TYPE_MISMATCH;

	switch(expr.type) {
		case TYPES.string: {
			setVar(varIdx, expr.value);
			break;
		}
		case TYPES.int: {
			setVar(varIdx, expr.value);
			break;
		}
		case TYPES.float: {
			setVar(varIdx, expr.value);
			break;
		}
	}
	return 0;
}

function evalExpr() {
	let itemType= 0;

	while(itemType != TYPES.END) {

		itemType= readBuffer(program, SIZE.byte);

		switch(itemType) {

			case TYPES.var: {
				const varIdx= readBuffer(program, SIZE.byte);
				const v= vars[varIdx];

				expr.type= v.varType;
				switch(v.varType) {
					case TYPES.int: {
						expr.value= v.value;
						break;
					}
					case TYPES.float: {
						expr.value= v.value;
						break;
					}
					case TYPES.string: {
						expr.value= v.value;
						break;
					}
				}

				break;
			}

			case TYPES.string: {
				const strIdx= readBuffer(program, SIZE.word);
				expr.type= TYPES.string;
				expr.value= strIdx;
				break;
			}

			case TYPES.int: {
				const num= readBuffer(program, SIZE.word);
				expr.type= TYPES.int;
				expr.value= num;
				break;
			}

		}
	}
}
