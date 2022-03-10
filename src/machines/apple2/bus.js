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

	// W INTCXROMOFF Enable slot ROM from $C100-$CFFF
	INTCXROMOFF: 0xC006,
	// W INTCXROMON Enable main ROM from $C100-$CFFF
	INTCXROMON: 0xC007,
	// R7 INTCXROM 1=main $C100-$CFFF ROM active 0=slot active
	INTCXROM: 0xC015,
	// R7 SLOTC3ROM 1=slot $C3 ROM active 0=main $C3 ROM active
	SLOTC3ROM: 0xC017,

	SLOT7F1: 0xC0F1,

};

export default class Bus {
	constructor(controller, memory) {
		this.controller= controller;
		this.ram= new Uint8Array(memory);
		this.keyWasRead= false;
		this.lastKeypressed= null;
		this.keys= new KeyMap();
		this.readBank= 0;
		this.writeBank= 0;
		this.bankSize= 64 * 1024;
		this.videoPage= 0;
		this.col80On= false;
		this.store80On= false;
		this.altCharsetOn= false;
		this.cxMainRomOn= false;
		this.graphicOn= false;
		this.HiResOn= false;
		this.MixedOn= false;
	}

	_read(bank, addr) {
		return this.ram[(bank*this.bankSize) + (addr & 0xFFFF)];
	}

	_write(bank, addr, value) {
		this.ram[(bank*this.bankSize) + (addr & 0xFFFF)]= value & 0xFF;
	}

	read(addr) {
		addr= addr & 0xFFFF;

		// $0000-$01FF
		if(addr<0x0200) {
			return this._read(0, addr);
		}
		// $0200-$BFFF
		if(addr<0xC000) {

			if(addr>=0x0400 && addr<0x0800) {
				const bank= this.store80On ? this.videoPage : this.readBank;
				return this._read(bank, addr);
			}

			return this._read(this.readBank, addr);
		}
		// $D000-$FFFF
		if(addr>0xCFFF) {
			return this._read(0, addr);
		}

		// $C100-$cFFF
		if(addr>0xC0FF) {
			return this._read(this.cxMainRomOn ? 1 : 0, addr);
		}

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

			case SWITCHES.PAGE2ON:
				this.videoPage= 1;
				break;
			case SWITCHES.PAGE2OFF:
				this.videoPage= 0;
				break;
			case SWITCHES.PAGE2:
				value= this.videoPage ? 0x80 : 0;
				break;

			case SWITCHES.SLOTC3ROM:
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

			case SWITCHES.SLOT7F1:
				// check $C74C routine
				value= 1;
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
		addr&= 0xFFFF;

		if(addr >= 0xC100)
			return;

		if(addr<0xC000) {

			if(addr < 0x0800 && addr >= 0x0400) {
				const bank= this.store80On ? this.videoPage : this.writeBank;
				this._write(bank, addr, value);
				return;
			}

			this._write(this.writeBank, addr, value);

			if(addr < 0x4000 && addr >= 0x2000) {
				let partToUpdate;
				if(addr < 0x2800)
					partToUpdate= 0;
				else if(addr < 0x3000)
					partToUpdate= 1;
				else if(addr < 0x3800)
					partToUpdate= 2;
				else if(addr < 0x4000)
					partToUpdate= 3;

				this.controller.postMessage({cmd:"video", data:{update: partToUpdate}});
			}

			return;
		}

		// console.log("WRITE", addr.toString(16), value ? value.toString(16) : value);

		switch(addr) {
			case SWITCHES.RAMRDOFF:
				this.readBank= 0;
				break;
			case SWITCHES.RAMDRON:
				this.readBank= 1;
				break;
			case SWITCHES.RAMWRTOFF:
				this.writeBank= 0;
				break;
			case SWITCHES.RAMWRTON:
				this.writeBank= 1;
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

			case SWITCHES.INTCXROMOFF:
				this.cxMainRomOn= false;
				break;
			case SWITCHES.INTCXROMON:
				this.cxMainRomOn= true;
				break;

			case SWITCHES.ALTCHARSETOFF:
				this.altCharsetOn= false;
				break;
			case SWITCHES.ALTCHARSETON:
				this.altCharsetOn= true;
				break;

		}
		// console.log("-- col80On",this.col80On, "-- store80On", this.store80On, "-- videoPage", this.videoPage);
	}

	writeHexa(bank, addr, hexString) {
		const values= hexString.match(/[0-9a-fA-F]+/g);
		for(let idx= 0; idx<values.length; idx++)
			this._write(bank, addr++, parseInt(values[idx],16));
		return addr;
	}

	writeString(bank, addr, str) {
		[...str].forEach(c => this._write(bank, addr++, c.charCodeAt(0)));
		return addr;
	}

	readKeyboard() {
		if(this.keyWasRead)
			return this.lastKeypressed | 0x80;

		const keyPressed= [...this.keys.map.entries()].find(k=>k[1]==true);
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

		this.keyWasRead= true;
		return this.lastKeypressed | 0x80;
	}
}
