import { core, opcodes } from "./core65c02";

/*

 Slightly modified version of Joey Shepard's
 https://github.com/JoeyShepard/65C02_Emulator/blob/master/emu6502.js
*/

/*Limitations:
1. No wrapping at 64k boundary
2. No wrapping in zero page mode
	Did Klaus suite test for this?
3. BRK doesn't push anything
4. Interrupts?
5. *IMPORTANT!: When clock rate drops, approaches 50mhz, which is holey array speed!!!!
*/

/*Improvements:
1. Change cycle count below to make faster
2. make two versions of bank where only one has CalcBanked calculation
*/

//******************
//*GLOBAL VARIABLES*
//******************

let loaded= 0;
let NMOS_mode;
let debugflag;
let debugBuffer= [];
let cycleLog= "";
let cycleLogActivated= false;

let keyBuffer= [];

const breakpoints= [
	// 0xC803
	// 0xCC90
	// 0xCCBD
	0xC814
];
let tempBP= 0;
let jsrLevel= 0;
let stopAtjsrLevel= 0;
let wannaStopOnRTS= false;

self.addEventListener('message', OnMessage , false);


//**********************************
//*FUNCTIONS FOR RUNNING CPU CYCLES*
//**********************************

//https://stackoverflow.com/questions/31439286/does-javascript-have-anything-similar-to-vbas-doevents
function* cycle10_6()
{
	do
	{
		for(let i=0; i<100_000; i++)
			if(core.running) {
				core.calcAddress= -1;
				// if (cycleLogActivated) recordCycle();
				// else
				if(core.PC == tempBP || breakpoints.includes(core.PC)) {
					tempBP= 0;
					core.running= 0;
					self.postMessage({cmd:"stopped", PC: core.PC});
					yield;
				}

				const op= core.bus.read(core.PC);

				if(op == 0x20) {
					jsrLevel++;
					// console.log(core.PC.toString(16),"JSR", (core.bus.read(core.PC+1)+(core.bus.read(core.PC+2)<<8)).toString(16), jsrLevel);
				}

				if(op == 0x60) {
					// console.log(core.PC.toString(16),"RTS", (core.bus.read(0x100|core.SP+1)+1+(core.bus.read(0x100|core.SP+2)<<8)).toString(16), jsrLevel-1);
					if(wannaStopOnRTS && stopAtjsrLevel == jsrLevel) {
						wannaStopOnRTS= false;
						core.running= 0;
						self.postMessage({cmd:"stopped", PC: core.PC});
						yield;
					}
					jsrLevel--;
				}

				core.PC++;
				opcodes[op]();
			}
		yield;
	} while(true);
}


const cycleGen= cycle10_6();

function cycleFunc()
{
	let obj= cycleGen.next();
	if(!obj.done && core.running)
		setTimeout(cycleFunc, 0);
}

function recordCycle()
{
	//cycleLog+=core.cycle_count.toString().toUpperCase().padStart(12,"0")+"  ";
	cycleLog+=core.PC.toString(16).toUpperCase().padStart(4,"0")+"  ";
	const PC_start=core.PC;
	const op=core.bus.read(core.PC);
	opcodes[core.bus.read(core.PC++)]();
	let cycleTemp="";
	let cycleBytes=[];
	for (let i=0;i<opLens[core.bus.read(PC_start)];i++)
	{
		cycleBytes.push(core.bus.read(PC_start+i));
		cycleTemp+=core.bus.read(PC_start+i).toString(16).padStart(2,"0")+" ";
	}
	cycleLog+=cycleTemp.toUpperCase().padEnd(10," ");
	cycleLog+=disassemble(cycleBytes);
	cycleLog+="core.A:"+core.A.toString(16).toUpperCase().padStart(2,"0")+" ";
	if ((core.A>=" ".charCodeAt(0))&&(core.A<="~".charCodeAt(0))) cycleLog+="("+String.fromCharCode(core.A)+") ";
	else cycleLog+="( ) ";
	cycleLog+="core.X:"+core.X.toString(16).toUpperCase().padStart(2,"0")+" ";
	cycleLog+="core.Y:"+core.Y.toString(16).toUpperCase().padStart(2,"0")+" ";
	cycleLog+="core.SP:"+core.SP.toString(16).toUpperCase().padStart(2,"0")+" ";
	if (core.calcAddress==-1) cycleLog+="                 ";
	else
	{
		cycleLog+="CA:"+core.calcAddress.toString(16).toUpperCase().padStart(4,"0")+" ";
		cycleLog+="("+(CalcBanked>>16).toString(16).toUpperCase().padStart(2,"0")+":";
		cycleLog+=(CalcBanked&0xFFFF).toString(16).toUpperCase().padStart(4,"0")+")";
	}
	cycleLog+=" "+core.cycle_count;
	cycleLog+="\n";
	if (op==0) cycleLog+="\n";
}


