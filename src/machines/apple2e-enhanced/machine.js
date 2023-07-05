import processHooks from "../apple2/hooks.js";
import { C1_C7_INTROM, C8_CF_INTROM, CxSLOTROM, LG_CARD_ROM } from "./applewin.rom";
import { basicprog } from "./basicprog.js";
import Disk from "./disk.js";
import HGR_IMG from "./hgr-img";
import Sound from "./sound.js";
import Video from "./video/render.js";

/**
 *
 How to identify the ROMs ?
 http://www.1000bit.it/support/manuali/apple/technotes/misc/tn.misc.07.html?fbclid=IwAR2EMa-vUmyhmLCsxRCFDLsCpMqiCvSNK1xXeSutU_RL2SQcOa-IxbH4C3o

Machine                    $FBB3    $FB1E    $FBC0    $FBDD    $FBBE    $FBBF
-----------------------------------------------------------------------------
Apple ][                    $38              [$60]                      [$2F]
Apple ][+                   $EA      $AD     [$EA]                      [$EA]
Apple /// (emulation)       $EA      $8A
Apple IIe                   $06               $EA                       [$C1]
Apple IIe (enhanced)        $06               $E0                       [$00]
Apple IIe Option Card       $06               $E0      $02      $00
Apple IIc                   $06               $00                        $FF
Apple IIc (3.5 ROM)         $06               $00                        $00
Apple IIc (Org. Mem. Exp.)  $06               $00                        $03
Apple IIc (Rev. Mem. Exp.)  $06               $00                        $04
Apple IIc Plus              $06               $00                        $05
Apple IIgs                  (see below)

Note: Values listed in square brackets in the table are provided for your reference only.
You do not need to check them to conclusively identify an Apple II.

*/

const machine= {

	name: "Apple //e",

	memory: {
		size: 64 * 1024 * 4,
		bank: 4,
		map: [
			{
				bank: 2,
				addr: 0x0000,
				data: `02 02 02 02 02 02 02`
			},
			{
				bank: 3,
				addr: 0x0000,
				data: `03 03 03 03 03 03 03`
			},
			{
				bank: 1,
				addr: 0xC100,
				data: C1_C7_INTROM
			},
			{
				bank: 1,
				addr: 0xC800,
				data: C8_CF_INTROM
			},
			{
				bank: 0,
				addr: 0xC100,
				data: CxSLOTROM
			},
			{
				bank: 0,
				addr: 0, //0xD000,
				data: LG_CARD_ROM,
				type: "lgcard"
			},
			{
				bank: 0,
				addr: 0xD000,
				data: "01 01 01 01",
			},
			{
				bank: 1,
				addr: 0xD000,
				data: "02 02 02 02",
			},
			{
				bank: 0,
				addr: 0x0300,
				data:
				`
				42 FF
				64 72 61 77 49 6D 67 20 69 64 3A 25	79 20 61 64 64 72 3A 25 77 20 77 69	64 74 68 3A 25 62 20 68 65 69 67 68	74 3A 25 62 00
				03
				1C 00 24 81 27 81
				`
			},

			{
				bank: 0,
				addr: 0x0800,
				data: basicprog
			},
			{
				bank: 0,
				addr: 0x02000,
				data: HGR_IMG
			}
		],
	},

	debuggerOnBRK: false,
	busSrcFile: "apple2/bus.js",
	hooks: processHooks,
	Video,
	Sound,
	Disk
};

export default machine;
