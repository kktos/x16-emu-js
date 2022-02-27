import HGR_IMG from "./hgr-img";
import ROM from "./rom-C000-FFFF";
import Sound from "./sound.js";
import Video from "./video.js";

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
		size: 64 * 1024 * 2,
		bank: 2,
		map: [
			{
				bank: 0,
				addr: 0xC000,
				data: ROM
			},
			{
				bank: 0,
				addr: 0x0300,
				data: "20 58 fc a9 aa 8d 80 7 8d 55 c0 8d 80 07 8d 54 c0 60"
			},
			{
				bank: 0,
				addr: 0x0800,
				data: `
					20 2F FB 20 58 FC A9 00
					48 AA 20 24 08 A0 0A 20
					A8 FC 88 D0 FA 68 CD 5F
					08 F0 06 18 69 01 48 D0
					E8 60 A2 00 08 48 98 48
					8A CD 5F 08 90 02 A9 00
					0A AA BD 60 08 8D 5E 08
					E8 BD 60 08 8D 40 08 A0
					00 98 AA 98 20 A8 FC 2C
					30 C0 E0 80 F0 0B CA D0
					F2 88 D0 ED CE 5E 08 D0
					E6 68 A8 68 28 60 01 10
					01 08 01 18 FF 01 06 10
					01 30 20 06 70 06 FF 06
					01 A0 FF 02 04 1C 01 10
					30 0B 30 07 50 09 01 64
				`
			},
			{
				bank: 0,
				addr: 0x02000,
				data: HGR_IMG
			}
		],
	},

	busSrcFile: "apple2/bus.js",
	Video,
	Sound
};

export default machine;
