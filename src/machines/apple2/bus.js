import KeyMap from "../../keymap.js";

/*
http://www.lazilong.com/apple_II/bbros/ascii.jpg
 */
/*
APPLE IIe Auxiliary Memory Softswitches

-- MEMORY MANAGEMENT SOFT SWITCHES
$C000 W 80STOREOFF Allow page2 to switch video page1 page2
$C001 W 80STOREON Allow page2 to switch main & aux video memory
$C002 W RAMRDOFF Read enable main memory from $0200-$BFFF
$C003 W RAMDRON Read enable aux memory from $0200-$BFFF
$C004 W RAMWRTOFF Write enable main memory from $0200-$BFFF
$C005 W RAMWRTON Write enable aux memory from $0200-$BFFF
$C006 W INTCXROMOFF Enable slot ROM from $C100-$CFFF
$C007 W INTCXROMON Enable main ROM from $C100-$CFFF

$C008 W ALZTPOFF Enable main memory from $0000-$01FF & avl BSR
$C009 W ALTZPON Enable aux memory from $0000-$01FF & avl BSR

$C00A W SLOTC3ROMOFF Enable main ROM from $C300-$C3FF
$C00B W SLOTC3ROMON Enable slot ROM from $C300-$C3FF

-- VIDEO SOFT SWITCHES
$C00C W 80COLOFF Turn off 80 column display
$C00D W 80COLON Turn on 80 column display
$C00E W ALTCHARSETOFF Turn off alternate characters
$C00F W ALTCHARSETON Turn on alternate characters
$C050 R/W TEXTOFF Select graphics mode
$C051 R/W TEXTON Select text mode
$C052 R/W MIXEDOFF Use full screen for graphics
$C053 R/W MIXEDON Use graphics with 4 lines of text
$C054 R/W PAGE2OFF Select panel display (or main video memory)
$C055 R/W PAGE2ON Select page2 display (or aux video memory)
$C056 R/W HIRESOFF Select low resolution graphics
$C057 R/W HIRESON Select high resolution graphics

$C022 R/W TBCOLOR IIgs Screen Color: (0-3) Low Nibble is BG, (4-7) High Nibble is Text

-- SOFT SWITCH STATUS FLAGS
$C010 R7 AKD 1=key pressed 0=keys free (clears strobe)
$C011 R7 BSRBANK2 1=bank2 available 0=bank1 available
$C012 R7 BSRREADRAM 1=BSR active for read 0=$D000-$FFFF active

$C013 R7 RAMRD 0=main $0200-$BFFF active reads 1=aux active
$C014 R7 RAMWRT 0=main $0200-$BFFF active writes 1=aux writes

$C015 R7 INTCXROM 1=main $C100-$CFFF ROM active 0=slot active
$C016 R7 ALTZP 1=aux $0000-$1FF+auxBSR 0=main available
$C017 R7 SLOTC3ROM 1=slot $C3 ROM active 0=main $C3 ROM active
$C018 R7 80STORE 1=page2 switches main/aux 0=page2 video
$C019 R7 VERTBLANK 1=vertical retrace on 0=vertical retrace off
$C01A R7 TEXT 1=text mode is active 0=graphics mode active
$C01B R7 MIXED 1=mixed graphics & text 0=full screen
$C01C R7 PAGE2 1=video page2 selected or aux
$C01D R7 HIRES 1=high resolution graphics 0=low resolution
$C01E R7 ALTCHARSET 1=alt character set on 0=alt char set off
$C01F R7 80COL 1=80 col display on 0=80 col display off

$C073 W BANKSEL RAMworks-style Aux RAM Card bank select

"Language Card" area Switches
Bank 1 and Bank 2 here are the 4K banks at $D000-$DFFF. The
remaining area from $E000-$FFFF is the same for both
sets of switches.

$C080 ;LC RAM bank2, Read and WR-protect RAM

$C081 ROMIN;LC RAM bank2, Read ROM instead of RAM,
;two or more successive reads WR-enables RAM

$C082 ;LC RAM bank2, Read ROM instead of RAM,
;WR-protect RAM

$C083 LCBANK2 ;LC RAM bank2, Read RAM
;two or more successive reads WR-enables RAM

$C088 ;LC RAM bank1, Read and WR-protect RAM
$C089 ;LC RAM bank1, Read ROM instead of RAM,
;two or more successive reads WR-enables RAM

$C08A ;LC RAM bank1, Read ROM instead of RAM,
;WR-protect RAM

$C08B LCBANK1 ;LC RAM bank1, Read RAM
;two or more successive reads WR-enables RAM

$C084-$C087 are echoes of $C080-$C083
$C08C-$C08F are echoes of $C088-$C08B

$C080 R  LCRAMIN2 Read RAM bank 2; no write
$C081 RR ROMIN2 Read ROM; write RAM bank 2
$C082 R  LCROMIN2 Read ROM; no write
$C083 RR LCBANK2 Read/write RAM bank 2

*/
const SWITCHES = {
	// W 80STOREOFF Allow page2 to switch video page1 page2
	"80STOREOFF": 0xC000,
	// W 80STOREON Allow page2 to switch main & aux video memory
	"80STOREON": 0xC001,
	// R7 80STORE 1=page2 switches main/aux 0=page2 video
	"80STORE": 0xC018,

	// W ALTCHARSETOFF Turn off alternate characters
	ALTCHARSETOFF: 0xC00E,
	// W ALTCHARSETON Turn on alternate characters
	ALTCHARSETON: 0xC00F,
	// R7 ALTCHARSET 1=alt character set on 0=alt char set off
	ALTCHARSET: 0xC01E,

	// R7 TEXT 1=text mode is active 0=graphics mode active
	TEXT: 0xC01A,
	// R7 MIXED 1=mixed graphics & text 0=full screen
	MIXED: 0xC01B,
	// R7 HIRES 1=high resolution graphics 0=low resolution
	HIRES: 0xC01D,

	// W RAMRDOFF Read enable main memory from $0200-$BFFF
	RAMRDOFF: 0xC002,
	// W RAMDRON Read enable aux memory from $0200-$BFFF
	RAMDRON: 0xC003,
	// W RAMWRTOFF Write enable main memory from $0200-$BFFF
	RAMWRTOFF: 0xC004,
	// W RAMWRTON Write enable aux memory from $0200-$BFFF
	RAMWRTON: 0xC005,

	// W 80COLOFF Turn off 80 column display
	"80COLOFF": 0xC00C,
	// W 80COLON Turn on 80 column display
	"80COLON": 0xC00D,
	// R7 80COL 1=80 col display on0=80 col display off
	"80COL": 0xC01F,

	// R/W Select graphics mode
	TEXTOFF: 0xC050,
	// R/W Select text mode
	TEXTON: 0xC051,
	// R/W Use full screen for graphics
	MIXEDOFF: 0xC052,
	// R/W Use graphics with 4 lines of text
	MIXEDON: 0xC053,
	// R/W Select low resolution graphics
	HIRESOFF: 0xC056,
	// R/W Select high resolution graphics
	HIRESON: 0xC057,

	// R/W PAGE2OFF Select panel display (or main video memory)
	PAGE2OFF: 0xC054,
	// R/W PAGE2ON Select page2 display (or aux video memory)
	PAGE2ON: 0xC055,
	// R7 PAGE2 1=video page2 selected or aux
	PAGE2: 0xC01C,

	// R/W TBCOLOR IIgs Screen Color: (0-3) Low Nibble is BG, (4-7) High Nibble is Text
	TBCOLOR: 0xC022,

	// W INTCXROMOFF Enable slot ROM from $C100-$C7FF (but $C800-$CFFF depends on INTC8ROM)
	INTCXROMOFF: 0xC006,
	// W INTCXROMON Enable main ROM from $C100-$CFFF
	INTCXROMON: 0xC007,
	// R7 INTCXROM 1=main $C100-$CFFF ROM active 0=slot active
	INTCXROM: 0xC015,

	// R7 SLOTC3ROM 1=slot $C3 ROM active 0=main $C3 ROM active
	SLOTC3ROM: 0xC017,
	// W SLOTC3ROMOFF Enable main ROM from $C300-$C3FF
	SLOTC3ROMOFF: 0xC00A,
	// W SLOTC3ROMON Enable slot ROM from $C300-$C3FF
	SLOTC3ROMON: 0xC00B,


	// W Enable main memory from $0000-$01FF & $D000-$FFFF
	ALZTPOFF: 0xC008,
	// W Enable aux memory from $0000-$01FF & $D000-$FFFF
	ALTZPON: 0xC009,
	// R7 ALTZP 1=aux $0000-$1FF+auxBSR 0=main available
	ALTZP: 0xC016,

	// R7 RDLCBNK2 1=bank2 available 0=bank1 available
	RDLCBNK2: 0xC011,
	// R7 BSRREADRAM 1=LC active for read 0=ROM active
	RDLCRAM: 0xC012,

	// LC BANK2

	// R  LCRAMIN2 Read RAM bank 2; no write
	LCRAMIN2: 0xC080,
	// RR ROMIN2 Read ROM; write RAM bank 2
	ROMIN2: 0xC081,
	// R  LCROMIN2 Read ROM; no write
	LCROMIN2: 0xC082,
	// RR LCBANK2 Read/write RAM bank 2
	LCBANK2: 0xC083,
	// echoes of C080-C083
	LC_C084: 0xC084,
	LC_C085: 0xC085,
	LC_C086: 0xC086,
	LC_C087: 0xC087,

	// LC BANK1

	// R LC RAM bank1, Read and WR-protect RAM
	LCRAMIN1: 0xC088,
	// RR LC RAM bank1, Read ROM instead of RAM,
	// ;two or more successive reads WR-enables RAM
	ROMIN1: 0xC089,
	// R LC RAM bank1, Read ROM instead of RAM,
	// ;WR-protect RAM
	LCROMIN1: 0xC08A,
	// RR LCBANK1 ;LC RAM bank1, Read RAM
	// two or more successive reads WR-enables RAM
	LCBANK1: 0xC08B,
	// echoes of C088-C08B
	LC_C08C: 0xC08C,
	LC_C08D: 0xC08D,
	LC_C08E: 0xC08E,
	LC_C08F: 0xC08F,

	BANKSEL: 0xC073,

	PADDL0: 0xC064,
	PADDL1: 0xC065,
	PADDL2: 0xC066,
	PADDL3: 0xC067,
	PTRIG: 0xC070,

	SLOT7F1: 0xC0F1,

	SLOT7FF: 0xC0FF,

	// Slot 3 I/O
	SLOT3_00: 0xC0B0,
	SLOT3_01: 0xC0B1,
	SLOT3_02: 0xC0B2,
	SLOT3_03: 0xC0B3,
	SLOT3_04: 0xC0B4,
	SLOT3_05: 0xC0B5,
	SLOT3_06: 0xC0B6,
	SLOT3_07: 0xC0B7,
	SLOT3_08: 0xC0B8,
	SLOT3_09: 0xC0B9,
	SLOT3_0A: 0xC0BA,
	SLOT3_0B: 0xC0BB,
	SLOT3_0C: 0xC0BC,
	SLOT3_0D: 0xC0BD,
	SLOT3_0E: 0xC0BE,
	SLOT3_0F: 0xC0BF

};

