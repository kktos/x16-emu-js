import { CMDS, SIZE, TYPES } from "./defs.mjs";
import { readBuffer, readBufferHeader, readBufferLine } from "./buffer.mjs";
import { hexWord, hexByte } from "./utils.mjs";
import { prgCode, ERRORS, HEADER } from "./defs.mjs";
import {
	setVar, setIteratorVar, getIteratorVar, ITERATOR, getVarType, getVar,
	isVarFunction, isVarDeclared, getVarName
} from "./vars.mjs";
import { setArrayItem, getArrayItem } from "./arrays.mjs";
import { OPERATORS, FNS } from "./defs.mjs";
import { addString, setTempStrings, resetTempStrings, getString } from "./strings.mjs";

let expr= {
	type: 0,
	value: 0
};
let program= {
	buffer: prgCode.buffer,
	idx: 0
};
let context;

/*
	headers: headers,
	lines: prgLines,
	code: prgCode,
	strings: strings,
	vars: vars,
*/
export function run(prg) {
	context= {...prg};
	context.lineIdx= readBufferHeader(HEADER.START);
	context.level= 0;
	context.returnExpr= null;

	setTempStrings(context.lineIdx);

	return execStatements(context);
}

function execStatements(context) {
	let lineNum;
	let err;

	while(context.lineIdx != 0xFFFF) {
		lineNum= readBufferLine(context.lineIdx);
		program.idx= readBufferLine(context.lineIdx+2);
		context.lineIdx= readBufferLine(context.lineIdx+4);

		context.lineNum= lineNum;

		// console.info("*** line", lineNum, hexWord(program.idx));

		if(program.idx == 0xFFFF)
			return ERRORS.LINE_MISSING;

		const cmd= readBuffer(program, SIZE.byte);

		// console.info("*** prg", Object.keys(CMDS)[Object.values(CMDS).indexOf(cmd)]);
		// console.info("*** prg", hexWord(program.idx)," : ", hexByte(cmd));

		switch(cmd) {

			case CMDS.FUNCTION: {
				// function could be run only on call (level>0)
				if(!context.level)
					return ERRORS.ILLEGAL_STATEMENT;
				break;
			}

			case CMDS.RETURN: {
				// return only from a function (level>0)
				if(!context.level)
					return ERRORS.ILLEGAL_STATEMENT;

				err= evalExpr();
				if(err)
					return err;

				context.returnExpr= expr;
				return;
			}

			case CMDS.END_FUNCTION: {
				// return only from a function (level>0)
				if(!context.level)
					return ERRORS.ILLEGAL_STATEMENT;

				context.returnExpr= {type: 0, value: 0};
				return;
			}

			case CMDS.DIM:
			case CMDS.REM: {
				readBuffer(program, SIZE.word);
				break;
			}

			case CMDS.END: {
				// allowed only on main prg, not in functions
				if(context.level)
					return ERRORS.ILLEGAL_STATEMENT;

				return;
			}

			case CMDS.LET: {
				err= assignVar();
				if(err)
					return err;
				break;
			}

			case CMDS.SET: {
				// console.log("SET", prgCode);
				err= assignArrayItem();
				if(err)
					return err;
				break;
			}

			case CMDS.IF: {
				err= evalExpr();
				if(err)
					return err;

				if(!expr.value)
					break;

				readBuffer(program, SIZE.byte);
			}

			case CMDS.GOTO: {
				context.lineIdx= readBuffer(program, SIZE.word);
				break;
			}

			case CMDS.PRINT: {
				let sep;

				while(sep != TYPES.END) {
					let outStr= "";
					err= evalExpr();
					if(err)
						return err;

					switch(expr.type) {
						case TYPES.string: {
							outStr+= getString(expr.value);
							break;
						}
						case TYPES.byte:
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

				err= evalExpr();
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

				setIteratorVar(iteratorIdx, ITERATOR.PTR, context.lineIdx);

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
					context.lineIdx= getIteratorVar(iteratorIdx, ITERATOR.PTR);
				}

				break;
			}

			default:
				return ERRORS.UNKNOWN_STATEMENT;

		}

		resetTempStrings();

	}

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
	let err= evalExpr();
	if(err)
		return err;

	// err= evalExpr();
	// if(err)
	// 	return err;

	if(excluded.includes(expr.type))
		return ERRORS.TYPE_MISMATCH;

	setVar(varIdx, expr.value);

	// switch(expr.type) {
	// 	case TYPES.string: {
	// 		setVar(varIdx, expr.value);
	// 		break;
	// 	}
	// 	case TYPES.int: {
	// 		setVar(varIdx, expr.value);
	// 		break;
	// 	}
	// 	case TYPES.float: {
	// 		setVar(varIdx, expr.value);
	// 		break;
	// 	}
	// }
	return 0;
}

function assignArrayItem() {
	const varIdx= readBuffer(program, SIZE.word);
	let err= evalExpr();
	if(err)
		return err;

	if(expr.type != TYPES.int)
		return ERRORS.TYPE_MISMATCH;

	const idx= expr.value;

	err= evalExpr();
	if(err)
		return err;

	const arrayIdx= getVar(varIdx);
	err= setArrayItem(getVarType(varIdx), arrayIdx, idx, expr.value);
	if(err)
		return err;
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

				// console.log("evalExpr", getVarName(varIdx), hexWord(getVarType(varIdx)));

				const isDeclared= isVarDeclared(varIdx);
				const isFunction= isVarFunction(varIdx);

				if(isFunction) {
					if(!isDeclared)
						return ERRORS.UNKNOWN_FUNCTION;

					const lineIdx= context.lineIdx;
					const prgIdx= program.idx;

					context.level++;
					context.lineIdx= getVar(varIdx);

					const err= execStatements(context);
					if(err)
						return err;

					context.level--;
					program.idx= prgIdx;
					context.lineIdx= lineIdx;

					expr= context.returnExpr;

					break;
				}

				expr.type= getVarType(varIdx);// & 0x3F;
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
					default: {
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
		case FNS.GET_ITEM: {
			const op1= exprStack.pop();
			const arr= exprStack.pop();

			if((op1.type != TYPES.int) && !(arr.type & TYPES.ARRAY))
				return ERRORS.TYPE_MISMATCH;

			arr.type= arr.type & 0x3F;
			arr.value= getArrayItem(arr.type, arr.value, op1.value);
			exprStack.push(arr);
			break;
		}
		default:
			return ERRORS.UNKNOWN_FUNCTION
	}

	return 0;

}
