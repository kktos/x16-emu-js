import Video from "./video_2e.js";
import ROM from "./rom-C000-FFFF";

const machine= {

	name: "Apple //e",

	memory: {
		size: 64 * 1024 * 2,
		bank: 2,
		map: [
			{
				addr: 0xC000,
				data: ROM
			}
		],
	},

	busSrcFile: "apple2/bus.js",
	Video
};

export default machine;
