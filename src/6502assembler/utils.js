
let hextab= ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

export const hexPrefix= '$';
export const pcSymbol= '*';
export const commentChar=';';

export function getHexByte(v) {
	return ''+hextab[(v>>4)&0x0f]+hextab[v&0x0f];
}

export function getHexWord(v) {
	return ''+hextab[(v>>12)&0x0f]+hextab[(v>>8)&0x0f]+hextab[(v>>4)&0x0f]+hextab[v&0x0f];
}

export function compile(ctx, addr, b) {
	addr&= 0xffff;
	ctx.code[addr]= b;
	if(addr<ctx.codeStart)
		ctx.codeStart= addr;
	if(addr>ctx.codeEnd)
		ctx.codeEnd= addr;
}
