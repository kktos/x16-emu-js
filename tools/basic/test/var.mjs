import {
	vars,
	TYPES,
} from "./defs.mjs";

export const ITERATOR= {
	VAR: 0,
	INC: 1,
	MAX: 2,
	PTR: 3
};

export function addVar(name) {

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

	vars.push({name, varType});
	return vars.length-1;
}

export function addIteratorVar(idx) {
	// in ASM, use bit 7 as iterator flag var "A" => $41 or $A1
	vars.push({
		name: "." + vars[idx].name,
		varType: TYPES.iterator,
		value: [null,null,null,null]
	});
	return vars.length-1;
}

export function setIteratorVar(idx, part, value) {
	vars[idx].value[part]= value;
}

export function getIteratorVar(idx, part) {
	return vars[idx].value[part];
}

export function findIteratorVar(idx) {
	return findVar("." + vars[idx].name);
}

export function findVar(name) {
	return vars.findIndex((v) => v.name == name);
}

export function setVar(idx, value) {

	// console.log("setVar", idx, value, vars[idx]);

	vars[idx].value= value;
}