export default class Bus {
	constructor(controller, memory) {
		this.controller= controller;
		// this.ram= new Uint8Array(memory);
		this.memory= {
			main: new Uint8Array(memory),
			lgcard: new Uint8Array(0xFFFF-0xD000)
		};

		this.keys= new KeyMap();
		this.bankSize= 64 * 1024;

		this.reset();
	}

	reset() {
		this.keyWasRead= false;
		this.lastKeypressed= null;
		this.readBank= 0;
		this.writeBank= 0;
		this.bankSelected= 1;
		this.videoPage= 0;
		this.col80On= false;
		this.store80On= false;
		this.altCharsetOn= false;

		this.cxMainRomOn= false;
		this.c8MainRomOn= false;
		// off: internal rom | on: rom from the card
		this.c3SlotRomOn= false;

		this.altZPOn= false;
		this.graphicOn= false;
		this.HiResOn= false;
		this.MixedOn= false;
		this.lastBankUsed= 0;
		this.tbColor= 0xF0;

		this.lcBank= 0;
		this.lcSelected= false;
		this.lcWriteEnabled= false;
		this.lcBank2wrCount= 0;

		this.paddles= [0,0,0,0];

		this.isDiskOpDone= false;
	}

	_read(bank, addr, type="main") {
		this.lastBankUsed= bank;
		return this.memory[type][(bank*this.bankSize) + (addr & 0xFFFF)];
	}

