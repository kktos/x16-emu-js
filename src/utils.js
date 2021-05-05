
export function hexbyte(value) {
	return (((value >>> 4) & 0xf).toString(16) + (value & 0xf).toString(16)).toUpperCase();
}

export function hexword(value) {
	return hexbyte(value >>> 8) + hexbyte(value & 0xff);
}

const signExtendTable = (function () {
	const table = [];
	for (let i = 0; i < 256; ++i)
		table[i] = i >= 128 ? i - 256 : i;
	return table;
})();

export function signExtend(val) {
	return signExtendTable[val | 0] | 0;
}
