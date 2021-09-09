import { TYPES } from "./defs.mjs";
import { addString, getString, dumpStrings } from "./strings.mjs";
import { hexByte, hexWord, hexdump, EnumToName } from "./utils.mjs";
import { getArraySize } from "./arrays.mjs";

// 2: namedIdx
// 2: type
// 2: int / string
// x: float
// x: iterator
const VAR_RECORD_SIZE= 1 + 2 + 2;
const varsBuffer= new Uint8Array(50*VAR_RECORD_SIZE+2);
const FIELDS= {
	TYPE: 0,
	NAME: 1,
	VALUE: 3
};
export const ITERATOR= {
	VAR: 1,
	INC: 3,
	MAX: 6,
	PTR: 8
};

for(let idx=0; idx<varsBuffer.length; idx++)
	varsBuffer[idx]= 0xFF;
writeWord(0, 0);

function readWord(idx) {
	return varsBuffer[idx] | varsBuffer[idx+1] << 8;
}

function writeWord(idx, word) {
	varsBuffer[idx]= word & 0xFF;
	varsBuffer[idx+1]= word >> 8 & 0xFF;
}

function readVarByte(idx, field) {
	idx= idx * VAR_RECORD_SIZE + field + 2;
	return varsBuffer[idx];
}

function writeVarByte(idx, field, byte) {
	// console.log("writeVarByte", idx, EnumToName(FIELDS, field), byte);

	idx= idx * VAR_RECORD_SIZE + field + 2;
	varsBuffer[idx]= byte & 0xFF;

	// console.log(hexdump(varsBuffer, 2, readWord(0)*VAR_RECORD_SIZE+2, 5));
}

function readVarWord(idx, field) {
	idx= idx * VAR_RECORD_SIZE + field + 2;
	return varsBuffer[idx] | varsBuffer[idx+1] << 8;
}

function writeVarWord(idx, field, word) {
	// console.log("writeVarWord", idx, EnumToName(FIELDS, field), word);

	idx= idx * VAR_RECORD_SIZE + field + 2;
	varsBuffer[idx]= word & 0xFF;
	varsBuffer[idx+1]= word >> 8 & 0xFF;

// console.log(hexdump(varsBuffer, 2, readWord(0)*VAR_RECORD_SIZE+2, 5));
}

export function addVar(name, isArray= false, isDeclared= false) {
	let varType;
	switch(name[name.length-1]) {
		case "$":
			varType= TYPES.string;
			break;
		case "%":
			varType= TYPES.int;
			break;
		default:
			varType= TYPES.float;
	}

	let count= readWord(0);
	writeWord(0, count + 1);

	const nameIdx= addString(name);

	varType= varType | (isDeclared ? 0 : TYPES.UNDECLARED) | (isArray ? TYPES.ARRAY : 0)
	writeVarByte(count, FIELDS.TYPE, varType);
	writeVarWord(count, FIELDS.NAME, nameIdx);
	writeVarWord(count, FIELDS.VALUE, 0);

	return count;
}

export function declareVar(name, isArray) {
	return addVar(name, isArray, true);
}

export function setVarDeclared(idx) {
	writeVarByte(idx, FIELDS.TYPE, getVarType(idx) & (TYPES.UNDECLARED ^ 0xFF));
}

export function findVar(name) {
	let idx= 0;
	let count= readWord(0);
	while(idx < count) {
		if(name == getVarName(idx)) {
			return idx;
		}
		idx++;
	}
	return -1;
}

export function setVarFunction(idx) {
	writeVarByte(idx, FIELDS.TYPE, getVarType(idx) | TYPES.FUNCTION );
}

export function setVar(idx, value) {
	writeVarWord(idx, FIELDS.VALUE, value);
}

export function getVar(idx) {
	return readVarWord(idx, FIELDS.VALUE);
}

export function getVarName(idx) {
	return getString(readVarWord(idx, FIELDS.NAME));
}

export function getVarType(idx) {
	return readVarByte(idx, FIELDS.TYPE);
}

export function setVarType(idx, type) {
	return writeVarByte(idx, FIELDS.TYPE, getVarType(idx) & TYPES.FLAGS | type );
}

export function isVarArray(idx) {
	return readVarByte(idx, FIELDS.TYPE) & TYPES.ARRAY;
}

export function isVarDeclared(idx) {
	return !(readVarByte(idx, FIELDS.TYPE) & TYPES.UNDECLARED);
}

export function isVarFunction(idx) {
	return readVarByte(idx, FIELDS.TYPE) & TYPES.FUNCTION;
}

export function addIteratorVar(idx) {
	let count= readWord(0);
	writeWord(0, count + 2);

	writeVarByte(count, FIELDS.TYPE, TYPES.iterator);
	writeVarWord(count, FIELDS.NAME, idx); 	// ITERATOR.VAR
	writeVarWord(count, FIELDS.VALUE, 0); 	// ITERATOR.INC

	writeVarByte(count+1, FIELDS.TYPE, TYPES.iterator | 0x80);
	writeVarWord(count+1, FIELDS.NAME, 0); 	// ITERATOR.MAX
	writeVarWord(count+1, FIELDS.VALUE, 0); 	// ITERATOR.PTR

	return count;
}

export function setIteratorVar(idx, part, value) {
	writeVarWord(idx, part, value);
}

export function getIteratorVar(idx, part) {
	return readVarWord(idx, part);
}

export function findIteratorVar(varIdx) {
	let idx= 0;
	let count= readWord(0);
	while(idx < count) {
		const type= getVarType(idx);
		const nameIdx= readVarWord(idx, FIELDS.NAME);
		if(type == TYPES.iterator && nameIdx == varIdx)
			return idx;
		idx++;
	}
	return -1;
}

export function dumpVars() {

	let idx= 0;
	let count= readWord(0);

	console.log("count:", count);
	console.log(hexdump(varsBuffer, 2, count*VAR_RECORD_SIZE+2, 5));

	while(idx < count) {
		const nameIdx= readVarWord(idx, FIELDS.NAME);
		const name= getString(nameIdx);
		let type= readVarByte(idx, FIELDS.TYPE);
		let value= readVarWord(idx, FIELDS.VALUE);

		let arraySize;
		const isArray= type & TYPES.ARRAY;
		if(isArray) {
			// type= type & (TYPES.ARRAY ^ 0xFF);
			arraySize= getArraySize(value);
		}
		const isFunction= type & TYPES.FUNCTION;

		type&= TYPES.SCALAR;

		if(!isFunction)
			switch(type) {
				case TYPES.string: {
					value= value ? '"' + getString(value) + '"' : undefined;
					break;
				}
				case TYPES.iterator: {
					idx++;
					const max= readVarWord(idx, FIELDS.NAME);
					const ptr= readVarWord(idx, FIELDS.VALUE);
					value= `INC:${hexWord(value)} MAX:${hexWord(max)} PTR:${hexWord(ptr)}`;
				}
			}

		console.log(
			name,
			":",
			EnumToName(TYPES, type)
				+ (isArray ? "["+arraySize+"]" : "")
				+ (isFunction ? "()" : "")				,
			"=",
			value);

		idx++;
	}

}
