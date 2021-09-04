import {
	strings,
} from "./defs.mjs";

export function addString(str) {
	strings.push(str);
	return strings.length-1;
}

export function getString(idx) {
	return strings[idx];
}

let tempStringsIdx;
export function resetTempStrings() {
	strings.length= tempStringsIdx;
}

export function setTempStrings() {
	tempStringsIdx= strings.length;
}