//**************
//*MESSAGE LOOP*
//**************

async function OnMessage({data:{cmd, id, data}})
{
	debugflag= '';
	switch(cmd) {

		case 'setup':
			await setup(data);
			self.postMessage({cmd: "setup", id: id, data: "done" });
			break;

		// case 'debug':
		// 	if (debugBuffer.length!=0)
		// 	{
		// 		self.postMessage({cmd:"debug",debugBuffer});
		// 		debugBuffer=[];
		// 	}
		// 	break;

		case "memWrite":
			core.bus.writeHexa(data.bank, data.addr, data.value);
			break;

		case "dumpRam":
			dumpMem(data.addr);
			break;

		// case 'cycles':
		// 	self.postMessage({cmd:"cycles",core.cycle_count});
		// 	break;

		case 'step':
			step();
			self.postMessage({cmd: "step", id: id });
			break;

		case 'stepOver':
			if(0x20 == core.bus.read(core.PC)) {
				tempBP= core.PC + 3;
				run();
			} else
				step();
			self.postMessage({cmd: "stepOver", id: id });
			break;

		case 'stepOut': {
			wannaStopOnRTS= true;
			stopAtjsrLevel= jsrLevel;
			// console.log('stepOut', core.PC.toString(16), jsrLevel);
			run();
			self.postMessage({cmd: "stepOut", id: id });
			break;
		}

		case 'register': {
			const {register, value}= data;
			switch(register) {
				case "PC":	core.PC= value; break;
				case "A":	core.A= value; break;
				case "X":	core.X= value; break;
				case "Y":	core.Y= value; break;
				case "SP":	core.SP= value & 0xFF; break;
				case "c":	core.FlagC= value; break;
				case "z":	core.FlagZ= value; break;
				case "i":	core.FlagI= value; break;
				case "d":	core.FlagD= value; break;
				case "b":	core.FlagB= value; break;
				case "v":	core.FlagV= value; break;
				case "n":	core.FlagN= value; break;
				default:
					self.postMessage({cmd: "error", error: `unknown register "${register}"` });
			}
			break;
		}

		case 'update': {
			const P= {
				c: core.FlagC,
				z: core.FlagZ,
				i: core.FlagI,
				d: core.FlagD,
				b: core.FlagB,
				v: core.FlagV,
				n: core.FlagN
			};
			const updateData= {
				PC: core.PC, A: core.A, X: core.X, Y: core.Y, SP: core.SP, P,
				cycle_count: core.cycle_count, calcAddress: core.calcAddress
			};
			self.postMessage({cmd: "update", id: id, data: updateData });
			break;
		}

		case 'run':
			run();
			break;

		case 'stop':
			if(core.running)
			{
				//self.postMessage({cmd:"msgbox",msg:"begin stopping"});
				core.running= 0;
				self.postMessage({cmd:"stopped"});
			}
			//else self.postMessage({cmd:"msgbox",msg:"did not begin stopping"});
			break;

		case 'reset':
			// debugger;
			core.PC= core.bus.read(0xFFFC)+(core.bus.read(0xFFFD)<<8);
			core.FlagD= 0;
			//What other flags get set at startup? I? B?
			break;

		case 'keys':
			keyBuffer= keyBuffer.concat(data.keys);
			break;

		case "keydown":
		case "keyup":
			core.bus.keys.set(data.key, cmd == "keydown");
			break;

		// case 'reset cycles':
		// 	core.cycle_count= 0;
		// 	break;

		// case 'cycle table':
		// 	self.postMessage({cmd:'cycle table',cycleLog});
		// 	break;

		// case 'cycle log on':
		// 	cycleLogActivated= true;
		// 	break;
	}
}

