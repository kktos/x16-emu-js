import { setVar } from "./vars.mjs";
import { hexdump } from "./utils.mjs";

const ARRAY_RECORD_SIZE= 2 + 2;
const arraysList= new Uint8Array(2 + 20 * ARRAY_RECORD_SIZE);
const arraysData= new Uint8Array(2 + 20 * 255);

for(let idx=0; idx<arraysList.length; idx++)
	arraysList[idx]= 0xFF;

writeWord(arraysList, 0, 0);
writeWord(arraysData, 0, 2);

export function addArray(varIdx, dim) {
	let count= readWord(arraysList, 0);
	writeWord(arraysList, 0, count + 1);

	setVar(varIdx, count);
	writeWord(arraysList, 2+count*ARRAY_RECORD_SIZE, dim);

	let freePtr= readWord(arraysData, 0);
	writeWord(arraysData, 0, freePtr + dim*2);

	writeWord(arraysList, 2+count*ARRAY_RECORD_SIZE+2, freePtr);
}

function readWord(buffer, idx) {
	return buffer[idx] | buffer[idx+1] << 8;
}

function writeWord(buffer, idx, word) {
	buffer[idx]= word & 0xFF;
	buffer[idx+1]= word >> 8 & 0xFF;
}

export function dumpArrays() {

	let idx= 0;
	let count= readWord(arraysList, 0);
	console.log("count:", count);
	console.log(hexdump(arraysList, 2, count * ARRAY_RECORD_SIZE + 2, 4));

	let freeIdx= readWord(arraysData, 0);
	console.log("size:", freeIdx);
	console.log(hexdump(arraysData, 2, freeIdx + 2));

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
