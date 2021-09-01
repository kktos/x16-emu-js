import {
	strings,
} from "./defs.mjs";

export function addString(str) {
	strings.push(str);
	return strings.length-1;
}
