import { symtab } from "./6502assembler.js";

const functions= {
	DEF: isDefined,
	UNDEF: isUndefined
};

export function isFunction(name) {
	return functions[name] != undefined;
}

export function execFunction(ctx, name, parms) {
	return functions[name](ctx, parms);
}

function isDefined(ctx, parms) {
	// console.log("isDefined", parms, symtab);
	return symtab.hasOwnProperty(parms.toUpperCase());
}

function isUndefined(ctx, parms) {
	const  isUndef= !isDefined(ctx, parms);
	// console.log("isUndefined", parms, " =>",isUndef, ctx.pass);
	return isUndef;
}
