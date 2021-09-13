import { hexdump, hexWord } from "./utils.mjs";
import { ERRORS } from "./defs.mjs";
import { TYPES } from "./defs.mjs";

const ARRAY_RECORD_SIZE= 2 + 2;
const arrayList= new Uint8Array(2 + 20 * ARRAY_RECORD_SIZE);
const arrayData= new Uint8Array(2 + 20 * 255);

global._ARRAYLIST= arrayList;
global._ARRAYDATA= arrayData;

for(let idx=0; idx<arrayList.length; idx++)
	arrayList[idx]= 0xFF;

writeWord(arrayList, 0, 0);
writeWord(arrayData, 0, 2);

export function addArray(varType, dim) {
	let count= readWord(arrayList, 0);
	writeWord(arrayList, 0, count + 1);

	writeWord(arrayList, 2+count*ARRAY_RECORD_SIZE, dim);

	let itemSize= 2;
	switch(varType) {
		case TYPES.byte: {
			itemSize= 1;
			break;
		}
	}
	let freePtr= readWord(arrayData, 0);
	writeWord(arrayData, 0, freePtr + dim * itemSize);

	for(let idx=freePtr; idx<freePtr + dim * itemSize; idx++)
		arrayData[idx]= 0xFF;

	writeWord(arrayList, 2+count*ARRAY_RECORD_SIZE+2, freePtr);

	return count;
}

export function getArraySize(arrayIdx) {
	return readWord(arrayList, 2+arrayIdx*ARRAY_RECORD_SIZE);
}

export function getArrayPtr(arrayIdx) {
	return readWord(arrayList, 2+arrayIdx*ARRAY_RECORD_SIZE+2);
}

export function setArrayItem(varType, arrayIdx, idx, value) {
	if(idx >= getArraySize(arrayIdx))
		return ERRORS.OVERFLOW;

	let addr= getArrayPtr(arrayIdx);
	switch(varType & 0x3F) {
		case TYPES.string:
		case TYPES.int: {
			addr+= idx * 2;
			writeWord(arrayData, addr, value);
			break;
		}
		case TYPES.byte: {
			addr+= idx;
			writeByte(arrayData, addr, value);
			break;
		}
	}
	return 0;
}

export function getArrayItem(varType, arrayIdx, idx) {
	let addr= getArrayPtr(arrayIdx);
	switch(varType) {
		case TYPES.string:
		case TYPES.int: {
			addr+= idx * 2;
			return readWord(arrayData, addr);
		}
		case TYPES.byte: {
			addr+= idx;
			return readByte(arrayData, addr);
		}
	}
}

function readByte(buffer, idx) {
	return buffer[idx];
}

function readWord(buffer, idx) {
	return buffer[idx] | buffer[idx+1] << 8;
}

function writeByte(buffer, idx, byte) {
	buffer[idx]= byte & 0xFF;
}

function writeWord(buffer, idx, word) {
	buffer[idx]= word & 0xFF;
	buffer[idx+1]= word >> 8 & 0xFF;
}

export function dumpArray(arrayIdx) {
	let addr= getArrayPtr(arrayIdx);
	const size= getArraySize(arrayIdx);
	console.log("idx",arrayIdx,"size",size);
	console.log(hexdump(arrayData, addr, size));
}

export function dumpArrays() {

	let idx= 0;
	let count= readWord(arrayList, 0);
	console.log("count:", count);
	console.log(hexdump(arrayList, 2, count * ARRAY_RECORD_SIZE + 2, 4));

	let freeIdx= readWord(arrayData, 0);
	console.log("size:", freeIdx);
	console.log(hexdump(arrayData, 2, freeIdx, 16));

	// while(idx < count) {
	// 	const nameIdx= readVarWord(idx, FIELDS.NAME);
	// 	const name= getString(nameIdx);
	// 	let type= readVarByte(idx, FIELDS.TYPE);
	// 	let value= readVarWord(idx, FIELDS.VALUE);

	// 	const isArray= type & TYPES.ARRAY;
	// 	if(isArray)
	// 		type= type & (TYPES.ARRAY ^ 0xFF);

	// 	switch(type) {
	// 		case TYPES.string: {
	// 			value= value ? '"' + getString(value) + '"' : undefined;
	// 			break;
	// 		}
	// 		case TYPES.iterator: {
	// 			idx++;
	// 			const max= readVarWord(idx, FIELDS.NAME);
	// 			const ptr= readVarWord(idx, FIELDS.VALUE);
	// 			value= `INC:${hexWord(value)} MAX:${hexWord(max)} PTR:${hexWord(ptr)}`;
	// 		}
	// 	}

	// 	console.log(
	// 		name,
	// 		":",
	// 		Object.keys(TYPES)[Object.values(TYPES).indexOf(type)] + (isArray?"[]":""),
	// 		"=",
	// 		value);

	// 	idx++;
	// }

}
