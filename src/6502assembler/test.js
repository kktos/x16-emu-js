import { assemble, listCode, setup } from "./6502assembler.js";

const src0= `
	org = $800
	.db $99
	.text "abcd"
	.hex 20 24 28 2c 30 34 38 3c 20 24 28 2c 30 34 38 3c
	.db $99
	.text "abcd"
	`;

	const src= `
	.org $1000

	.opt
	.REPEAT 10 step 2 .BYTE 'A+R%
`;

setup();

assemble(src).then(ctx => listCode(ctx) )