	_write(bank, addr, value, type="main") {
		this.memory[type][(bank*this.bankSize) + (addr & 0xFFFF)]= value & 0xFF;
	}

	read(addr, isDebugActive) {

		if(isDebugActive)
			return this._read( addr >> 16, addr & 0xFFFF);

		addr= addr & 0xFFFF;

		// $0000-$01FF
		if(addr<0x0200) {
			return this._read(this.altZPOn ? this.bankSelected : 0, addr);
		}

		// banked memory
		// $0200-$BFFF
		if(addr<0xC000) {

			if(addr>=0x0400 && addr<0x0800) {
				const bank= this.store80On ? this.videoPage : this.readBank;
				return this._read(bank, addr);
			}

			return this._read(this.readBank, addr);
		}

		// Language Card
		// $D000-$FFFF
		if(addr>0xCFFF) {
			if(!this.lcSelected)
				// should be driven by this.altZPOn
				return this._read(0, addr-0xD000, "lgcard");

			return this._read(this.lcBank, addr);
		}

		// $C100-$cFFF
		if(addr>0xC0FF) {
			if(!this.cxMainRomOn) {
				if(addr===0xCFFF) {
					// console.log(addr.toString(16), "c8MainRomOn= false");
					this.c8MainRomOn= false;
					return this._read(1, addr);
				}
			}

			if(addr>0xC7FF) {
				return this._read(this.cxMainRomOn || this.c8MainRomOn ? 1 : 0, addr);
			}

			// if(addr>=0xc300)
			// 	console.log(addr.toString(16));

			if(addr >= 0xC300 && addr <= 0xC3FF) {
				// console.log(addr.toString(16), "c8MainRomOn= true");
				this.c8MainRomOn= true;
			}

			return this._read(this.cxMainRomOn ? 1 : 0, addr);
		}

		// if(isDebugActive)
		// 	return 0;

		// this.c8MainRomOn= false;

		let value= 0;
		switch(addr) {
			case 0xC000:
				return this.readKeyboard();
			case 0xC010:
				this.keyWasRead= false;
				return;

			case 0xC030:
				this.controller.postMessage({cmd:"sound", data:{mode: "tick", cycles: this.controller.core.cycle_count}});
				return;

			case SWITCHES.INTCXROM:
				value= this.cxMainRomOn ? 0x80 : 0;
				break;
			case SWITCHES.SLOTC3ROM:
				value= this.c3SlotRomOn;
				break;

			case SWITCHES.ALTZP:
				value= this.altZPOn ? 0x80 : 0;
				break;

			case SWITCHES.PAGE2ON:
				this.videoPage= 1;
				break;
			case SWITCHES.PAGE2OFF:
				this.videoPage= 0;
				break;
			case SWITCHES.PAGE2:
				value= this.videoPage ? 0x80 : 0;
				break;

			case SWITCHES["80COL"]:
				value= this.col80On ? 0x80 : 0;
				break;
			case SWITCHES["80STORE"]:
				value= this.store80On ? 0x80 : 0;
				break;

			case SWITCHES.ALTCHARSET:
				value= this.altCharsetOn ? 0x80 : 0;
				break;

			//
			// GRAPHIC MODES
			//

			case SWITCHES.TEXT:
				value= this.graphicOn ? 0 : 0x80;
				break;
			case SWITCHES.MIXED:
				value= this.MixedOn ? 0x80 : 0;
				break;
			case SWITCHES.HIRES:
				value= this.HiResOn ? 0x80 : 0;
				break;

			case SWITCHES.TEXTOFF:
				value= (this.graphicOn=0x80);
				this.controller.postMessage({cmd:"video", data:{mode: "gr"}});
				break;

			case SWITCHES.TEXTON:
				value= (this.graphicOn=0);
				this.controller.postMessage({cmd:"video", data:{mode: "text"}});
				break;

			case SWITCHES.MIXEDOFF:
				value= (this.MixedOn=0);
				this.controller.postMessage({cmd:"video", data:{mode: "full"}});
				break;

			case SWITCHES.MIXEDON:
				value= (this.MixedOn=0x80);
				this.controller.postMessage({cmd:"video", data:{mode: "mixed"}});
				break;

			case SWITCHES.HIRESOFF:
				value= (this.HiResOn=0);
				this.controller.postMessage({cmd:"video", data:{mode: "low"}});
				break;

			case SWITCHES.HIRESON:
				value= (this.HiResOn=0x80);
				this.controller.postMessage({cmd:"video", data:{mode: "high"}});
				break;

			case SWITCHES.TBCOLOR:
				value= this.tbColor;
				break;

			//
			// LANGUAGE CARD
			//

			// STATUSES
			case SWITCHES.RDLCBNK2:
				value= this.lcBank ? 0x80 : 0;
				break;

			case SWITCHES.RDLCRAM:
				value= this.lcSelected ? 0x80 : 0;
				break;

			// BANK 1
			case SWITCHES.LCRAMIN1:
			case SWITCHES.LC_C08C:
				// select LCBank1
				// read ram no write
				this.lcWriteEnabled= false;
				this.lcBank= 0;
				this.lcSelected= true;
				value= 1;
				break;

			case SWITCHES.ROMIN1:
			case SWITCHES.LC_C08D:
				// select LCBank1
				// read ROM write ram
				this.lcWriteEnabled= !this.lcSelected && this.lcBank === 0;
				this.lcBank= 0;
				this.lcSelected= false;
				value= 1;
				break;

			case SWITCHES.LCROMIN1:
			case SWITCHES.LC_C08E:
				// select LCBank1
				// read ROM no write
				this.lcBank= 0;
				this.lcSelected= false;
				this.lcWriteEnabled= false;
				value= 1;
				break;

			case SWITCHES.LCBANK1:
			case SWITCHES.LC_C08F:
				// select LCBank1
				// read ram write ram
				this.lcWriteEnabled= this.lcSelected && this.lcBank === 0;
				this.lcBank= 0;
				this.lcSelected= true;
				value= 1;
				break;

			//
			// BANK 2
			//
			case SWITCHES.LCRAMIN2:
			case SWITCHES.LC_C084:
				// select LCBank2
				// read ram no write
				this.lcWriteEnabled= false;
				this.lcBank= 1;
				this.lcSelected= true;
				this.lcBank2wrCount= 0;
				value= 1;
				break;

			case SWITCHES.ROMIN2:
			case SWITCHES.LC_C085:
				// select LCBank2
				// read ROM write ram
				this.lcBank= 1;
				this.lcSelected= false;
				this.lcBank2wrCount++;
				this.lcWriteEnabled= this.lcBank2wrCount > 1;
				value= 1;
				break;

			case SWITCHES.LCROMIN2:
			case SWITCHES.LC_C086:
				// select LCBank2
				// read ROM no write
				this.lcBank= 1;
				this.lcSelected= false;
				this.lcWriteEnabled= false;
				this.lcBank2wrCount= 0;
				value= 1;
				break;

			case SWITCHES.LCBANK2:
			case SWITCHES.LC_C087:
				// select LCBank2
				// read ram write ram
				this.lcBank= 1;
				this.lcSelected= true;
				this.lcBank2wrCount++;
				this.lcWriteEnabled= this.lcBank2wrCount > 1;
				value= 1;
				break;

			//
			// SLOT 7
			//

			case SWITCHES.SLOT7F1:
				// check $C74C routine
				value= 1;
				break;

			case SWITCHES.SLOT7FF:
				value= this.isDiskOpDone ? 0x80 : 0;
				this.isDiskOpDone= false;
				break;

			//
			// JOYSTICK
			//

			case SWITCHES.PADDL0:
				this.paddles[0]++;
				value= this.paddles[0] >= 0x7F ? 0x00 : 0x80;
				break;
			case SWITCHES.PADDL1:
				this.paddles[1]++;
				value= this.paddles[1] >= 0x7F ? 0x00 : 0x80;
				break;
			case SWITCHES.PADDL2:
				this.paddles[2]++;
				value= this.paddles[2] >= 0x7F ? 0x00 : 0x80;
				break;
			case SWITCHES.PADDL3:
				this.paddles[3]++;
				value= this.paddles[3] >= 0x7F ? 0x00 : 0x80;
				break;
			case SWITCHES.PTRIG:
				this.paddles= [0,0,0,0];
				value= 0;
				break;


		}
		// console.log(
		// 	"READ",
		// 	addr.toString(16),
		// 	value.toString(16),
		// );
		return value;
	}

