import {
	headers,
	prgLines,
	prgCode,
	SIZE,
} from "./defs.mjs";
import { hexWord, hexByte } from "./utils.mjs";

function writeBuffer(p, value, size) {
	switch(size) {
		case SIZE.byte:
			p.buffer[p.idx++]= value;
			break;
		case SIZE.word:
			p.buffer[p.idx++]= value & 0xff;
			p.buffer[p.idx++]= (value >> 8) & 0xff;
			break;
	}
}

function writeBufferProgram(size, value) {

	// console.log("writeBufferProgram", hexWord(prgCode.idx), size, size==1 ? hexByte(value):hexWord(value));

	writeBuffer(prgCode, value, size);
}

function writeBufferHeader(idx, val) {
	const p= {
		buffer: headers,
		idx
	};
	writeBuffer(p, val, SIZE.word);
}

function writeBufferLine(val, idx) {
	const p= {
		buffer: prgLines.buffer,
		idx
	};
	writeBuffer(idx!= undefined ? p : prgLines, val, SIZE.word);
}

function readBuffer(p, size, lookahead= false) {
	switch(size) {
		case SIZE.byte: {
			const value= p.buffer[p.idx];
			if(!lookahead)
				p.idx++;
			return value;
		}
		case SIZE.word: {
			const value= (p.buffer[p.idx] & 0xff) | (p.buffer[p.idx+1] << 8);
			if(!lookahead)
				p.idx+= 2;
			return value;
		}
		case SIZE.long: {
			const value= (p.buffer[p.idx] & 0xff)
						| (p.buffer[p.idx+1] << 8)
						| (p.buffer[p.idx+1] << 16)
						| (p.buffer[p.idx+1] << 24);
			if(!lookahead)
				p.idx+= 4;
			return value;
		}
	}
}

function readBufferLine(idx) {
	const p= {
		buffer: prgLines.buffer,
		idx
	};
	return readBuffer(idx!= undefined ? p : prgLines, SIZE.word);
}

function readBufferHeader(idx) {
	const p= {
		buffer: headers,
		idx
	};
	return readBuffer(p, SIZE.word);
}

function readBufferProgram(size, idx) {
	const p= {
		buffer: prgCode.buffer,
		idx
	};
	return readBuffer(idx!= undefined ? p : prgCode, size);
}

export {
	writeBufferLine,
	writeBufferHeader,
	writeBufferProgram,
	readBufferLine,
	readBufferHeader,
	readBufferProgram,
	readBuffer
}
