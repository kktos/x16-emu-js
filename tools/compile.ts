import { readFileSync } from "node:fs";
import yargs from "yargs";
import ApplesoftCompiler from "./applesoftcompiler/compiler";

function getHexByte(val: number) {
	return val.toString(16).toUpperCase().padStart(2,"0");
}

function getHexWord(val: number) {
	return val.toString(16).toUpperCase().padStart(4,"0");
}

function dump(obj: Uint8Array, bytePerLine =16) {
	let s= "";

	const codeStart= 0x801;
	const codeEnd= codeStart + obj.length;
	const offset= codeStart % 8;
	for(let addr= codeStart-offset; addr<codeEnd; addr++) {
		if(addr % bytePerLine==0)
			s+= getHexWord(addr)+': ';

		if(addr<codeStart)
			s+='.. ';
		else {
			s+= getHexByte(typeof obj[addr-codeStart] == 'undefined' ? 0 : obj[addr-codeStart] || 0);
			s+= (addr % bytePerLine == bytePerLine-1 || addr==codeEnd-1)? '\n':' ';
		}
	}

	console.log(s);

}

const argv= yargs(process.argv.splice(2))
			.usage('Usage: compile filename')
			.argv;

const filename= (argv as any)["_"][0] as string;

const compiler = new ApplesoftCompiler();

const content= readFileSync(filename);

compiler.compile(content.toString());

dump(compiler.program());