	write(addr, value) {

		if(addr > 0xFFFF)
			return this._write(addr >> 16, addr & 0xFFFF, value);

		addr&= 0xFFFF;

		if(addr >= 0xD000) {
			if(this.lcSelected && this.lcWriteEnabled)
				this._write(this.lcBank, addr, value);
			return;
		}

		if(addr >= 0xC100)
			return;

		if(addr<0xC000) {

			if(addr < 0x200) {
				this._write(this.altZPOn ? this.bankSelected : 0, addr, value);
				return;
			}

			if(addr < 0x0800 && addr >= 0x0400) {
				const bank= this.store80On ? this.videoPage : this.writeBank;
				this._write(bank, addr, value);
				this.controller.postMessage({cmd:"video", data:{mode: "mem", bank, addr}});
				return;
			}

			this._write(this.writeBank, addr, value);

			// if(addr < 0x4000 && addr >= 0x2000) {
			// 	let partToUpdate;
			// 	if(addr < 0x2800)
			// 		partToUpdate= 0;
			// 	else if(addr < 0x3000)
			// 		partToUpdate= 1;
			// 	else if(addr < 0x3800)
			// 		partToUpdate= 2;
			// 	else if(addr < 0x4000)
			// 		partToUpdate= 3;

			// 	this.controller.postMessage({cmd:"video", data:{update: partToUpdate}});
			// }

			return;
		}

		// console.log("WRITE", addr.toString(16), value ? value.toString(16) : value);

		switch(addr) {
			case SWITCHES.RAMRDOFF:
				this.readBank= 0;
				break;
			case SWITCHES.RAMDRON:
				this.readBank= this.bankSelected;
				break;
			case SWITCHES.RAMWRTOFF:
				this.writeBank= 0;
				break;
			case SWITCHES.RAMWRTON:
				this.writeBank= this.bankSelected;
				break;

			case SWITCHES.PAGE2ON:
				this.videoPage= 1;
				break;
			case SWITCHES.PAGE2OFF:
				this.videoPage= 0;
				break;

			case SWITCHES["80STOREOFF"]:
				this.store80On= false;
				break;
			case SWITCHES["80STOREON"]:
				this.store80On= true;
				break;

			case SWITCHES["80COLOFF"]:
				this.col80On= false;
				this.controller.postMessage({cmd:"video", data:{mode: "col40"}});
				break;
			case SWITCHES["80COLON"]:
				this.col80On= true;
				this.controller.postMessage({cmd:"video", data:{mode: "col80"}});
				break;

			case SWITCHES.TBCOLOR:
				this.tbColor= value;
				this.controller.postMessage({cmd:"video", data:{mode: "tbcolor", value}});
				break;

			case SWITCHES.SLOT3_00:
			case SWITCHES.SLOT3_01:
			case SWITCHES.SLOT3_02:
			case SWITCHES.SLOT3_03:
			case SWITCHES.SLOT3_04:
			case SWITCHES.SLOT3_05:
			case SWITCHES.SLOT3_06:
			case SWITCHES.SLOT3_07:
			case SWITCHES.SLOT3_08:
			case SWITCHES.SLOT3_09:
			case SWITCHES.SLOT3_0A:
			case SWITCHES.SLOT3_0B:
			case SWITCHES.SLOT3_0C:
			case SWITCHES.SLOT3_0D:
			case SWITCHES.SLOT3_0E:
				this.controller.postMessage({cmd:"video", data:{mode: "ctrl", addr, value}});
				break;

			case SWITCHES.SLOT3_0F: {
				this.controller.halt();
				const {port1, port2}= new MessageChannel();
				port1.onmessage= () => this.controller.unhalt();
				this.controller.postMessage({cmd:"video", data:{mode: "ctrl", addr, value}}, [port2]);
				break;
			}

			// ROMs
			case SWITCHES.INTCXROMOFF:
				this.cxMainRomOn= false;
				break;
			case SWITCHES.INTCXROMON:
				this.cxMainRomOn= true;
				break;
			case SWITCHES.SLOTC3ROMOFF:
				this.c3SlotRomOn= false;
				break;
			case SWITCHES.SLOTC3ROMON:
				this.c3SlotRomOn= true;
				break;

			case SWITCHES.ALZTPOFF:
				this.altZPOn= false;
				break;
			case SWITCHES.ALTZPON:
				this.altZPOn= true;
				break;

			case SWITCHES.ALTCHARSETOFF:
				this.altCharsetOn= false;
				this.controller.postMessage({cmd:"video", data:{mode: "altCharset", value: this.altCharsetOn}});
				break;
			case SWITCHES.ALTCHARSETON:
				this.altCharsetOn= true;
				this.controller.postMessage({cmd:"video", data:{mode: "altCharset", value: this.altCharsetOn}});
			break;

			case SWITCHES.BANKSEL:
				this.bankSelected= value+1;
				break;

			case SWITCHES.SLOT7FF:
				console.log("WRITE SLOT7FF", true);
				this.isDiskOpDone= true;
				break;
		}
	}

