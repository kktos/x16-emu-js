import {
	headers,
	prgLines,
	prgCode,
	SIZE,
} from "./defs.mjs";

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

function readBuffer(p, size) {
	switch(size) {
		case SIZE.byte:
			return p.buffer[p.idx++];
		case SIZE.word:
			const value= p.buffer[p.idx++] & 0xff;
			return value | (p.buffer[p.idx++] << 8);
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
