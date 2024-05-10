export let core= {
	bus: null,
	PC: 0,
	A: 0,
	X: 0,
	Y: 0,
	SP: 0xFF,
	FlagC: 0,
	FlagZ: 0,
	FlagI: 1,	//Off
	FlagD: 0,
	FlagB: 1,	//Always set?
	FlagV: 0,
	FlagN: 0,
	cycle_count: 0,
	calcAddress: -1,
	running: 0,
	debuggerOnBRK: true,
	mhz: 0
};

let cycle_penalty= 0;

function memADDRESS()
{
	core.calcAddress =core.bus.read(core.PC++);
	core.calcAddress+= (0x100*(core.bus.read(core.PC++)));
	return core.bus.read(core.calcAddress);
}
function memADDRESSX()
{
	core.calcAddress= core.bus.read(core.PC++);
	core.calcAddress+= (0x100*(core.bus.read(core.PC++)));
	const high_byte=core.calcAddress&0xFF00;
	core.calcAddress+=core.X;
	if(high_byte!=(core.calcAddress&0xFF00)) {
		core.cycle_count++;
		cycle_penalty=1;
	}
	else cycle_penalty=0;
	core.calcAddress&= 0xFFFF;
	return core.bus.read(core.calcAddress);
}
function memADDRESSY()
{
	core.calcAddress= core.bus.read(core.PC++);
	core.calcAddress+= (0x100*(core.bus.read(core.PC++)));
	const high_byte=core.calcAddress&0xFF00;
	core.calcAddress+=core.Y;
	if (high_byte!=(core.calcAddress&0xFF00))
	{
		core.cycle_count++;
		cycle_penalty=1;
	}
	else cycle_penalty=0;
	core.calcAddress&= 0xFFFF;
	return core.bus.read(core.calcAddress);
}
function memIMMED()
{
	return core.bus.read(core.PC++);
}
function memIX()
{
	//No banking for pointer since always in ZP
	const t0= (core.bus.read(core.PC++)+core.X)&0xFF;
	core.calcAddress= (core.bus.read(t0)+(core.bus.read(t0+1)<<8))&0xFFFF;
	return core.bus.read(core.calcAddress);
}
function memIY()
{
	//No banking for pointer since always in ZP
	const t0=core.bus.read(core.PC++);
	core.calcAddress=core.bus.read(t0)+(core.bus.read((t0+1)&0xFF)<<8);
	const high_byte=core.calcAddress&0xFF00;
	core.calcAddress+=core.Y;
	if (high_byte!=(core.calcAddress&0xFF00))
	{
		core.cycle_count++;
		cycle_penalty=1;
	}
	else cycle_penalty=0;
	core.calcAddress&=0xFFFF;
	return core.bus.read(core.calcAddress);
}
function memIZP()
{
	//No banking for pointer since always in ZP
	const t0=core.bus.read(core.PC++);
	//core.calcAddress=core.bus.read(t0)+(core.bus.read(t0+1)<<8);
	core.calcAddress=(core.bus.read(t0)+(core.bus.read((t0+1)&0xFF)<<8));
	return core.bus.read(core.calcAddress);
}
function memZP()
{
	//No banking since always in ZP
	core.calcAddress=core.bus.read(core.PC++);
	return core.bus.read(core.calcAddress);
}
function memZPX()
{
	//No banking since always in ZP
	core.calcAddress=(core.bus.read(core.PC++)+core.X)&0xFF;
	return core.bus.read(core.calcAddress);
}
function memZPY()
{
	//No banking since always in ZP
	core.calcAddress=(core.bus.read(core.PC++)+core.Y)&0xFF;
	return core.bus.read(core.calcAddress);
}



//***********************
//*EMULATED INSTRUCTIONS*
//***********************
function readString(start) {
	let str= "";
	let c;
	let end= start;
	do {
		c= core.bus.read(end++);
		if(c)
			str+= String.fromCharCode(c);
	} while(c);
	return {str, len: end-start};
}

function subOUT() {
	const parms= [];
	const {str: fmt, len}= readString(core.PC);
	core.PC+= len;
	const parmCount= core.bus.read(core.PC++);
	for(let idx=0; idx<parmCount; idx++) {
		const val= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));
		parms[idx]= val;
	}

	let outStr= "";
	let curPos= 0;
	let curParm= 0;
	let match;
	const regex1 = RegExp('%.', 'g');
	let W= 0;
	let H= 0;
	while ((match = regex1.exec(fmt)) !== null) {
		outStr+= fmt.slice(curPos, match.index);
		curPos= regex1.lastIndex;
		switch(match[0]) {
			case "%y":
					outStr+= hexbyte(core.Y);
					break;
			case "%a":
				outStr+= hexbyte(core.A);
				break;
			case "%x":
				outStr+= hexbyte(core.X);
				break;
			case "%w": {
				const v= core.bus.read(parms[curParm]) + (0x100*(core.bus.read(parms[curParm]+1)));
				outStr+= hexword(v);
				curParm++;
				break;
			}
			case "%b":
				outStr+= hexbyte(core.bus.read(parms[curParm]));
				curParm++;
				break;
			case "%W":
				W= core.bus.read(parms[curParm]);
				outStr+= hexbyte(W);
				curParm++;
				break;
			case "%H":
				H= core.bus.read(parms[curParm]);
				outStr+= hexbyte(H);
				curParm++;
				break;
			case "%D": {
				const len= W*H;
				const addr= core.bus.read(parms[curParm]) + (0x100*(core.bus.read(parms[curParm]+1)));
				outStr+= `\n[${hexword(addr)}.${hexword(addr+len-1)}]`;
				outStr+= `\n${hexword(addr)}: `;
				let curW= 0;
				for(let offset= 0; offset<len; offset++) {
					if(curW === W) {
						curW= 0;
						outStr+= `\n${hexword(addr + offset)}: `;
					}
					outStr+= `${hexbyte(core.bus.read(addr + offset))} `;
					curW++;
				}
				curParm++;
			}
				break;
		}
	}

	console.log(outStr, {fmt, parms});

	// self.postMessage({cmd:"log", data: {
	// 	fmt,
	// 	parms
	// }});
}

function subDISK_READ_FILE() {
	const addr= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));
	const {str: filename}= readString(addr);
	self.postMessage({cmd:"disk", data: {
		cmd: "read_file",
		filename,
		diskID: 0
	}});
}

function subDISK_READ() {
	const sector= core.bus.read(core.PC++);
	const track= core.bus.read(core.PC++);
	const addr= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));
	const length= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));

	self.postMessage({cmd:"disk", data: {
		cmd: "read",
		track,
		sector,
		addr,
		length,
		diskID: 0
	}});

}

