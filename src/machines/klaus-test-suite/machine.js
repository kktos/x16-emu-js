import Video from "./video";
import RAM from "./65C02_extended_opcodes_test";

const machine= {

	name: "Klaus Test Suite",

	debuggerOnBRK: false,

	memory: {
		size: 64 * 1024,
		bank: 1,
		map: [
			{
				bank: 0,
				addr: 0x0000,
				data: RAM
			},
			{
				bank: 0,
				addr: 0xFFFA,
				// data: "16 27 1C 27 24 27"
				data: "16 27 00 04 24 27"
			}
		],
	},

	busSrcFile: "klaus-test-suite/bus.js",
	Video
};

export default machine;