function run() {
	if(!core.running) {
		core.running= 1;
		cycleFunc();
	}
}
function step() {
	const op= core.bus.read(core.PC++);
	if(op == 0x20)
		jsrLevel++;
	if(op == 0x60)
		jsrLevel--;
	core.calcAddress=-1;
	opcodes[op]();
}

function dumpMem(addr) {
	const hexword= function(value) {
		return hexbyte(value >>> 8) + hexbyte(value & 0xff);
	}
	const hexbyte= function(value) {
		return (((value >>> 4) & 0xf).toString(16) + (value & 0xf).toString(16)).toUpperCase();
	}
	let dumpStr= `${hexword(addr)}:`;
	for(let column= 0; column<16; column++) {
		const char= hexbyte(core.bus.ram[addr+column]);
		dumpStr+= " "+char;
	}
	console.log(dumpStr);
	// return dumpStr;
}

//****************
//*SETUP FUNCTION*
//****************

function setup({busSrcFile, buffer, NMOS, debuggerOnBRK})
{
	return new Promise(resolve => {
		function onLoaded({default: Bus}) {
			core.bus= new Bus(self, buffer);
			NMOS_mode= NMOS;
			core.debuggerOnBRK= debuggerOnBRK;
			resolve();
		};

		// this trickery because vitejs is not able to deal with dynamic variable imports
		eval(`import("/src/machines/${busSrcFile}").then(onLoaded)`);
	});

/*
	let record_bytes=0;
	let record_address=0;
	let record_hi_address=0;
	let bytes_written=0;
	let listing=[];
	let labellist=[];
	//Loading listing and hex files
	self.postMessage({cmd:"status",msg:"loading listing"});
	let myRequest = new Request(path+'listing.lst');
	fetch(myRequest).then(function(response)
	{
		return response.text().then(function(text)
		{
			//self.postMessage({cmd:"status",msg:"raw lst loaded (" + ((text.length)/1024).toFixed(1) + "k)"});
			self.postMessage({cmd:"status",msg:"raw listing loaded"});

			//Old version from Kowalski listing
			if (list_style=="Kowalski")
			{
				let listlines=text.split("\n");
				let error_msg='';
				for (i=0;i<listlines.length;i++)
				{
					let ishex="unknown";
					let islabel="unknown";
					let buff='';

					//self.postMessage({cmd:"msgbox",msg:(listing+"\n=====\n"+listlines[i])});

					inner_loop:
					for (j=7;j<listlines[i].length;j++)
					{
						if (j==7)
						{
							if (IsNumChar(listlines[i][7]))
							{
								ishex="yes";
								islabel="no";
							}
							else if (IsHexChar(listlines[i][7]))
							{
								ishex="maybe";
								islabel="maybe";
							}
							else if (IsAlphaChar(listlines[i][7]))
							{
								ishex="no";
								islabel="yes";
							}
							else
							{
								break inner_loop;
							}
							buff=listlines[i][7];
						}
						else
						{
							if ((islabel=="yes")||(ishex=="maybe"))
							{
								if ((":; "+String.fromCharCode(13)+String.fromCharCode(9)).includes(listlines[i][j]))
								{
									let really_label=true;
									if ((ishex=="yes")||(ishex=="maybe"))
									{
										//C000: is a label
										if (listlines[i][j]==":") really_label=true;
										//C00 is a label (address is always 4 long)
										else if (buff.length!=4) really_label=true;
										//C000 is probably an address not a label
										else really_label=false;
									}

									if (really_label)
									{
										//self.postMessage({cmd:"msgbox",msg:("Label added: "+buff)});

										//IGNORES ANY OTHER INFO ON LINE
										//labellist.push(listlines[i].substr(7));
										labellist.push(buff);
										break inner_loop;
									}
								}
							}
							if ((ishex=="yes")||(ishex=="maybe"))
							{
								if (j==11)
								{
									if (listlines[i][11]==' ')
									{
										//self.postMessage({cmd:'msgbox',msg:i+' Hex ' + buff});
										let list_address=HexCharToInt(buff[0])*0x1000;
										list_address+=HexCharToInt(buff[1])*0x100;
										list_address+=HexCharToInt(buff[2])*0x10;
										list_address+=HexCharToInt(buff[3])*0x1;

										for (k=0;k<labellist.length;k++)
											listing.push({address:list_address,label:labellist[k],op:''});
										labellist=[];
										if (listlines[i][23]==" ") listing.push({address:list_address,label:'',op:listlines[i].substr(24)});
										//For some reason, .RS is one character closer to the left in listing :/
										else listing.push({address:list_address,label:'',op:listlines[i].substr(23)});

										break inner_loop;
									}
									else
									{
										if ((IsAlphaChar(listlines[i][11])==false)&&(IsNumChar(listlines[i][11])==false))
										{
											error_msg="invalid character on line " + i + "\n" + listlines[i];
											break inner_loop;
										}
										else
										{
											ishex="no";
											islabel="true";
										}
									}
								}
								else if (j<11)
								{
									if (IsHexChar(listlines[i][j])==false)
									{
										if(ishex=="yes")
										{
											error_msg="invalid number format in listing file on line " + i + "\n" + listlines[i];
											break inner_loop;
										}
										else if (ishex=="maybe")
										{
											ishex="no";
											islabel="yes";
											buff+=listlines[i][j];
										}
									}
									else buff+=listlines[i][j];
								}
							}
							else if (islabel=="yes")
							{
								if ((listlines[i].charCodeAt(j)==13)||(listlines[i].charCodeAt(j)==9))
								{
									//Do nothing. Not invalid but also don't add to name
								}
								else if ((IsAlphaChar(listlines[i][j])==false)&&(IsNumChar(listlines[i][j])==false)&&(listlines[i][j]!="_"))
								{
									error_msg="invalid character ("+listlines[i].charCodeAt(j)+") on line " + i + "\n" + listlines[i];
									break inner_loop;
								}
								else buff+=listlines[i][j];
							}
						}
					}
					if (error_msg!='')
					{
						self.postMessage({cmd:"status",msg:"unable to load listing file!"});
						self.postMessage({cmd:"error",msg:error_msg});
						return;
					}
				}
			}
			else if (list_style=="CA65")
			{
				//New version for CA65
				//Simpler - does not treat labels separately
					//Clickable labels would need to separate them out

				let listlines=text.split("\n");
				let error_msg='';
				//Skip first four lines
				for (i=4;i<listlines.length;i++)
				{
					if (listlines[i].substring(6,7)!='r')
					{
						let address=listlines[i].substring(2,6);
						let line=listlines[i].substring(24).trim();
						if ((line!='')&&(line[0]!=';'))
						{
							listing.push({address:parseInt("0x"+address),line:line});
							//self.postMessage({cmd:"msgbox",msg:"$"+address+"$"+line});
						}
					}
					//Had forgotten this then added later. UNTESTED!
					if (error_msg!='')
					{
						self.postMessage({cmd:"status",msg:"unable to load listing file!"});
						self.postMessage({cmd:"error",msg:error_msg});
						return;
					}
				}
			}
			else if (list_style=="AS")
			{
				//Even newer version for Macroassembler AS
				//Like CA65, does not treat labels separately

				let listlines=text.split("\n");
				let error_msg='';
				//Skip first 3 rows
				for (i=3;i<listlines.length;i++)
				{
					let addline=false;
					let address=listlines[i].substring(13,17).trim();

					//First character of line after main listing is 12 (Form feed control character)
					if (listlines[i].charCodeAt(0)==12)
					{
						break;
					}
					//No address means continued line or output from console, so ignore
					else if (address.length!=0)
					{
						address=("0000"+address).slice(-4);
						//Valid lines have colon. Check should not be necessary but just in case
						if (listlines[i][18]==":")
						{
							//Check if any bytes were laid down
							if (((listlines[i][20]>="0")&&(listlines[i][20]<="9"))||((listlines[i][20]>="core.A")&&(listlines[i][20]<="F")))
								if (((listlines[i][21]>="0")&&(listlines[i][21]<="9"))||((listlines[i][21]>="core.A")&&(listlines[i][21]<="F")))
									if (listlines[i][22]==" ") addline=true;
							//If no bytes laid down, check for label
							//(AS supports label without colon if in first column but assume colon here)
							if (!addline)
							{
								let tempstr=listlines[i].substring(40).trim();
								if (tempstr.indexOf(":")!=-1)
								{
									//Cut off at colon
									tempstr=tempstr.substring(0,tempstr.indexOf(":"));
									//Remove leading period if exists
									if (tempstr[0]==".") tempstr=tempstr.substring(1);
									//Label can't start with a number
									if ((tempstr[0]<"0")||(tempstr[0]>"9"))
									{
										//Must contain only valid characters
										if (tempstr.match(/^[_a-z0-9]+$/i)) addline=true;
									}
								}
							}
						}
					}

					//tempmsg=i + listlines[i];
					//tempmsg+="$"+listlines[i].substring(40);
					//self.postMessage({cmd:"msgbox",msg:tempmsg});
					if (error_msg!='')
					{
						self.postMessage({cmd:"status",msg:"unable to load listing file!"});
						self.postMessage({cmd:"error",msg:error_msg});
						return;
					}
					if (addline)
					{
						let line=listlines[i].substring(40).trim();
						listing.push({address:parseInt("0x"+address),line:line});
						//self.postMessage({cmd:"msgbox",msg:"$"+address+"$"+line});
					}
				}
			}
			else if (list_style=="Generic")
			{
				let listlines=text.split("\n");
				let error_msg='';

				for (i=0;i<listlines.length;i++)
				{
					let address=listlines[i].substring(0,4);
					let line=listlines[i].substring(5).trim();
					listing.push({address:parseInt("0x"+address),line:line});
					//self.postMessage({cmd:"msgbox",msg:"$"+address+"$"+line});

					//Had forgotten this then added later. UNTESTED!
					if (error_msg!='')
					{
						self.postMessage({cmd:"status",msg:"unable to load listing file!"});
						self.postMessage({cmd:"error",msg:error_msg});
						return;
					}
				}
			}
			self.postMessage({cmd:"listing",listing});

			self.postMessage({cmd:"status",msg:"loading keys"});
			let myRequest = new Request(path+'keys.txt');
			fetch(myRequest).then(function(response)
			{
				return response.text().then(function(text)
				{
					keyBuffer=keyBuffer.concat(text.split('').map(x => x.charCodeAt(0)));

					self.postMessage({cmd:"status",msg:"loading input"});
					let myRequest = new Request(path+'input.txt');
					fetch(myRequest).then(function(response)
					{

						return response.text().then(function(text)
						{
							inputBuffer=inputBuffer.concat(text.split('').map(x => x.charCodeAt(0)));

							self.postMessage({cmd:"status",msg:"loading hex"});
							let myRequest = new Request(path+'prog.hex');
							fetch(myRequest).then(function(response)
							{
								return response.text().then(function(text)
								{
									//self.postMessage({cmd:"status",msg:"raw hex loaded (" + ((text.length)/1024).toFixed(1) + "k)"});
									self.postMessage({cmd:"status",msg:"raw hex loaded"});
									let lines = text.split("\n");
									for (i=0;i<lines.length;i++)
									{
										if (lines[i].length!=0)
										{
											if (lines[i][0]!=':')
											{
												self.postMessage({cmd:"error",msg:"corrupt hex file!"});
												return;
											}

											if ((HexCharToInt(lines[i][7])+HexCharToInt(lines[i][8])*0x10)==0)
											{
												//Line of data
												record_bytes=HexCharToInt(lines[i][1])*16+HexCharToInt(lines[i][2]);
												record_address=HexCharToInt(lines[i][3])*0x1000;
												record_address+=HexCharToInt(lines[i][4])*0x100;
												record_address+=HexCharToInt(lines[i][5])*0x10;
												record_address+=HexCharToInt(lines[i][6])*0x1;
												for (j=0;j<record_bytes;j++)
												{
													core.bus.write(
														record_address+record_hi_address+j,
														HexCharToInt(lines[i][9+j*2])*16+HexCharToInt(lines[i][10+j*2])
														);
													bytes_written++;
												}
											}
											else if ((HexCharToInt(lines[i][7])*0x10+HexCharToInt(lines[i][8]))==1)
											{
												//End of file record
												//Nothing should come after this. (Check?)
											}
											else if ((HexCharToInt(lines[i][7])*0x10+HexCharToInt(lines[i][8]))==4)
											{
												//Sets top 16 bits of 32 bit address
												record_hi_address=HexCharToInt(lines[i][9])*0x1000;
												record_hi_address+=HexCharToInt(lines[i][10])*0x100;
												record_hi_address+=HexCharToInt(lines[i][11])*0x10;
												record_hi_address+=HexCharToInt(lines[i][12])*0x1;
												record_hi_address<<=16;
											}

											else
											{
												self.postMessage({cmd:"msgbox",msg:"Unknown record type "+HexCharToInt(lines[i][7])+HexCharToInt(lines[i][8])+" in line: "+lines[i]});
											}
										}
									}
									if (bytes_written<1024)
										self.postMessage({cmd:"status",msg:"hex loaded (" + bytes_written + " bytes)"})
									else self.postMessage({cmd:"status",msg:"hex loaded (" + ((bytes_written)/1024).toFixed(1) + "k)"})
									//Set core.PC to reset vector
									core.PC=core.bus.read(0xFFFC)+(core.bus.read(0xFFFD)<<8);

									self.postMessage({cmd:"ready"});
								});
							});
						});
					});
				});
			});
		});
	});
*/
}