	writeHexa(bank, addr, hexString, type) {
		const values= hexString.match(/[0-9a-fA-F]+/g);
		// console.log("writeHexa", type ?? "main", bank.toString(16).padStart(2,"0"), addr.toString(16).padStart(4,"0"), values.join(" "));
		for(let idx= 0; idx<values.length; idx++)
			this._write(bank, addr++, parseInt(values[idx],16), type);
		return addr;
	}

	writeBin(bank, addr, values) {
		for(let idx= 0; idx<values.length; idx++)
			// this._write(bank, addr++, values[idx]);
			this.write(addr++, values[idx]);
		return addr;
	}

	writeString(bank, addr, str) {
		[...str].forEach(c => this._write(bank, addr++, c.charCodeAt(0)));
		return addr;
	}

	search(from, to, hexString) {
		let start= from;
		let end= to;

		if(typeof start === "string")
			start= parseInt(start, 16);
		if(typeof end === "string")
			end= parseInt(end, 16);

		if(end<start) {
			const tmp= start;
			start= end;
			end= tmp;
		}

		const check= (addr) => {
			const byte= this.memory.main[addr];
			if(byte !== values[0])
				return false;

			let endRange= addr + values.length-1;
			if(endRange>end)
				return false;

			let valIdx= values.length-1;
			while(valIdx && (values[valIdx] === this.memory.main[endRange])) {
				valIdx--;
				endRange--;
			}

			return valIdx ? false : true;

		};

		const values= hexString.match(/[0-9a-fA-F]+/g).map((val) => parseInt(val,16));

		console.log("SEARCH", start.toString(16), end.toString(16), values);

		let addr= from;
		let count= 16_711_680;
		while(count && addr <= end) {
			if(check(addr)) {
				console.log("found at",addr.toString(16));
				return;
			}
			addr++;
			count--;
		}
		console.log("not found", count);

	}

