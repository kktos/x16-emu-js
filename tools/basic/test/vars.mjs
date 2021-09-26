import { TYPES } from "./defs.mjs";
import { addString, getString } from "./strings.mjs";
import { hexByte, hexWord, hexdump, EnumToName } from "./utils.mjs";
import { getArraySize } from "./arrays.mjs";

// 2: namedIdx
// 2: type
// 2: int / string
// x: float
// x: iterator
const VAR_RECORD_SIZE= 2 + 2 + 2;
const varsBuffer= new Uint8Array(50*VAR_RECORD_SIZE+2);
const FIELDS= {
	TYPE: 0,
	LEVEL: 1,
	NAME: 2,
	VALUE: 4
};
export const ITERATOR= {
	VAR: 2,
	INC: 4,
	MAX: 8,
	PTR: 10
};

global._VARS= varsBuffer;

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

export function addVarNameIdx(nameIdx, level, varType, isArray= false, isDeclared= false) {
	let count= readWord(0);
	let slotCount= 1;

	writeVarByte(count, FIELDS.TYPE, varType | (isDeclared ? 0 : TYPES.UNDECLARED) | (isArray ? TYPES.ARRAY : 0));
	writeVarByte(count, FIELDS.LEVEL, level);
	writeVarWord(count, FIELDS.NAME, nameIdx);
	writeVarWord(count, FIELDS.VALUE, 0xFFFF);

	if(!isArray && varType == TYPES.float) {
		slotCount++;
		writeVarByte(count+1, FIELDS.TYPE, 0x00);
		writeVarByte(count+1, FIELDS.LEVEL, 0xFF);
		writeVarWord(count+1, FIELDS.NAME, 0);
		writeVarWord(count+1, FIELDS.VALUE, 0);
	}

	writeWord(0, count + slotCount);
	return count;
}

export function addVar(name, level, isArray= false, isDeclared= false) {

	const nameIdx= addString(name);
	const varType= getTypeFromName(name);

	return addVarNameIdx(nameIdx, level, varType, isArray, isDeclared);
}

export function declareVar(name, level, isArray) {
	return addVar(name, level, isArray, true);
}

export function removeVarsForLevel(level) {
	let count= readWord(0);
	if(!count)
		return -1;

	let idx= count;

	do {
		idx--;
		const type= getVarType(idx);
		if(type == 0) {
			continue;
		}
		const varLevel= getVarLevel(idx);
		if(varLevel == level) {
			setVarType(idx, 0);
			count--;
			continue;
		}
	} while(idx);

	writeWord(0, count);

	return count;
}

export function setVarDeclared(idx) {
	writeVarByte(idx, FIELDS.TYPE, getVarType(idx) & (TYPES.UNDECLARED ^ 0xFF));
}

export function findVar(name, level= -1) {
	let idx= readWord(0);
	if(!idx)
		return -1;

	do {
		idx--;
		const type= getVarType(idx);
		if((type == 6)||(type == 0)) {
			continue;
		}

		if((level != -1) && (level != getVarLevel(idx)))
			continue;

		if(name == getVarName(idx))
			return idx;
	} while(idx);

	return -1;
}

export function setVarFunction(idx) {
	writeVarByte(idx, FIELDS.TYPE, getVarType(idx) | TYPES.FUNCTION );
}

export function setVar(idx, value) {
	const varType= getVarType(idx);
	if(varType == TYPES.float) {
		const buffer = new Uint8Array(4);
		const view = new DataView(buffer.buffer);
		view.setFloat32(0, value);
		for(let fidx= 0; fidx<4; fidx++)
			writeVarByte(idx+1, FIELDS.NAME+fidx, view.getUint8(fidx));
		return;
	}

	writeVarWord(idx, FIELDS.VALUE, value);
}

export function getVar(idx) {
	const varType= getVarType(idx);
	if(varType == TYPES.float) {
		const buffer = new Uint8Array(4);
		const view = new DataView(buffer.buffer);
		for(let fidx= 0; fidx<4; fidx++)
			view.setUint8(fidx, readVarByte(idx+1, FIELDS.NAME+fidx));
		return view.getFloat32(0);
	}

	return readVarWord(idx, FIELDS.VALUE);
}

export function getVarName(idx) {
	return getString(readVarWord(idx, FIELDS.NAME));
}

export function getVarType(idx) {
	return readVarByte(idx, FIELDS.TYPE);
}

export function getVarLevel(idx) {
	return readVarByte(idx, FIELDS.LEVEL);
}

export function getTypeFromName(name) {
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
	return varType;
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
	writeVarByte(count, FIELDS.LEVEL, 0);
	writeVarWord(count, FIELDS.NAME, idx); 	// ITERATOR.VAR
	writeVarWord(count, FIELDS.VALUE, 0); 	// ITERATOR.INC

	writeVarByte(count+1, FIELDS.TYPE, 0x00);
	writeVarWord(count+1, FIELDS.NAME, 0); 	// ITERATOR.MAX
	writeVarWord(count+1, FIELDS.VALUE, 0); 	// ITERATOR.PTR

	// console.log("************ addIteratorVar", getVarName(idx));
	// dumpVars();

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

	const count= readWord(0);

	console.log("count:", count);
	console.log(hexdump(varsBuffer, 2, count*VAR_RECORD_SIZE+2, VAR_RECORD_SIZE));

	let idx= count-1;
	while(idx >= 0) {
		let typeFlags= readVarByte(idx, FIELDS.TYPE);
		if(!typeFlags) {
			idx--;
			continue;
		}

		const nameIdx= readVarWord(idx, FIELDS.NAME);
		let name= getString(nameIdx);
		let value= readVarWord(idx, FIELDS.VALUE);
		let level= readVarByte(idx, FIELDS.LEVEL);

		let arraySize;
		const isArray= typeFlags & TYPES.ARRAY;
		if(isArray) {
			// typeFlags= typeFlags & (TYPES.ARRAY ^ 0xFF);
			arraySize= getArraySize(value);
		}
		const isFunction= typeFlags & TYPES.FUNCTION;
		const isDeclared= !(typeFlags & TYPES.UNDECLARED);
		const type= typeFlags & TYPES.SCALAR;

		if(isArray) {
			value= hexWord(value);
		}
		else
		if(!isFunction) {
			switch(type) {
				case TYPES.string: {
					value= value ? '"' + getString(value) + '"' : undefined;
					break;
				}
				case TYPES.iterator: {
					name= getVarName(nameIdx);
					const max= readVarWord(idx+1, FIELDS.NAME);
					const ptr= readVarWord(idx+1, FIELDS.VALUE);
					value= `INC:${hexWord(value)} MAX:${hexWord(max)} PTR:${hexWord(ptr)}`;
					break;
				}
				case TYPES.float: {
					const buffer= new Uint8Array(4);
					const view= new DataView(buffer.buffer);
					for(let idx= 0;idx<4;idx++) {
						view.setInt8(idx, readVarByte(idx+1, FIELDS.NAME + idx));
					}
					value= view.getFloat32(0);
					break;
				}
			}
		}

		console.log(
			String(idx).padStart(2, "0"),
			(level>0 ? "L" : "G")+hexByte(level),
			name,
			":",
			hexByte(typeFlags),
			EnumToName(TYPES, type)
				+ (isArray ? "["+arraySize+"]" : "")
				+ (isFunction ? "()" : "")				,
			"=",
			isDeclared ? "" : "undefined",
			value);

		idx--;
	}

}