//*********************************************
//*FUNCTIONS FOR LOADING HEX AND LISTING FILES*
//*********************************************
/*
function HexCharToInt(hexchar)
{
	if ((hexchar.charCodeAt(0)>="0".charCodeAt(0))&&(hexchar.charCodeAt(0)<="9".charCodeAt(0)))
	{
		return hexchar.charCodeAt(0)-"0".charCodeAt(0);
	}
	else return hexchar.charCodeAt(0)-"core.A".charCodeAt(0)+10;
}
function IsHexChar(hexchar)
{
	if ((hexchar.charCodeAt(0)>="0".charCodeAt(0))&&(hexchar.charCodeAt(0)<="9".charCodeAt(0)))
		return true;
	else if ((hexchar.charCodeAt(0)>="core.A".charCodeAt(0))&&(hexchar.charCodeAt(0)<="F".charCodeAt(0)))
		return true;
	else return false;
}

function IsNumChar(hexchar)
{
	if ((hexchar.charCodeAt(0)>="0".charCodeAt(0))&&(hexchar.charCodeAt(0)<="9".charCodeAt(0)))
		return true;
	else return false;
}

function IsAlphaChar(hexchar)
{
	if ((hexchar.charCodeAt(0)>="core.A".charCodeAt(0))&&(hexchar.charCodeAt(0)<="Z".charCodeAt(0)))
		return true;
	else if ((hexchar.charCodeAt(0)>="a".charCodeAt(0))&&(hexchar.charCodeAt(0)<="z".charCodeAt(0)))
		return true;
	else if (hexchar[0]=='_') return true;
	else return false;
}
*/

