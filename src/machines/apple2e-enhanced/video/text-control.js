import { TEXT_LINES } from "../../ram_map.js";
import { MON_BASH, MON_BASL, MON_CH, MON_CSWH, MON_CSWL, MON_CV, OURCH, OURCV } from "./text-constants.js";
import { clearScreen40 } from "./text.js";

const BaseAddr= TEXT_LINES[0];
let videoMode= -1;

export function setCharColor(video, bank, addr, color) {
	video.textColours[(bank * 0x0400) + addr - BaseAddr]= color;
}

const IO= {
	CMD: 0xC0B0,
	VALUE: 0xC0B1,
	ADDRH: 0xC0B2,
	ADDRL: 0xC0B3,
	COUT: 0xC0BF
};
const COMMANDS= {
	SET_CHAR_COLOR: 0x01,
	WRITE_CHAR: 0x02,
	CLEAR_WINDOW: 0x03,
	SCROLL_WINDOW: 0x04,
	OUTPUT_CHAR: 0x05,
	SET_MODE: 0x06,
	OUTPUT_STRING: 0x25,
};

let lastCmd= 0;
let lastAddrH= 0;
let lastAddrL= 0;
export function video_control(video, sender, addr, value) {
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
			exec(video, sender, lastCmd, lastAddrH, lastAddrL, value);
			lastCmd= 0;
			lastAddrH= 0;
			lastAddrL= 0;
			break;
		}

		case IO.COUT: {
			if(videoMode>=0) {
				outputChar(video, sender, value);
			}
			break;
		}
	}
}

function exec(video, sender, cmd, addrH, addrL, value) {

	switch(cmd) {

		case COMMANDS.SET_CHAR_COLOR: {
			video.chColor= value;
			break;
		}

		case COMMANDS.SET_MODE:
			return setMode(video, value);

		case COMMANDS.CLEAR_WINDOW:
			return clearWindow(video);

		case COMMANDS.WRITE_CHAR: {
			const addr= TEXT_LINES[addrL]+(video.col80 ? addrH>>1 : addrH);
			const bank= !video.col80 || column&1 ? 0 : 1;
			video.memory[(bank * 0x10000) + addr]= value;
			setCharColor(video, bank, addr, video.chColor);
			break;
		}

		case COMMANDS.OUTPUT_STRING: {
			const addr= (addrH<<8) + addrL;

			console.log("OUTPUT_STRING", addr.toString(16), addrH.toString(16), addrL.toString(16), value);

			for(let idx= 0; idx<value; idx++) {
				const ch= video.memory[(addr+idx)&0xFFFF];
				outputChar(video, null, ch);
				console.log(addr.toString(16), idx, ch);
			}
			break;
		}

		case COMMANDS.OUTPUT_CHAR: {
			outputChar(video, sender, value);
			break;
		}

		case COMMANDS.SCROLL_WINDOW: {
			ScrollWindow(video);
			break;
		}

	}
}

function setMode(video, mode) {
	videoMode= mode;
	clearWindow(video);
	video.memory[MON_CSWL]= 0x00;
	video.memory[MON_CSWH]= 0x03;
}

function clearWindow(video) {
	clearScreen40(video);

	video.textColours.fill(video.chColor);

	const addr= TEXT_LINES[0];
	video.memory[MON_CH]= 0x00;
	video.memory[MON_CV]= 0x00;
	video.memory[OURCH]= 0x00;
	video.memory[OURCV]= 0x00;
	video.memory[MON_BASL]= addr & 0xFF;
	video.memory[MON_BASH]= addr >> 8;
}

function ScrollWindow(video) {
	for(let line= 1; line<video.maxLine; line++) {
		const fromAddr= TEXT_LINES[line];
		const toAddr= TEXT_LINES[line-1];
		for(let column= 0; column<video.maxCol; column++) {
			video.memory[toAddr + column]= video.memory[fromAddr + column];
			video.textColours[toAddr - BaseAddr + column]= video.textColours[fromAddr - BaseAddr + column];
		}
	}
	const addr= TEXT_LINES[video.maxLine-1];
	for(let column= 0; column<video.maxCol; column++) {
		video.memory[addr + column]= 0xA0;
		video.textColours[addr - BaseAddr + column]= video.chColor;
	}
}

function outputChar(video, sender, ch) {

	while(video) {
		// control char ?
		if((ch & 0x7F) < 0x20) {
			ctrlChar(video, ch);
			break;
		}

		const line= video.memory[video.col80 ? OURCV : MON_CV];
		let column= video.memory[video.col80 ? OURCH : MON_CH];

		const addr= TEXT_LINES[line]+(video.col80 ? column>>1 : column);
		const bank= !video.col80 || column&1 ? 0 : 1;
		video.memory[(bank * 0x10000) + addr]= ch;
		setCharColor(video, bank, addr, video.chColor);

		column++;
		if(column < video.maxCol) {
			video.memory[MON_CH]= column;
			video.memory[OURCH]= column;
			break;
		}

		newLine(video);
		break;
	}

	sender?.postMessage({});
}

function newLine(video) {
	const line= video.memory[video.col80 ? OURCH : MON_CV]+1;

	if(line >= video.maxLine) {
		video.memory[MON_CH]= 0;
		video.memory[OURCH]= 0;
		ScrollWindow(video);
		return;
	}

	video.memory[MON_CV]= line;
	video.memory[OURCV]= line;
	const addr= TEXT_LINES[line];
	video.memory[MON_BASL]= addr & 0xFF;
	video.memory[MON_BASH]= addr >> 8;
	video.memory[MON_CH]= 0;
	video.memory[OURCH]= 0;

	// console.log("newLine", video.memory[MON_CH], video.memory[MON_CV], video.memory[MON_BASL].toString(16), video.memory[MON_BASH].toString(16));
}

function ctrlChar(video, ch) {

	console.log("ctrl", ch.toString(16));

	switch(ch & 0x7F) {
		case 0x0D: {
			return newLine(video);
		}
	}

}
