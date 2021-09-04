import { CMDS, SIZE, TYPES } from "./defs.mjs";
import { readBuffer, readBufferHeader, readBufferLine } from "./buffer.mjs";
import { hexWord, hexByte } from "./utils.mjs";
import { prgCode, strings, ERRORS, HEADER } from "./defs.mjs";
import { setVar, setIteratorVar, getIteratorVar, ITERATOR, getVarType, getVar } from "./vars.mjs";
import { OPERATORS, FNS } from "./defs.mjs";
import { addString, setTempStrings, resetTempStrings } from "./string.mjs";

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
	let lineIdx= readBufferHeader(HEADER.START);
	setTempStrings();

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

		// console.info("*** prg", Object.keys(CMDS)[Object.values(CMDS).indexOf(cmd)]);
		// console.info("*** prg", hexWord(program.idx)," : ", hexByte(cmd));

		err= null;
		switch(cmd) {

			case CMDS.REM: {
				readBuffer(program, SIZE.word);
				break;
			}

			case CMDS.END: {
				return;
			}

			case CMDS.LET: {
				const err= assignVar();
				if(err)
					return err;
				break;
			}

			case CMDS.IF: {
				const err= evalExpr();
				if(err)
					return err;

				if(!expr.value)
					break;

				readBuffer(program, SIZE.byte);
			}

			case CMDS.GOTO: {
				lineIdx= readBuffer(program, SIZE.word);
				break;
			}

			case CMDS.PRINT: {
				let sep;

				while(sep != TYPES.END) {
					let outStr= "";
					const err= evalExpr();
					if(err)
						return err;

					switch(expr.type) {
						case TYPES.string: {
							outStr+= strings[expr.value];
							break;
						}
						case TYPES.int: {
							outStr+= expr.value;
							break;
						}
						case TYPES.float: {
							break;
						}
					}

					process.stdout.write(outStr);

					sep= readBuffer(program, SIZE.byte);
					switch(sep) {
						case 0x09: {
							process.stdout.write("\t");
							sep= readBuffer(program, SIZE.byte, true);
							break;
						}
						case 0x0A: {
							sep= readBuffer(program, SIZE.byte, true);
							break;
						}
						default: {
							process.stdout.write("\n");
							break;
						}
					}
				}

				break;
			}

			case CMDS.FOR: {
				const iteratorIdx= readBuffer(program, SIZE.word);

				let err= evalExpr();
				if(err)
					return err;
				if(expr.type == TYPES.string)
					return ERRORS.TYPE_MISMATCH;

				const varIdx= getIteratorVar(iteratorIdx, ITERATOR.VAR);
				setVar(varIdx, expr.value);

				// upper bound
				err= evalExpr();
				if(err)
					return err;
				setIteratorVar(iteratorIdx, ITERATOR.MAX, expr.value);

				// step
				err= evalExpr();
				if(err)
					return err;
				setIteratorVar(iteratorIdx, ITERATOR.INC, expr.value);

				setIteratorVar(iteratorIdx, ITERATOR.PTR, lineIdx);

				break;
			}

			case CMDS.NEXT: {
				const iteratorIdx= readBuffer(program, SIZE.word);

				let inc= getIteratorVar(iteratorIdx, ITERATOR.INC);
				let max= getIteratorVar(iteratorIdx, ITERATOR.MAX);
				let varIdx= getIteratorVar(iteratorIdx, ITERATOR.VAR);

				const sum= addInt16(inc, getVar(varIdx));

				if( cmpInt16( sum, max, "<=") ) {
					setVar(varIdx, sum);
					lineIdx= getIteratorVar(iteratorIdx, ITERATOR.PTR);
				}

				break;
			}

			default: {
				err= `unknown statement ${hexByte(cmd)}`;
				break;
			}

		}
		if(err)
			break;

		resetTempStrings();

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
		case "<":
			return a < b;
		case "<>":
			return a != b;
	}
	return false;
}

function assignVar(excluded= []) {
	const varIdx= readBuffer(program, SIZE.word);
	const err= evalExpr();
	if(err)
		return err;

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
	const exprStack= [];

	while(true) {

		const itemType= readBuffer(program, SIZE.byte);
		if(itemType == TYPES.END)
			break;

		switch(itemType) {

			case TYPES.var: {
				const varIdx= readBuffer(program, SIZE.word);
				expr.type= getVarType(varIdx);
				switch(expr.type) {
					case TYPES.int: {
						expr.value= getVar(varIdx);
						break;
					}
					case TYPES.float: {
						expr.value= getVar(varIdx);
						break;
					}
					case TYPES.string: {
						expr.value= getVar(varIdx);
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

			case TYPES.fn: {
				const fnIdx= readBuffer(program, SIZE.byte);
				const err= execFn(fnIdx, exprStack);
				if(err)
					return err;
				continue;
			}

		}
		exprStack.push({type: expr.type, value: expr.value});
	}

	// console.log("\n---- expr", exprStack);
	expr= exprStack.length ? exprStack.pop() : expr;
	return 0;
}

function execFn(fn, exprStack) {

	switch(fn) {
		case OPERATORS.ADD: {
			const op1= exprStack.pop();
			const op2= exprStack.pop();
			exprStack.push({type: op1.type, value: op1.value + op2.value});
			break;
		}
		case OPERATORS.SUB: {
			const op1= exprStack.pop();
			const op2= exprStack.pop();
			exprStack.push({type: op1.type, value: op2.value - op1.value});
			break;
		}
		case OPERATORS.MULT: {
			const op1= exprStack.pop();
			const op2= exprStack.pop();
			exprStack.push({type: op1.type, value: op1.value * op2.value});
			break;
		}
		case OPERATORS.GT: {
			const op1= exprStack.pop();
			const op2= exprStack.pop();
			exprStack.push({type: op1.type, value: op2.value > op1.value});
			break;
		}
		case FNS.CHR$: {
			const op1= exprStack.pop();
			op1.type= TYPES.string;
			op1.value= addString(String.fromCharCode(op1.value));
			exprStack.push(op1);
			break;
		}
		default:
			return ERRORS.UNKNOWN_FUNCTION
	}

	return 0;

}
