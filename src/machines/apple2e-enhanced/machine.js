import Video from "./video_2e.js";
import ROM from "./rom-C000-FFFF";

const machine= {

	name: "Apple //e",

	memory: [
		{
			addr: 0xC000,
			data: ROM
		}
	],

	Video
};

export default machine;