	readKeyboard() {
		if(this.keyWasRead)
			return this.lastKeypressed | 0x80;

		const keyPressed= [...this.keys.map.entries()].find(k=>k[1]===true);
		if(!keyPressed)
			return 0;

		// console.log(keyPressed);

		this.keys.get(keyPressed[0]);
		switch(keyPressed[0]) {
			case "Alt":
			case "AltGraph":
			case "CapsLock":
			case "Meta":
			case "Shift":
			case "Control":
				return this.lastKeypressed;

			case "ArrowDown":
				this.lastKeypressed= 0x8A;
				break;
			case "ArrowUp":
				this.lastKeypressed= 0x8B;
				break;
			case "ArrowLeft":
				this.lastKeypressed= 0x88;
				break;
			case "ArrowRight":
				this.lastKeypressed= 0x95;
				break;
			case "Tab":
				this.lastKeypressed= 0x88;
				break;
			case "Escape":
				this.lastKeypressed= 0x9B;
				break;
			case "Enter":
				this.lastKeypressed= 0x8D;
				break;
			case "Backspace":
				this.lastKeypressed= 0x88;
				break;
			default:
				this.lastKeypressed= keyPressed[0].charCodeAt(0);
				break;
		}

		// console.log(this.lastKeypressed.toString(16));

		this.keyWasRead= true;
		return this.lastKeypressed | 0x80;
	}
}
