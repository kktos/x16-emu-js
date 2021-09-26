/*
https://retrocomputing.stackexchange.com/questions/8652/why-did-the-original-apple-e-have-two-sets-of-inverse-video-characters

apple 2 font : https://www.kreativekorp.com/software/fonts/apple2.shtml
*/
import {TEXT_LINES} from "../ram_map.js";

const MODE= {
	TEXT: 0,
	GR: 1,
	HGR: 2
};
const grColours= [
	"#000000",
	"#722640",
	"#40337f",
	"#e434fe",
	"#0e5940",
	"#808080",
	"#1b9afe",
	"#bfb3ff",
	"#404c00",
	"#e46501",
	"#808080",
	"#f1a6bf",
	"#1bcb01",
	"#bfcc80",
	"#8dd9bf",
	"#ffffff"
];

function hexWord(val) {
	return val.toString(16).padStart(4, '0').toUpperCase();
}

export default class Video {
	constructor(memory, vm) {
		this.memory= new Uint8Array(memory);
		this.vm= vm;
		this.mode= MODE.TEXT;
		this.col80= false;
		this.mixed= false;
		this.lastGRMode= MODE.GR;
	}

	get width() {
		return 40*15+20;
	}

	get height() {
		return 24*22+20;
	}

	handleMessage(msg) {
		console.log("Video.handleMessage", msg);

		switch(msg.mode) {
			case "col40":
				this.col80= false;
				break;
			case "col80":
				this.col80= true;
				break;
			case "gr":
				this.mode= this.lastGRMode;
				break;
			case "text":
				this.mode= MODE.TEXT;
				break;
			case "low":
				this.mode= this.lastGRMode= MODE.GR;
				break;
			case "high":
				this.mode= this.lastGRMode= MODE.HGR;
				break;
			case "mixed":
				this.mixed= true;
				break;
			case "full":
				this.mixed= false;
				break;
		}
	}

	renderText40(ctx) {
		let x= 7;
		let y= 7+22;
		ctx.fillStyle= "white";
		ctx.font = '20px "PrintChar21"';
		for(let line= 0; line<24; line++)
			for(let column= 0; column<40; column++) {
				const addr= TEXT_LINES[line]+column;
				let ascii= this.memory[addr];
				if(ascii<=0x1F)
					ascii+= 0xE140;
				else
				if(ascii<=0x3F)
					ascii+= 0xE100;
				else
				if(ascii<=0x5F)
					ascii+= 0xE100;
				else
				if(ascii<=0x7F)
					ascii+= 0xE100;
				else
				if(ascii>=0xA0)
					ascii-= 0x80;
				const char= String.fromCharCode(ascii);
				ctx.fillText(char, x+(15*column), y+(22*line));
			}
	}

	renderText40Mixed(ctx) {
		let x= 7;
		let y= 7+22;
		ctx.fillStyle= "white";
		ctx.font = '20px "PrintChar21"';
		for(let line= 20; line<24; line++)
			for(let column= 0; column<40; column++) {
				const addr= TEXT_LINES[line]+column;
				let ascii= this.memory[addr];
				if(ascii<=0x1F)
					ascii+= 0xE140;
				else
				if(ascii<=0x3F)
					ascii+= 0xE100;
				else
				if(ascii<=0x5F)
					ascii+= 0xE100;
				else
				if(ascii<=0x7F)
					ascii+= 0xE100;
				else
				if(ascii>=0xA0)
					ascii-= 0x80;
				const char= String.fromCharCode(ascii);
				ctx.fillText(char, x+(15*column), y+(22*line));
			}
	}

	renderText80(ctx) {
		let x= 25;
		let y= 30+18;
		ctx.fillStyle= "#FFFFFF";
		ctx.font = '16px "PRNumber3"';
		for(let line= 0; line<24; line++)
			for(let column= 0; column<80; column++) {
				const addr= TEXT_LINES[line]+(column/2)|0;
				let ascii= this.memory[column&1 ? addr : 0x10000+addr];
				if(ascii<=0x1F)
					ascii+= 0xE140;
				else
				if(ascii<=0x3F)
					ascii+= 0xE100;
				else
				if(ascii<=0x5F)
					ascii+= 0xE100;
				else
				if(ascii<=0x7F)
					ascii+= 0xE100;
				else
				if(ascii>=0xA0)
					ascii-= 0x80;
				const char= String.fromCharCode(ascii);
				ctx.fillText(char, x+(7*column), y+(20*line));
			}

		// ctx.fillStyle="#FFFFFF";
		// ctx.font = '12px monospace';
		// y= 400;
		// x= 10
		// for(let line= 0; line<6; line++) {
		// 	const addr= (TEXT_LINES[line]).toString(16).toUpperCase();
		// 	ctx.fillText(addr.padStart(4, '0')+":", x, y+(16*line));
		// 	for(let column= 0; column<40; column++) {
		// 		let addr= TEXT_LINES[line]+column;
		// 		let char= (this.memory[addr]).toString(16).toUpperCase();
		// 		ctx.fillText(char.padStart(2, '0'), x+40+(15*column++), y+(16*line));
		// 		char= (this.memory[0x10000+addr]).toString(16).toUpperCase();
		// 		ctx.fillText(char.padStart(2, '0'), x+40+(15*column), y+(16*line));
		// 	}
		// }

	}

	renderLowGraphic(ctx) {
		let x= 5;
		let y= 10;
		for(let line= 0; line<(this.mixed ? 40 : 48); line+=2) {
			for(let column= 0; column<40; column++) {
				const addr= TEXT_LINES[line/2]+column;
				let byte= this.memory[addr];
				ctx.fillStyle= grColours[byte & 0x0F];
				ctx.fillRect(x+(15*column), y+(11*line), 20, 11);
				ctx.fillStyle= grColours[byte>>4 & 0x0F];
				ctx.fillRect(x+(15*column), y+(11*(line+1)), 20, 11);
			}

			// if((line & 1) == 0) {
			// 	const addr= TEXT_LINES[line/2];
			// 	ctx.fillStyle="#FFFFFF";
			// 	ctx.font = "12pt courier";
			// 	ctx.fillText(hexWord(addr), 5, y+(11*line)+14);
			// }

		}
		if(this.mixed)
			this.renderText40Mixed(ctx);
	}

	update({tick, viewport:{ctx, canvas}}, cycles) {
		ctx.fillStyle="black";
		ctx.fillRect(0,0,canvas.width,canvas.height);

		switch(this.mode) {
			case MODE.TEXT:
				this.col80 ? this.renderText80(ctx) : this.renderText40(ctx);
				break;
			case MODE.GR:
				this.renderLowGraphic(ctx);
				break;
		}


		// ctx.fillStyle="#7777FF";
		// ctx.font = '12px monospace';
		// y= 400;
		// x= 10
		// for(let line= 0; line<6; line++) {
		// 	const addr= (TEXT_LINES[line]).toString(16).toUpperCase();
		// 	ctx.fillText(addr.padStart(4, '0')+":", x, y+(16*line));
		// 	for(let column= 0; column<40; column++) {
		// 		const char= (this.memory[TEXT_LINES[line]+column]).toString(16);
		// 		ctx.fillText(char.padStart(2, '0'), x+40+(15*column), y+(16*line));
		// 	}
		// }

		// ctx.fillStyle="red";
		// ctx.font = '16px monospace';
		// ctx.fillText(`${this.count}`, 10, canvas.height-20);
		// ctx.fillText(`PC:${this.cpu.pc}`, 10, canvas.height-40);
		// ctx.fillText(` X:${this.cpu.x}`, 10, canvas.height-60);

	}

}

