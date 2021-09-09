
function _fillUp(value, count, fillWith) {
	var l = count - value.length;
	var ret = "";
	while (--l > -1)
		ret += fillWith;
	return ret + value;
}

export function hexdump(buffer, offset, length, width= 16) {

	offset = offset || 0;
	length = length ?? buffer.length;

	const headers= "00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F";
	let out = _fillUp("Offset", 8, " ") + "  "+headers.slice(0,width*3)+"\n";
	let row = "";
	for (let i = 0; i < length; i += width) {
		row += _fillUp(offset.toString(16).toUpperCase(), 8, "0") + "  ";
		let n = Math.min(width, length - offset);
		let string = "";
		for (let j = 0; j < width; ++j) {
			if (j < n) {
				// var value = buffer.readUInt8(offset);
				let value = buffer[offset];
				string += ((value >= 32)&&(value<=127)) ? String.fromCharCode(value) : ".";
				row += _fillUp(value.toString(16).toUpperCase(), 2, "0") + " ";
				offset++;
			}
			else {
				row += "   ";
				string += " ";
			}
		}
		row += " " + string + "\n";
	}
	out += row;
	return out;
}

export function hexByte(val) {
	return val.toString(16).padStart(2, '0').toUpperCase();
}

export function hexWord(val) {
	return val.toString(16).padStart(4, '0').toUpperCase();
}

export function EnumToName(en, value) {
	const idx= Object.values(en).indexOf(value);
	return idx>=0 ? Object.keys(en)[idx] : hexByte(value);
}
