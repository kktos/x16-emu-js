import { assemble, setup } from "./6502assembler.js";

const src0= `
	org = $800
	.db $99
	.text "abcd"
`;

const src= `
	.org = $800
`;

setup();

assemble(src);
