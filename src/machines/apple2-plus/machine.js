import Video from "./video_2+.js";
import ROM from "./rom-F800-FFFF";

const machine= {

	name: "Apple //+",

	memory: [
		{
			addr: 0xF800,
			data: ROM
		},
		{
			addr: 0xE000,
			data: "4c 69 ff"
		}
	],

	Video
};

export default machine;
