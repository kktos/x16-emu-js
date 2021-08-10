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
$C01F R7 80COL 1=80 col display on0=80 col display off
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

};

export default class Bus {
	constructor(controller, buffer) {
		this.controller= controller;
		this.ram= new Uint8Array(buffer);
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
				const value= this._read(bank, addr);
				// console.log("READVID", bank.toString(16), addr.toString(16), value.toString(16));

				return value;
			}

			return this._read(this.readBank, addr);
		}
		// $C100-$FFFF
		if(addr>0xC0FF) {
			return this._read(0, addr);
		}

		let value= 0;
		switch(addr) {
			case 0xC000:
				return this.readKeyboard();
			case 0xC010:
				this.keyWasRead= false;
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

		}
		console.log(
			"READ",
			addr.toString(16),
			value.toString(16),
			"-- col80On",this.col80On,
			"-- store80On", this.store80On,
			"-- videoPage", this.videoPage
		);
		return value;
	}

	write(addr, value) {
		addr= addr & 0xFFFF;

		if(addr<0xC000) {
			if(addr>=0x0400 && addr<0x0800) {
				const bank= this.store80On ? this.videoPage : this.writeBank;

				// console.log("WRITEVID", bank.toString(16), addr.toString(16), value ? value.toString(16) : value);

				this._write(bank, addr, value);
				return;
			}
			this._write(this.writeBank, addr, value);
			return;
		}

		console.log("WRITE", addr.toString(16), value ? value.toString(16) : value);

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
		console.log("-- col80On",this.col80On, "-- store80On", this.store80On, "-- videoPage", this.videoPage);
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

		console.log(keyPressed);

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