//********************************************
//*PERIPHERAL HANDLING FUNCTIONS FOR EMULATOR*
//********************************************
/*
function peripheral(data)
{
	if ((core.calcAddress&0xFFFF)>=PERIPHERALS_BEGIN)
	{
		switch (core.calcAddress&0xFFFF)
		{
			case RAM_BANK1:
				RamBank1=BANK_SIZE*data;
				break;
			case RAM_BANK2:
				RamBank2=BANK_SIZE*data;
				break;
			case RAM_BANK3:
				RamBank3=BANK_SIZE*data;
				break;
			case ROM_BANK:
				RomBank=BANK_SIZE*data;
				break;
			case DEBUG:
				debugBuffer.push(data);
				break;
			case DEBUG_HEX:
				let hexout=data.toString(16).toUpperCase();
				if (hexout.length==1)
				{
					debugBuffer.push("0".charCodeAt(0));
					debugBuffer.push(hexout.charCodeAt(0));
				}
				else
				{
					debugBuffer.push(hexout.charCodeAt(0));
					debugBuffer.push(hexout.charCodeAt(1));
				}
				break;
			case DEBUG_DEC:
				let decout=data.toString();
				for (i=0;i<decout.length;i++) debugBuffer.push(decout.charCodeAt(i));
				break;
			case DEBUG_DEC16:
				let decout16=(core.A+(core.X<<8)).toLocaleString();
				for (i=0;i<decout16.length;i++) debugBuffer.push(decout16.charCodeAt(i));
				break;
			case DEBUG_TIMING:
				switch (data)
				{
					case TIMING_INSTR_BEGIN:
						timingCycles=core.cycle_count;
						break;
					case TIMING_INSTR_END:
						let timing_msg=(core.cycle_count-timingCycles).toLocaleString();
						if (timingEcho)
							for (i=0;i<timing_msg.length;i++)
								debugBuffer.push(timing_msg.charCodeAt(i));
						break;
					case TIMING_INSTR_RESET:
						break;
					case TIMING_TIME_BEGIN:
						break;
					case TIMING_TIME_END:
						break;
					case TIMING_TIME_RESET:
						break;
					case TIMING_ECHO_ON:
						timingEcho=true;
						break;
					case TIMING_ECHO_OFF:
						timingEcho=false;
						break;
				}
				break;
			case LOG_ON:
				cycleLog+="\nLOGGING ON\n";
				cycleLogActivated=true;
				break;
			case LOG_OFF:
				cycleLog+="LOGGING OFF\n\n";
				cycleLogActivated=false;
				break;
			case LOG_SEND:
				self.postMessage({cmd:"cycle log",log:cycleLog});
				break;
			case BELL_SOUND:
				self.postMessage({cmd:"bell"});
				break;
		}
	}
}

function peripheral_read(data)
{
	if ((core.calcAddress&0xFFFF)>=PERIPHERALS_BEGIN)
	{
		switch (core.calcAddress&0xFFFF)
		{
			case KB_INPUT:
				if (keyBuffer.length==0) return 0;
				else
				{
					//Barry was having trouble with key being undefined
					//console.log("Worker key read: ");
					//console.log("   buffer length: ",keyBuffer.length);
					const key=keyBuffer.shift();
					//console.log("   key: ",key);
					return key;
				}
				break;
			case TIMER_MS4:
				return parseInt((Date.now()%1000)/4);
				break;
			case TIMER_S:
				return parseInt((Date.now()/1000)%256);
				break;
			case FILE_INPUT:
				if (inputBuffer.length==0) return 0;
				else
				{
					const new_byte=inputBuffer.shift();
					return new_byte;
				}
			default:
				return data;
				break;
		}
	}
	else return data;
}
*/


