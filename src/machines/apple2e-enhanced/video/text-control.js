import { TEXT_LINES } from "../../ram_map.js";
import { colorAddr } from "./text-constants.js";
import { clearScreen80 } from "./text-80.js";
import { clearScreen40 } from "./text-40.js";

const BaseAddr= TEXT_LINES[0];

export function setCharColor(video, bank, addr, color) {
	video.memory[addr - BaseAddr + colorAddr]= color;
}

const IO= {
	CMD: 0xC0B0,
	VALUE: 0xC0B1,
	ADDRH: 0xC0B2,
	ADDRL: 0xC0B3
};
const COMMANDS= {
	SET_CHAR_COLOR: 0x01,
	PRINT_CHAR: 0x02,
	CLEAR_SCREEN: 0x03,
	SCROLL_SCREEN: 0x04
};

let lastCmd= 0;
let lastAddrH= 0;
let lastAddrL= 0;
export function video_control(video, addr, value) {
	// console.log(addr.toString(16), value.toString(16));

	switch(addr) {

		case IO.CMD: {
			lastCmd= value;
			break;
		}

		case IO.ADDRH: {
			lastAddrH= value;
			break;
		}

		case IO.ADDRL: {
			lastAddrL= value;
			break;
		}

		case IO.VALUE: {
			if(!lastCmd)
				return;
			exec(video, lastCmd, lastAddrH, lastAddrL, value);
			lastCmd= 0;
			lastAddrH= 0;
			lastAddrL= 0;
			break;
		}
	}
}

function exec(video, cmd, addrH, addrL, value) {

	switch(cmd) {

		case COMMANDS.SET_CHAR_COLOR: {
			video.chColor= value;
			break;
		}

		case COMMANDS.CLEAR_SCREEN: {
			video.col80 ? clearScreen80(video) : clearScreen40(video);

			const addr= TEXT_LINES[0];
			video.memory[0x24]= 0x00;
			video.memory[0x25]= 0x00;
			video.memory[0x28]= addr & 0x0F;
			video.memory[0x29]= addr >> 8;

			break;
		}

		case COMMANDS.PRINT_CHAR: {
			const addr= TEXT_LINES[addrL]+(video.col80 ? addrH/2 : addrH);
			video.memory[(!video.col80 || addrH&1) ? addr : 0x10000+addr]= value;

			console.log("PRINT_CHAR", ((!video.col80 || addrH&1) ? addr : 0x10000+addr).toString(16), value.toString(16));
			break;
		}

		case COMMANDS.SCROLL_SCREEN: {

			for(let line= 1; line<24; line++) {
				const fromAddr= TEXT_LINES[line];
				const toAddr= TEXT_LINES[line-1];
				for(let column= 0; column<40; column++) {
					video.memory[toAddr + column]= video.memory[fromAddr + column];
				}
			}
			const addr= TEXT_LINES[23];
			for(let column= 0; column<40; column++)
				video.memory[addr + column]= 0xA0;

			break;
		}

	}
}
