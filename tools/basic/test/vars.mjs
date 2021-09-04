import { TYPES } from "./defs.mjs";
import { addString, getString } from "./string.mjs";
import { hexByte, hexWord, hexdump } from "./utils.mjs";

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

function writeVarByte(idx, field, word) {
	idx= idx * VAR_RECORD_SIZE + field + 2;
	varsBuffer[idx]= word & 0xFF;
}

function readVarWord(idx, field) {
	idx= idx * VAR_RECORD_SIZE + field + 2;
	return varsBuffer[idx] | varsBuffer[idx+1] << 8;
}

function writeVarWord(idx, field, word) {
	idx= idx * VAR_RECORD_SIZE + field + 2;
	varsBuffer[idx]= word & 0xFF;
	varsBuffer[idx+1]= word >> 8 & 0xFF;
}

export function addVar(name, isArray) {
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
	writeVarByte(count, FIELDS.TYPE, varType | (isArray ? TYPES.ARRAY : 0));
	writeVarWord(count, FIELDS.NAME, nameIdx);
	writeVarWord(count, FIELDS.VALUE, 0);

	return count;
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

export function setVar(idx, value) {
	writeVarWord(idx, FIELDS.VALUE, value);
	// vars[idx].value= value;
}

export function getVar(idx) {
	return readVarWord(idx, FIELDS.VALUE);
	// return vars[idx].value;
}

export function getVarName(idx) {
	return getString(readVarWord(idx, FIELDS.NAME));
	// return vars[idx].name;
}

export function getVarType(idx) {
	return readVarByte(idx, FIELDS.TYPE);
	// return vars[idx].varType;
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

		const isArray= type & TYPES.ARRAY;
		if(isArray)
			type= type & (TYPES.ARRAY ^ 0xFF);

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
			Object.keys(TYPES)[Object.values(TYPES).indexOf(type)] + (isArray?"[]":""),
			"=",
			value);

		idx++;
	}

}
