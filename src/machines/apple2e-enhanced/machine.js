import HGR_IMG from "./hgr-img";
import ROM from "./rom-C000-FFFF";
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
				addr: 0x02000,
				data: HGR_IMG
			}
		],
	},

	busSrcFile: "apple2/bus.js",
	Video
};

export default machine;
