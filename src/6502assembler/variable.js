import { symtab } from "./6502assembler.js";
import { ET_P } from "./log.js";

export function getVarValue(ctx, name) {

	switch(name) {
		case "CPU":
			return { v: ctx.cpu, error: false };

		// for macros
		case "PARAMCOUNT": {
			const varDef= symtab["%locals%"]?.v?.find(def => def.name == ".PARAMCOUNT");
			return { v: varDef?.value, et: "MACRO ERROR", error: !varDef ? "can be use only inside a macro" : false };
		}

		default:
			return { v: -1, et:ET_P, error: `unknown variable "${name}"` };
	}
}