function hexbyte(value) {
	return (((value >>> 4) & 0xf).toString(16) + (value & 0xf).toString(16)).toUpperCase();
}
function hexword(value) {
	return hexbyte(value >>> 8) + hexbyte(value & 0xff);
}

function subMVPw() {
	const src= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));
	const dst= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));
	const len= core.bus.read(core.PC++) + (0x100*(core.bus.read(core.PC++)));
	for(let idx= 0; idx<len; idx++) {
		core.bus.write((dst+idx)&0xFFFF, core.bus.read((src+idx)&0xFFFF));
	}
	// console.log("MVPw", hexword(src), hexword(dst), hexword(len), " LC:",core.bus.lcSelected, " WE:",core.bus.lcWriteEnabled);
}

function subADC(oper)
{
	let t1;
	if (core.FlagD===1)
	{
		t1= (core.A&0xF)+(oper&0xF)+core.FlagC;
		if (t1>9) t1+=6;
		t1+= (core.A&0xF0)+(oper&0xF0);
		if (t1>=0xA0) t1+= 0x60;
		core.cycle_count++;
	}
	else t1= core.A+oper+core.FlagC;
	if (t1>=0x100){t1&=0xFF;core.FlagC=1;}else core.FlagC=0;
	if ((core.A<0x80)&&(oper<0x80)&&(t1>=0x80)) core.FlagV=1;
	else if ((core.A>=0x80)&&(oper>=0x80)&&(t1<0x80)) core.FlagV=1;
	else core.FlagV=0;
	core.A=t1;
	if (core.A===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subAND(oper)
{
	core.A&=oper;
	if (core.A===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subASL(oper)
{
	oper<<=1;
	if (oper>=0x100){core.FlagC=1;oper&=0xFF;}else core.FlagC=0;
	if (oper===0) core.FlagZ=1;else core.FlagZ=0;
	if (oper>=0x80) core.FlagN=1;else core.FlagN=0;
	core.bus.write(core.calcAddress, oper);
}
function subBBR(oper)
{
	if ((memZP()&oper)===0)
	{
		const t0=memIMMED();
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
	}
	else core.PC++;
}
function subBBS(oper)
{
	if ((memZP()&oper)!==0)
	{
		const t0=memIMMED();
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
	}
	else core.PC++;
}
function subBIT(oper)
{
	if ((core.A&oper)===0) core.FlagZ=1;else core.FlagZ=0;
	if (oper&0x80) core.FlagN=1;else core.FlagN=0;
	if (oper&0x40) core.FlagV=1;else core.FlagV=0;
}
function subCMP(oper)
{
	let temp=core.A-oper;
	if (temp===0) core.FlagZ=1;else core.FlagZ=0;
	if (temp>=0) core.FlagC=1;else core.FlagC=0;
	if (temp<0) temp+=0x100;
	if (temp>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subCPX(oper)
{
	let temp=core.X-oper;
	if (temp===0) core.FlagZ=1;else core.FlagZ=0;
	if (temp>=0) core.FlagC=1;else core.FlagC=0;
	if (temp<0) temp+=0x100;
	if (temp>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subCPY(oper)
{
	let temp=core.Y-oper;
	if (temp===0) core.FlagZ=1;else core.FlagZ=0;
	if (temp>=0) core.FlagC=1;else core.FlagC=0;
	if (temp<0) temp+=0x100;
	if (temp>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subDEC(oper)
{
	if (oper===0) oper=0xFF;
	else oper--;
	if (oper===0) core.FlagZ=1;else core.FlagZ=0;
	if (oper>=0x80) core.FlagN=1;else core.FlagN=0;
	core.bus.write(core.calcAddress, oper);
}
function subEOR(oper)
{
	core.A^=oper;
	if (core.A===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subINC(oper)
{
	if (oper===0xFF){oper=0;core.FlagZ=1;} else{oper++;core.FlagZ=0;}
	if (oper>=0x80) core.FlagN=1;else core.FlagN=0;
	core.bus.write(core.calcAddress, oper);
}
function subLDA(oper)
{
	core.A= oper;
	if (core.A===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subLDX(oper)
{
	core.X= oper;
	if (core.X===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.X>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subLDY(oper)
{
	core.Y= oper;
	if (core.Y===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.Y>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subLSR(oper)
{
	if (oper&1) {core.FlagC=1;}else core.FlagC=0;
	oper>>=1;
	if (oper===0) core.FlagZ=1;else core.FlagZ=0;
	//if (oper>=0x80) core.FlagN=1;else core.FlagN=0;
	core.FlagN=0;
	core.bus.write(core.calcAddress, oper);
}
function subORA(oper)
{
	core.A|=oper;
	if (core.A===0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	//debugflag+="\nFlagN: "+core.FlagN;
}
function subRMB(oper)
{
	//No banking since zero page
	core.calcAddress=core.bus.read(core.PC++);
	core.bus.write(core.calcAddress, core.bus.read(core.calcAddress)&oper);
}
function subROL(oper)
{
	oper=(oper<<1)+core.FlagC;
	if (oper>=0x100){core.FlagC=1;oper&=0xFF;}else core.FlagC=0;
	if (oper===0) core.FlagZ=1;else core.FlagZ=0;
	if (oper>=0x80) core.FlagN=1;else core.FlagN=0;
	core.bus.write(core.calcAddress, oper);
}
function subROR(oper)
{
	let t0;
	if (oper&1) t0=1;else t0=0;
	oper>>=1;
	if (core.FlagC) oper|=0x80;
	core.FlagC=t0;
	if (oper===0) core.FlagZ=1;else core.FlagZ=0;
	if (oper>=0x80) core.FlagN=1;else core.FlagN=0;
	core.bus.write(core.calcAddress, oper);
}
function subSBC(oper)
{
	let t1;
	if (core.FlagD==1)
	{
		if ((oper==0)&&(core.FlagC==0))
		{
			oper=1;
			core.FlagC=1;
		}
		t1=(core.A&0xF)+(9-(oper&0xF)+core.FlagC);
		if (t1>9) t1+=6;
		t1+=(core.A&0xF0)+(0x90-(oper&0xF0));
		if (t1>0x99) t1+=0x60;
		if (t1>=0x100)
		{
			t1-=0x100;
			core.FlagC=1;
		}
		else core.FlagC=0;
		//May happen if oper is not valid BCD
		if (t1<0) t1=0;
		core.cycle_count++;
	}
	else
	{
		t1=core.A-oper-1+core.FlagC;
		if (t1<0){t1+=0x100;core.FlagC=0;}else core.FlagC=1;
	}
	if ((core.A<0x80)&&(oper>=0x80)&&(t1>=0x80)) core.FlagV=1;
	else if ((core.A>=0x80)&&(oper<0x80)&&(t1<0x80)) core.FlagV=1;
	else core.FlagV=0;
	core.A= t1;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
}
function subSMB(oper)
{
	//No banking since zero page
	core.calcAddress= core.bus.read(core.PC++);
	core.bus.write(core.calcAddress, core.bus.read(core.calcAddress)|oper);
}
function subSTA()
	{core.bus.write(core.calcAddress, core.A);}
function subSTX()
	{core.bus.write(core.calcAddress, core.X);}
function subSTY()
	{core.bus.write(core.calcAddress, core.Y);}
function subSTZ()
	{core.bus.write(core.calcAddress, 0);}
function subTRB(oper)
{
	if ((core.A&oper)==0) core.FlagZ=1;else core.FlagZ=0;
	core.bus.write(core.calcAddress, (core.A^0xFF)&oper);
}
function subTSB(oper)
{
	if ((core.A&oper)==0) core.FlagZ=1;else core.FlagZ=0;
	core.bus.write(core.calcAddress, core.A|oper);
}

function opBRK()													//0x00
{
	//core.FlagB=0;
	//core.PC--;

	if(core.debuggerOnBRK && core.running) {
		core.running= 0;
		core.PC-= 1;
		self.postMessage({cmd:"stopped", op:"BRK", PC: core.PC});
		return;
	}

	core.cycle_count+=7;
	core.PC++;

	core.bus.write(core.SP + 0x100, core.PC >> 8);
	core.SP = (core.SP - 1) & 0xFF;
	core.bus.write(core.SP + 0x100, core.PC & 0xFF);
	core.SP = (core.SP - 1) & 0xFF;
	let v = core.FlagN << 7;
	v |= core.FlagV << 6;
	v |= 3 << 4;
	v |= core.FlagD << 3;
	v |= core.FlagI << 2;
	v |= core.FlagZ << 1;
	v |= core.FlagC;
	core.bus.write(core.SP + 0x100, v);
	core.SP = (core.SP - 1) & 0xFF;
	core.FlagI = 1;
	core.FlagD = 0;
	core.PC = (core.bus.read(0xFFFF) << 8) | core.bus.read(0xFFFE);
	// this.cycles += 5;
}
function opORA_IX(){subORA(memIX());core.cycle_count+=6;}				//0x01
function opNOP_IMMED(){core.PC++;core.cycle_count+=2;}						//0x02
function opNOP(){core.cycle_count+=2;}									//0x03
function opTSB_ZP(){subTSB(memZP());core.cycle_count+=5;}				//0x04
function opORA_ZP(){subORA(memZP());core.cycle_count+=3;}				//0x05
function opASL_ZP(){subASL(memZP());core.cycle_count+=5;}				//0x06
function opRMB0(){subRMB(0xFE);core.cycle_count+=5;}						//0x07
function opPHP()													//0x08
{
	core.bus.write(0x100+core.SP, core.FlagC+core.FlagZ*2+core.FlagI*4+core.FlagD*8+core.FlagB*16+32+core.FlagV*64+core.FlagN*128);
	if (core.SP==0) core.SP=0xFF;
	else core.SP--;
	core.cycle_count+=3;
}
function opORA_IMMED(){subORA(memIMMED());core.cycle_count+=2;}			//0x09
function opASL()													//0x0A
{
	core.A<<=1;
	if (core.A>=0x100){core.FlagC=1;core.A&=0xFF}else core.FlagC=0;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x0B
function opTSB_ADDRESS(){subTSB(memADDRESS());core.cycle_count+=6;}		//0x0C
function opORA_ADDRESS(){subORA(memADDRESS());core.cycle_count+=4;}		//0x0D
function opASL_ADDRESS(){subASL(memADDRESS());core.cycle_count+=6;}		//0x0E
function opBBR0(){subBBR(0x01);core.cycle_count+=5;}						//0x0F
function opBPL()													//0x10
{
	if (core.FlagN==0)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opORA_IY(){subORA(memIY());core.cycle_count+=5;}				//0x11
function opORA_IZP(){subORA(memIZP());core.cycle_count+=5;}				//0x12
//function opNOP()													//0x13
function opTRB_ZP(){subTRB(memZP());core.cycle_count+=5;}				//0x14
function opORA_ZPX(){subORA(memZPX());core.cycle_count+=4;}				//0x15
function opASL_ZPX(){subASL(memZPX());core.cycle_count+=6;}				//0x16
function opRMB1(){subRMB(0xFD);core.cycle_count+=5;}						//0x17
function opCLC(){core.FlagC=0;core.cycle_count+=2;}							//0x18
function opORA_ADDRESSY(){subORA(memADDRESSY());core.cycle_count+=4;}	//0x19
function opINC()													//0x1A
{
	if (core.A==0xFF){core.A=0;core.FlagZ=1;} else{core.A++;core.FlagZ=0;}
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x1B
function opTRB_ADDRESS(){subTRB(memADDRESS());core.cycle_count+=6;}		//0x1C
function opORA_ADDRESSX(){subORA(memADDRESSX());core.cycle_count+=4;}	//0x1D
function opASL_ADDRESSX(){subASL(memADDRESSX());core.cycle_count+=6;}	//0x1E
function opBBR1(){subBBR(0x02);core.cycle_count+=5;}						//0x1F
function opJSR()													//0x20
{
	core.bus.write(0x100+core.SP, (core.PC+1)>>8);
	if (core.SP==0) core.SP=0xFF;else core.SP--;
	core.bus.write(0x100+core.SP, (core.PC+1)&0xFF);
	if (core.SP==0) core.SP=0xFF;else core.SP--;
	core.PC= core.bus.read(core.PC)+0x100*core.bus.read(core.PC+1);
	core.cycle_count+= 6;
}
function opAND_IX(){subAND(memIX());core.cycle_count+=6;}				//0x21
//function opNOP_IMMED()											//0x22
//function opNOP()													//0x23
function opBIT_ZP(){subBIT(memZP());core.cycle_count+=3;}				//0x24
function opAND_ZP(){subAND(memZP());core.cycle_count+=3;}				//0x25
function opROL_ZP(){subROL(memZP());core.cycle_count+=5;}				//0x26
function opRMB2(){subRMB(0xFB);core.cycle_count+=5;}						//0x27
function opPLP()													//0x28
{
	if(core.SP==0xFF) core.SP=0; else core.SP++;
	let t0= core.bus.read(0x100+core.SP);
	if(t0&1) core.FlagC=1;else core.FlagC=0;
	if(t0&2) core.FlagZ=1;else core.FlagZ=0;
	if(t0&4) core.FlagI=1;else core.FlagI=0;
	if(t0&8) core.FlagD=1;else core.FlagD=0;
	//if (t0&16) core.FlagB=1;else core.FlagB=0;
	core.FlagB=1;
	if (t0&64) core.FlagV=1;else core.FlagV=0;
	if (t0&128) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=4;
}
function opAND_IMMED(){subAND(memIMMED());core.cycle_count+=2;}			//0x29
function opROL()													//0x2A
{
	core.A=(core.A<<1)+core.FlagC;
	if (core.A>=0x100){core.FlagC=1;core.A&=0xFF;}else core.FlagC=0;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x2B
function opBIT_ADDRESS(){subBIT(memADDRESS());core.cycle_count+=4;}		//0x2C
function opAND_ADDRESS(){subAND(memADDRESS());core.cycle_count+=4;}		//0x2D
function opROL_ADDRESS(){subROL(memADDRESS());core.cycle_count+=6;}		//0x2E
function opBBR2(){subBBR(0x04);core.cycle_count+=5;}						//0x2F
function opBMI()													//0x30
{
	if (core.FlagN==1)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opAND_IY(){subAND(memIY());core.cycle_count+=5;}				//0x31
function opAND_IZP(){subAND(memIZP());core.cycle_count+=5;}				//0x32
//function opNOP()													//0x33
function opBIT_ZPX(){subBIT(memZPX());core.cycle_count+=4;}				//0x34
function opAND_ZPX(){subAND(memZPX());core.cycle_count+=4;}				//0x35
function opROL_ZPX(){subROL(memZPX());core.cycle_count+=6;}				//0x36
function opRMB3(){subRMB(0xF7);core.cycle_count+=5;}						//0x37
function opSEC(){core.FlagC=1;core.cycle_count+=2;}							//0x38
function opAND_ADDRESSY(){subAND(memADDRESSY());core.cycle_count+=4;}	//0x39
function opDEC()													//0x3A
{
	if (core.A==0) core.A=0xFF;
	else core.A--;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x3B
function opBIT_ADDRESSX(){subBIT(memADDRESSX());core.cycle_count+=4;}	//0x3C
function opAND_ADDRESSX(){subAND(memADDRESSX());core.cycle_count+=4;}	//0x3D
function opROL_ADDRESSX(){subROL(memADDRESSX());core.cycle_count+=6;}	//0x3E
function opBBR3(){subBBR(0x08);core.cycle_count+=5;}						//0x3F
function opRTI()													//0x40
{
	opPLP();//4 cycles
	opRTS();//6 cycles
	core.PC--;//interrupt pushes core.PC, not core.PC-1
	core.cycle_count-=5;//should be +5 overall
}
function opEOR_IX(){subEOR(memIX());core.cycle_count+=6;}				//0x41
function opWDM_EXTENDED() {											//0x42
	core.cycle_count+= 2;
	switch(memIMMED()) {
		case 0x01: // DISK_READ
			subDISK_READ();
			break;
		case 0x11: // DISK_READ_FILE
			subDISK_READ_FILE();
			break;
		case 0x44: // MVP.w src.w dst.w len.w
			subMVPw();
			break;
		case 0xFF: // OUT string
			subOUT();
			break;
		default:
			opBRK();
	}
}
//function opNOP()													//0x43
function opNOP_ZP(){core.PC++;core.cycle_count+=3;}							//0x44
function opEOR_ZP(){subEOR(memZP());core.cycle_count+=3;}				//0x45
function opLSR_ZP(){subLSR(memZP());core.cycle_count+=5;}				//0x46
function opRMB4(){subRMB(0xEF);core.cycle_count+=5;}						//0x47
function opPHA()													//0x48
{
	core.bus.write(0x100+core.SP, core.A);
	if (core.SP==0) core.SP=0xFF;
	else core.SP--;
	core.cycle_count+=3;
}
function opEOR_IMMED(){subEOR(memIMMED());core.cycle_count+=2;}			//0x49
function opLSR()													//0x4A
{
	if (core.A&1)core.FlagC=1;else core.FlagC=0;
	core.A>>=1;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	//if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x4B
function opJMP_ADDRESS()											//0x4C
{
	core.PC=core.bus.read(core.PC)+0x100*core.bus.read(core.PC+1);
	core.cycle_count+=3;
}
function opEOR_ADDRESS(){subEOR(memADDRESS());core.cycle_count+=4;}		//0x4D
function opLSR_ADDRESS(){subLSR(memADDRESS());core.cycle_count+=6;}		//0x4E

function opBBR4(){subBBR(0x10);core.cycle_count+=5;}						//0x4F
function opBVC()													//0x50
{
	if (core.FlagV==0)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opEOR_IY(){subEOR(memIY());core.cycle_count+=5;}				//0x51
function opEOR_IZP(){subEOR(memIZP());core.cycle_count+=5;}				//0x52
//function opNOP()													//0x53
function opNOP_ZPX(){core.PC++;core.cycle_count+=4;}							//0x54
function opEOR_ZPX(){subEOR(memZPX());core.cycle_count+=4;}				//0x55
function opLSR_ZPX(){subLSR(memZPX());core.cycle_count+=6;}				//0x56
function opRMB5(){subRMB(0xDF);core.cycle_count+=5;}						//0x57
function opCLI(){core.FlagI=0;core.cycle_count+=2;}							//0x58
function opEOR_ADDRESSY(){subEOR(memADDRESSY());core.cycle_count+=4;}	//0x59
function opPHY()													//0x5A
{
	core.bus.write(0x100+core.SP, core.Y);
	if (core.SP==0) core.SP=0xFF;
	else core.SP--;
	core.cycle_count+=3;
}
//function opNOP()													//0x5B
function opNOP_ADDRESS(){core.PC+=2;core.cycle_count+=8;}						//0x5C
function opEOR_ADDRESSX(){subEOR(memADDRESSX());core.cycle_count+=4;}	//0x5D
function opLSR_ADDRESSX(){subLSR(memADDRESSX());core.cycle_count+=6;}	//0x5E
function opBBR5(){subBBR(0x20);core.cycle_count+=5;}						//0x5F
function opRTS()													//0x60
{
	if (core.SP==0xFF) core.SP=0;
	else core.SP++;
	core.PC=core.bus.read(0x100+core.SP);
	if (core.SP==0xFF) core.SP=0;
	else core.SP++;
	core.PC+=core.bus.read(0x100+core.SP)*0x100+1;
	core.cycle_count+=6;
}
function opADC_IX(){subADC(memIX());core.cycle_count+=6;}				//0x61
//function opNOP_IMMED()											//0x62
//function opNOP()													//0x63
function opSTZ_ZP(){memZP();subSTZ();core.cycle_count+=3;}				//0x64
function opADC_ZP(){subADC(memZP());core.cycle_count+=3;}				//0x65
function opROR_ZP(){subROR(memZP());core.cycle_count+=5;}				//0x66
function opRMB6(){subRMB(0xBF);core.cycle_count+=5;}						//0x67
function opPLA()													//0x68
{
	if (core.SP==0xFF) core.SP=0;
	else core.SP++;
	core.A=core.bus.read(0x100+core.SP);
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=4;
}
function opADC_IMMED(){subADC(memIMMED());core.cycle_count+=2;}			//0x69
function opROR()													//0x6A
{
	let t0;
	if (core.A&1) t0=1;else t0=0;
	core.A>>=1;
	if (core.FlagC) core.A|=0x80;
	core.FlagC=t0;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x6B
function opJMP_I()													//0x6C
{
	// if ((NMOS_mode)&&(core.bus.read(core.PC)==0xFF))
	// {
	// 	//Keep core.PC on this instruction for debugging
	// 	core.PC--;

	// 	if(core.running) {
	// 		core.running= 0;
	// 		self.postMessage({cmd:"stopped"});
	// 	}

	// 	self.postMessage({cmd:"msgbox",msg:"Trapped: JMP (xxFF) in NMOS mode!"});
	// }
	// else
	// {
		let t0=core.bus.read(core.PC)+0x100*core.bus.read(core.PC+1);
		core.PC=core.bus.read(t0)+0x100*core.bus.read(t0+1);
	// }
	core.cycle_count+=6;
}
function opADC_ADDRESS(){subADC(memADDRESS());core.cycle_count+=4;}		//0x6D
function opROR_ADDRESS(){subROR(memADDRESS());core.cycle_count+=6;}		//0x6E
function opBBR6(){subBBR(0x40);core.cycle_count+=5;}						//0x6F
function opBVS()													//0x70
{
	if (core.FlagV==1)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opADC_IY(){subADC(memIY());core.cycle_count+=5;}				//0x71
function opADC_IZP(){subADC(memIZP());core.cycle_count+=5}				//0x72
//function opNOP()													//0x73
function opSTZ_ZPX(){memZPX();subSTZ();core.cycle_count+=4;}				//0x74
function opADC_ZPX(){subADC(memZPX());core.cycle_count+=4;}				//0x75
function opROR_ZPX(){subROR(memZPX());core.cycle_count+=6;}				//0x76
function opRMB7(){subRMB(0x7F);core.cycle_count+=5;}						//0x77
function opSEI(){core.FlagI=1;core.cycle_count+=2;}							//0x78
function opADC_ADDRESSY(){subADC(memADDRESSY());core.cycle_count+=4;}	//0x79
function opPLY()													//0x7A
{
	if (core.SP==0xFF) core.SP=0;
	else core.SP++;
	core.Y=core.bus.read(0x100+core.SP);
	if (core.Y==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.Y>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=4;
}
//function opNOP()													//0x7B
function opJMP_IADDRESSX()											//0x7C
{
	let t0=core.bus.read(core.PC)+0x100*core.bus.read(core.PC+1)+core.X;
	core.PC=core.bus.read(t0)+0x100*core.bus.read(t0+1);
	core.cycle_count+=6;
}
function opADC_ADDRESSX(){subADC(memADDRESSX());core.cycle_count+=4;}	//0x7D
function opROR_ADDRESSX(){subROR(memADDRESSX());core.cycle_count+=6;}	//0x7E
function opBBR7(){subBBR(0x80);core.cycle_count+=5;}						//0x7F
function opBRA()													//0x80
{
	const t0=memIMMED();
	const high_byte=core.PC&0xFF00;
	if (t0>=0x80) core.PC-=(0x100-t0);
	else core.PC+=t0;
	if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
	core.cycle_count+=3;
}
function opSTA_IX(){memIX();subSTA();core.cycle_count+=6;}				//0x81
//function opNOP_IMMED()											//0x82
//function opNOP()													//0x83
function opSTY_ZP(){memZP();subSTY();core.cycle_count+=3;}				//0x84
function opSTA_ZP(){memZP();subSTA();core.cycle_count+=3;}				//0x85
function opSTX_ZP(){memZP();subSTX();core.cycle_count+=3;}				//0x86
function opSMB0(){subSMB(0x01);core.cycle_count+=5;}						//0x87
function opDEY()													//0x88
{
	if (core.Y==0) core.Y=0xFF;
	else core.Y--;
	if (core.Y==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.Y>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
function opBIT_IMMED()												//0x89
{
	if ((core.A&memIMMED())==0) core.FlagZ=1;else core.FlagZ=0;
	core.cycle_count+=2;
}
function opTXA()													//0x8A
{
	core.A=core.X;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x8B
function opSTY_ADDRESS(){memADDRESS();subSTY();core.cycle_count+=4;}		//0x8C
function opSTA_ADDRESS(){memADDRESS();subSTA();core.cycle_count+=4;}		//0x8D
function opSTX_ADDRESS(){memADDRESS();subSTX();core.cycle_count+=4;}		//0x8E
function opBBS0(){subBBS(0x01);core.cycle_count+=5;}						//0x8F
function opBCC()													//0x90
{
	if (core.FlagC==0)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opSTA_IY()													//0x91
{
	memIY();
	subSTA();
	core.cycle_count+=6-cycle_penalty;	//no cycle penalty
}
function opSTA_IZP(){memIZP();subSTA();core.cycle_count+=5;}				//0x92
//function opNOP()													//0x93
function opSTY_ZPX(){memZPX();subSTY();core.cycle_count+=4;}				//0x94
function opSTA_ZPX(){memZPX();subSTA();core.cycle_count+=4;}				//0x95
function opSTX_ZPY(){memZPY();subSTX();core.cycle_count+=4;}				//0x96
function opSMB1(){subSMB(0x02);core.cycle_count+=5;}						//0x97
function opTYA()													//0x98
{
	core.A=core.Y;
	if (core.A==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.A>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
function opSTA_ADDRESSY()											//0x99
{
	memADDRESSY();
	subSTA();
	//debugMsg("STA_ADDRESSY: " + core.calcAddress);
	core.cycle_count+=5-cycle_penalty; //no cycle penalty

}
function opTXS()													//0x9A
{
	core.SP=core.X;
	//Don't set flags!
	//if (core.SP==0) core.FlagZ=1;else core.FlagZ=0;
	//if (core.SP>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0x9B
function opSTZ_ADDRESS(){memADDRESS();subSTZ();core.cycle_count+=4;}		//0x9C
function opSTA_ADDRESSX()											//0x9D
{
	memADDRESSX();
	subSTA();
	core.cycle_count+=5-cycle_penalty;} //no cycle penalty
function opSTZ_ADDRESSX(){memADDRESSX();subSTZ();core.cycle_count+=5;}	//0x9E
function opBBS1(){subBBS(0x02);core.cycle_count+=5;}						//0x9F
function opLDY_IMMED(){subLDY(memIMMED());core.cycle_count+=2;}			//0xA0
function opLDA_IX(){subLDA(memIX());core.cycle_count+=6;}				//0xA1
function opLDX_IMMED(){subLDX(memIMMED());core.cycle_count+=2;}			//0xA2
//function opNOP()													//0xA3
function opLDY_ZP(){subLDY(memZP());core.cycle_count+=3;}				//0xA4
function opLDA_ZP(){subLDA(memZP());core.cycle_count+=3;}				//0xA5
function opLDX_ZP(){subLDX(memZP());core.cycle_count+=3;}				//0xA6
function opSMB2_ZP(){subSMB(0x04);core.cycle_count+=5;}					//0xA7
function opTAY()													//0xA8
{
	core.Y=core.A;
	if (core.Y==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.Y>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
function opLDA_IMMED(){subLDA(memIMMED());core.cycle_count+=2;}			//0xA9
function opTAX()													//0xAA
{
	core.X=core.A;
	if (core.X==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.X>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0xAB
function opLDY_ADDRESS(){subLDY(memADDRESS());core.cycle_count+=4;}		//0xAC
function opLDA_ADDRESS(){subLDA(memADDRESS());core.cycle_count+=4;}		//0xAD
function opLDX_ADDRESS(){subLDX(memADDRESS());core.cycle_count+=4;}		//0xAE
function opBBS2(){subBBS(0x04);core.cycle_count+=5;}						//0xAF
function opBCS()													//0xB0
{
	if (core.FlagC==1)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opLDA_IY(){subLDA(memIY());core.cycle_count+=5;}				//0xB1
function opLDA_IZP(){subLDA(memIZP());core.cycle_count+=5;}				//0xB2
//function opNOP()													//0xB3
function opLDY_ZPX(){subLDY(memZPX());core.cycle_count+=4;}				//0xB4
function opLDA_ZPX(){subLDA(memZPX());core.cycle_count+=4;}				//0xB5
function opLDX_ZPY(){subLDX(memZPY());core.cycle_count+=4;}				//0xB6
function opSMB3(){subSMB(0x08);core.cycle_count+=5;}						//0xB7
function opCLV(){core.FlagV=0;core.cycle_count+=2;}							//0xB8
function opLDA_ADDRESSY(){subLDA(memADDRESSY());core.cycle_count+=4;}	//0xB9
function opTSX()													//0xBA
{
	core.X=core.SP;
	if (core.X==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.X>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
//function opNOP()													//0xBB
function opLDY_ADDRESSX(){subLDY(memADDRESSX());core.cycle_count+=4;}	//0xBC
function opLDA_ADDRESSX(){subLDA(memADDRESSX());core.cycle_count+=4;}	//0xBD
function opLDX_ADDRESSY(){subLDX(memADDRESSY());core.cycle_count+=4;}	//0xBE
function opBBS3(){subBBS(0x08);core.cycle_count+=5;}						//0xBF
function opCPY_IMMED(){subCPY(memIMMED());core.cycle_count+=2;}			//0xC0
function opCMP_IX(){subCMP(memIX());core.cycle_count+=6;}				//0xC1
//function opNOP_IMMED()											//0xC2
//function opNOP()													//0xC3
function opCPY_ZP(){subCPY(memZP());core.cycle_count+=3;}				//0xC4
function opCMP_ZP(){subCMP(memZP());core.cycle_count+=3;}				//0xC5
function opDEC_ZP(){subDEC(memZP());core.cycle_count+=5;}				//0xC6
function opSMB4(){subSMB(0x10);core.cycle_count+=5;}						//0xC7
function opINY()													//0xC8
{
	if (core.Y==0xFF){core.Y=0;core.FlagZ=1;} else{core.Y++;core.FlagZ=0;}
	if (core.Y>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
function opCMP_IMMED(){subCMP(memIMMED());core.cycle_count+=2;}			//0xC9
function opDEX()													//0xCA
{
	if (core.X==0) core.X=0xFF;
	else core.X--;
	if (core.X==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.X>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
function opWAI(){core.running=0;core.cycle_count+=3;}							//0xCB
function opCPY_ADDRESS(){subCPY(memADDRESS());core.cycle_count+=4;}		//0xCC
function opCMP_ADDRESS(){subCMP(memADDRESS());core.cycle_count+=4;}		//0xCD
function opDEC_ADDRESS(){subDEC(memADDRESS());core.cycle_count+=6;}		//0xCE
function opBBS4(){subBBS(0x10);core.cycle_count+=5;}						//0xCF
function opBNE()													//0xD0
{
	if (core.FlagZ==0)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opCMP_IY(){subCMP(memIY());core.cycle_count+=5;}				//0xD1
function opCMP_IZP(){subCMP(memIZP());core.cycle_count+=5;}				//0xD2
//function opNOP()													//0xD3
//function opNOP_ZPX()												//0xD4
function opCMP_ZPX(){subCMP(memZPX());core.cycle_count+=4;}				//0xD5
function opDEC_ZPX(){subDEC(memZPX());core.cycle_count+=6;}				//0xD6
function opSMB5(){subSMB(0x20);core.cycle_count+=5;}						//0xD7													//0xD7
function opCLD(){core.FlagD=0;core.cycle_count+=2;}							//0xD8
function opCMP_ADDRESSY(){subCMP(memADDRESSY());core.cycle_count+=4;}	//0xD9
function opPHX()													//0xDA
{
	core.bus.write(0x100+core.SP, core.X);
	if (core.SP==0) core.SP=0xFF;
	else core.SP--;
	core.cycle_count+=3;
}
function opSTP(){core.running=0;core.cycle_count+=3;}							//0xDB
//function opNOP_ADDRESS()											//0xDC
function opCMP_ADDRESSX(){subCMP(memADDRESSX());core.cycle_count+=4;}	//0xDD
function opDEC_ADDRESSX()											//0xDE
{
	subDEC(memADDRESSX());
	core.cycle_count+=7-cycle_penalty;	//no cycle penalty
}
function opBBS5(){subBBS(0x20);core.cycle_count+=5;}						//0xDF
function opCPX_IMMED(){subCPX(memIMMED());core.cycle_count+=2;}			//0xE0
function opSBC_IX(){subSBC(memIX());core.cycle_count+=6;}				//0xE1
//function opNOP_IMMED()											//0xE2
//function opNOP()													//0xE3
function opCPX_ZP(){subCPX(memZP());core.cycle_count+=3;}				//0xE4
function opSBC_ZP(){subSBC(memZP());core.cycle_count+=3;}				//0xE5
function opINC_ZP(){subINC(memZP());core.cycle_count+=5;}				//0xE6
function opSMB6(){subSMB(0x40);core.cycle_count+=5;}						//0xE7
function opINX()													//0xE8
{
	if (core.X==0xFF){core.X=0;core.FlagZ=1;} else{core.X++;core.FlagZ=0;}
	if (core.X>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=2;
}
function opSBC_IMMED(){subSBC(memIMMED());core.cycle_count+=2;}			//0xE9
//function opNOP()													//0xEA
//function opNOP()													//0xEB
function opCPX_ADDRESS(){subCPX(memADDRESS());core.cycle_count+=4;}		//0xEC
function opSBC_ADDRESS(){subSBC(memADDRESS());core.cycle_count+=4;}		//0xED
function opINC_ADDRESS(){subINC(memADDRESS());core.cycle_count+=5;}		//0xEE
function opBBS6(){subBBS(0x40);core.cycle_count+=5;}						//0xEF
function opBEQ()													//0xF0
{
	if (core.FlagZ==1)
	{
		//const high_byte=core.PC&0xFF00;
		const t0=memIMMED();
		const high_byte=core.PC&0xFF00;
		if (t0>=0x80) core.PC-=(0x100-t0);
		else core.PC+=t0;
		if (high_byte!=(core.PC&0xFF00)) core.cycle_count++;
		core.cycle_count++;
	}
	else core.PC++;
	core.cycle_count+=2;
}
function opSBC_IY(){subSBC(memIY());core.cycle_count+=5;}				//0xF1
function opSBC_IZP(){subSBC(memIZP());core.cycle_count+=5;}				//0xF2
//function opNOP()													//0xF3
//function opNOP_ZPX()												//0xF4
function opSBC_ZPX(){subSBC(memZPX());core.cycle_count+=4;}				//0xF5
function opINC_ZPX(){subINC(memZPX());core.cycle_count+=6;}				//0xF6
function opSMB7(){subSMB(0x80);core.cycle_count+=5;}						//0xF7
function opSED(){core.FlagD=1;core.cycle_count+=2;}							//0xF8
function opSBC_ADDRESSY(){subSBC(memADDRESSY());core.cycle_count+=4;}	//0xF9
function opPLX()													//0xFA
{
	if (core.SP==0xFF) core.SP=0;
	else core.SP++;
	core.X=core.bus.read(0x100+core.SP);
	if (core.X==0) core.FlagZ=1;else core.FlagZ=0;
	if (core.X>=0x80) core.FlagN=1;else core.FlagN=0;
	core.cycle_count+=4;
}
//function opNOP()													//0xFB
//function opNOP_ADDRESS()											//0xFC
function opSBC_ADDRESSX(){subSBC(memADDRESSX());core.cycle_count+=4;}	//0xFD
function opINC_ADDRESSX()											//0xFE
{
	subINC(memADDRESSX());
	core.cycle_count+=7-cycle_penalty;	//no cycle penalty
}
function opBBS7(){subBBS(0x80);core.cycle_count+=5;}						//0xFF

let opLens= [2,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,3,1,1,3,3,3,3,
			3,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,3,1,1,3,3,3,3,
			1,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,3,1,1,3,3,3,3,
			1,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,3,1,1,3,3,3,3,
			2,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,
			2,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,3,1,1,3,3,3,3,
			2,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,2,2,2,2,1,3,1,1,3,3,3,3,
			2,2,2,1,2,2,2,2,1,2,1,1,3,3,3,3,2,2,2,1,3,2,2,2,1,3,1,1,3,3,3,3];

export let opcodes= [
	opBRK,				//0x00
	opORA_IX,			//0x01
	opNOP_IMMED,		//0x02
	opNOP,				//0x03
	opTSB_ZP,			//0x04
	opORA_ZP,			//0x05
	opASL_ZP,			//0x06
	opRMB0,				//0x07
	opPHP,				//0x08
	opORA_IMMED,		//0x09
	opASL,				//0x0A
	opNOP,				//0x0B
	opTSB_ADDRESS,		//0x0C
	opORA_ADDRESS,		//0x0D
	opASL_ADDRESS,		//0x0E
	opBBR0,				//0x0F
	opBPL,				//0x10
	opORA_IY,			//0x11
	opORA_IZP,			//0x12
	opNOP,				//0x13
	opTRB_ZP,			//0x14
	opORA_ZPX,			//0x15
	opASL_ZPX,			//0x16
	opRMB1,				//0x17
	opCLC,				//0x18
	opORA_ADDRESSY,		//0x19
	opINC,				//0x1A
	opNOP,				//0x1B
	opTRB_ADDRESS,		//0x1C
	opORA_ADDRESSX,		//0x1D
	opASL_ADDRESSX,		//0x1E
	opBBR1,				//0x1F
	opJSR,				//0x20
	opAND_IX,			//0x21
	opNOP_IMMED,		//0x22 65816: JSL addr - jsr long
	opNOP,				//0x23
	opBIT_ZP,			//0x24
	opAND_ZP,			//0x25
	opROL_ZP,			//0x26
	opRMB2,				//0x27
	opPLP,				//0x28
	opAND_IMMED,		//0x29
	opROL,				//0x2A
	opNOP,				//0x2B
	opBIT_ADDRESS,		//0x2C
	opAND_ADDRESS,		//0x2D
	opROL_ADDRESS,		//0x2E
	opBBR2,				//0x2F
	opBMI,				//0x30
	opAND_IY,			//0x31
	opAND_IZP,			//0x32
	opNOP,				//0x33
	opBIT_ZPX,			//0x34
	opAND_ZPX,			//0x35
	opROL_ZPX,			//0x36
	opRMB3,				//0x37
	opSEC,				//0x38
	opAND_ADDRESSY,		//0x39
	opDEC,				//0x3A
	opNOP,				//0x3B
	opBIT_ADDRESSX,		//0x3C
	opAND_ADDRESSX,		//0x3D
	opROL_ADDRESSX,		//0x3E
	opBBR3,				//0x3F
	opRTI,				//0x40
	opEOR_IX,			//0x41
	opWDM_EXTENDED,		//0x42 here: extended instruction 65816: WDM
	opNOP,				//0x43
	opNOP_ZP,			//0x44
	opEOR_ZP,			//0x45
	opLSR_ZP,			//0x46
	opRMB4,				//0x47
	opPHA,				//0x48
	opEOR_IMMED,		//0x49
	opLSR,				//0x4A
	opNOP,				//0x4B
	opJMP_ADDRESS,		//0x4C
	opEOR_ADDRESS,		//0x4D
	opLSR_ADDRESS,		//0x4E
	opBBR4,				//0x4F
	opBVC,				//0x50
	opEOR_IY,			//0x51
	opEOR_IZP,			//0x52
	opNOP,				//0x53
	opNOP_ZPX,			//0x54
	opEOR_ZPX,			//0x55
	opLSR_ZPX,			//0x56
	opRMB5,				//0x57
	opCLI,				//0x58
	opEOR_ADDRESSY,		//0x59
	opPHY,				//0x5A
	opNOP,				//0x5B
	opNOP_ADDRESS,		//0x5C 65816: JML addr - jmp long
	opEOR_ADDRESSX,		//0x5D
	opLSR_ADDRESSX,		//0x5E
	opBBR5,				//0x5F
	opRTS,				//0x60
	opADC_IX,			//0x61
	opNOP_IMMED,		//0x62
	opNOP,				//0x63
	opSTZ_ZP,			//0x64
	opADC_ZP,			//0x65
	opROR_ZP,			//0x66
	opRMB6,				//0x67
	opPLA,				//0x68
	opADC_IMMED,		//0x69
	opROR,				//0x6A
	opNOP,				//0x6B
	opJMP_I,			//0x6C
	opADC_ADDRESS,		//0x6D
	opROR_ADDRESS,		//0x6E
	opBBR6,				//0x6F
	opBVS,				//0x70
	opADC_IY,			//0x71
	opADC_IZP,			//0x72
	opNOP,				//0x73
	opSTZ_ZPX,			//0x74
	opADC_ZPX,			//0x75
	opROR_ZPX,			//0x76
	opRMB7,				//0x77
	opSEI,				//0x78
	opADC_ADDRESSY,		//0x79
	opPLY,				//0x7A
	opNOP,				//0x7B
	opJMP_IADDRESSX,	//0x7C
	opADC_ADDRESSX,		//0x7D
	opROR_ADDRESSX,		//0x7E
	opBBR7,				//0x7F
	opBRA,				//0x80
	opSTA_IX,			//0x81
	opNOP_IMMED,		//0x82
	opNOP,				//0x83
	opSTY_ZP,			//0x84
	opSTA_ZP,			//0x85
	opSTX_ZP,			//0x86
	opSMB0,				//0x87
	opDEY,				//0x88
	opBIT_IMMED,		//0x89
	opTXA,				//0x8A
	opNOP,				//0x8B
	opSTY_ADDRESS,		//0x8C
	opSTA_ADDRESS,		//0x8D
	opSTX_ADDRESS,		//0x8E
	opBBS0,				//0x8F
	opBCC,				//0x90
	opSTA_IY,			//0x91
	opSTA_IZP,			//0x92
	opNOP,				//0x93
	opSTY_ZPX,			//0x94
	opSTA_ZPX,			//0x95
	opSTX_ZPY,			//0x96
	opSMB1,				//0x97
	opTYA,				//0x98
	opSTA_ADDRESSY,		//0x99
	opTXS,				//0x9A
	opNOP,				//0x9B
	opSTZ_ADDRESS,		//0x9C
	opSTA_ADDRESSX,		//0x9D
	opSTZ_ADDRESSX,		//0x9E
	opBBS1,				//0x9F
	opLDY_IMMED,		//0xA0
	opLDA_IX,			//0xA1
	opLDX_IMMED,		//0xA2
	opNOP,				//0xA3
	opLDY_ZP,			//0xA4
	opLDA_ZP,			//0xA5
	opLDX_ZP,			//0xA6
	opSMB2_ZP,			//0xA7
	opTAY,				//0xA8
	opLDA_IMMED,		//0xA9
	opTAX,				//0xAA
	opNOP,				//0xAB
	opLDY_ADDRESS,		//0xAC
	opLDA_ADDRESS,		//0xAD
	opLDX_ADDRESS,		//0xAE
	opBBS2,				//0xAF
	opBCS,				//0xB0
	opLDA_IY,			//0xB1
	opLDA_IZP,			//0xB2
	opNOP,				//0xB3
	opLDY_ZPX,			//0xB4
	opLDA_ZPX,			//0xB5
	opLDX_ZPY,			//0xB6
	opSMB3,				//0xB7
	opCLV,				//0xB8
	opLDA_ADDRESSY,		//0xB9
	opTSX,				//0xBA
	opNOP,				//0xBB
	opLDY_ADDRESSX,		//0xBC
	opLDA_ADDRESSX,		//0xBD
	opLDX_ADDRESSY,		//0xBE
	opBBS3,				//0xBF
	opCPY_IMMED,		//0xC0
	opCMP_IX,			//0xC1
	opNOP_IMMED,		//0xC2 65816: REP #immed - reset status bits
	opNOP,				//0xC3
	opCPY_ZP,			//0xC4
	opCMP_ZP,			//0xC5
	opDEC_ZP,			//0xC6
	opSMB4,				//0xC7
	opINY,				//0xC8
	opCMP_IMMED,		//0xC9
	opDEX,				//0xCA
	opWAI,				//0xCB
	opCPY_ADDRESS,		//0xCC
	opCMP_ADDRESS,		//0xCD
	opDEC_ADDRESS,		//0xCE
	opBBS4,				//0xCF
	opBNE,				//0xD0
	opCMP_IY,			//0xD1
	opCMP_IZP,			//0xD2
	opNOP,				//0xD3
	opNOP_ZPX,			//0xD4
	opCMP_ZPX,			//0xD5
	opDEC_ZPX,			//0xD6
	opSMB5,				//0xD7
	opCLD,				//0xD8
	opCMP_ADDRESSY,		//0xD9
	opPHX,				//0xDA
	opSTP,				//0xDB
	opNOP_ADDRESS,		//0xDC
	opCMP_ADDRESSX,		//0xDD
	opDEC_ADDRESSX,		//0xDE
	opBBS5,				//0xDF
	opCPX_IMMED,		//0xE0
	opSBC_IX,			//0xE1
	opNOP_IMMED,		//0xE2 65816: SEP #immed - set status bits
	opNOP,				//0xE3
	opCPX_ZP,			//0xE4
	opSBC_ZP,			//0xE5
	opINC_ZP,			//0xE6
	opSMB6,				//0xE7
	opINX,				//0xE8
	opSBC_IMMED,		//0xE9
	opNOP,				//0xEA
	opNOP,				//0xEB
	opCPX_ADDRESS,		//0xEC
	opSBC_ADDRESS,		//0xED
	opINC_ADDRESS,		//0xEE
	opBBS6,				//0xEF
	opBEQ,				//0xF0
	opSBC_IY,			//0xF1
	opSBC_IZP,			//0xF2
	opNOP,				//0xF3
	opNOP_ZPX,			//0xF4
	opSBC_ZPX,			//0xF5
	opINC_ZPX,			//0xF6
	opSMB7,				//0xF7
	opSED,				//0xF8
	opSBC_ADDRESSY,		//0xF9
	opPLX,				//0xFA
	opNOP,				//0xFB
	opNOP_ADDRESS,		//0xFC
	opSBC_ADDRESSX,		//0xFD
	opINC_ADDRESSX,		//0xFE
	opBBS7				//0xFF
];
