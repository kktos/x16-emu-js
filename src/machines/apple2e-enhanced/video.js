/*
https://retrocomputing.stackexchange.com/questions/8652/why-did-the-original-apple-e-have-two-sets-of-inverse-video-characters

apple 2 font : https://www.kreativekorp.com/software/fonts/apple2.shtml
*/
import {TEXT_LINES, HGR_LINES} from "../ram_map.js";

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
const hgrColours= [
	// palette 0
	{
		black: "#000000", // black
		col1: "#DD22DD", // purple
		col2: "#10CF00", // green
		white: "#FFFFFF", // white
	},
	// palette 1
	{
		black: "#000000", // black
		col1: "#2222FF", // blue
		col2: "#FF6600", // orange
		white: "#FFFFFF", // white
	}
];

const hPixW= 4;
const hPixH= 4;

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

	// 620x548 -> ratio 1.13
	// 700x619 -> ratio 1.13
	get width() {
		return 700;
		// return 40*15+20; // 620
	}

	get height() {
		return 619;
		// return 24*22+20; // 548
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

	renderHighGraphic(ctx) {
		let pal;
		let line;
		let column;
		let x;
		let pixCurrent, pixBefore, pixAfter;

		function draw(isSamePal= true) {
			switch(pixCurrent) {
				case 0: {
					// ctx.fillStyle= hgrColours[pal].black;
					// ctx.fillRect(x, y+line*hPixH, hPixW*2, hPixH);
					break;
				}
				case 3: {
					ctx.fillStyle= hgrColours[pal].white;
					ctx.fillRect(x, y+line*hPixH, hPixW*2, hPixH);
					break;
				}
				// 01
				case 1: {
					// 01 10 -> B W W B
					if(false && pixBefore==0x02) {
						ctx.fillStyle= hgrColours[pal].white;
						ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);
						// ctx.fillStyle= hgrColours[pal].black;
						ctx.fillStyle= "#FF0000";
						ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
						break;
					}

					const col= hgrColours[pal].col1;

					ctx.fillStyle= col;
					ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);

					ctx.fillStyle= (pixCurrent == pixAfter)||pixAfter==0x3 ? col : hgrColours[pal].black;
					ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
					break;
				}
				// 10
				case 0x02: {
					// 01 10 -> B W W B
					if(false && pixAfter==0x01) {
						// ctx.fillStyle= hgrColours[pal].black;
						ctx.fillStyle= "#0000FF";
						ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);
						ctx.fillStyle= hgrColours[pal].white;
						ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
						break;
					}

					const col= hgrColours[pal].col2;

					ctx.fillStyle= (pixCurrent == pixBefore)||pixBefore==0x3 ? col : hgrColours[pal].black;
					ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);

					ctx.fillStyle= hgrColours[isSamePal ? pal : 0+!pal].col2;
					ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
					break;
				}
			}
			// x+= (hPixW+2)*2;
			x+= hPixW*2;
			pixBefore= pixCurrent;
			pixCurrent= pixAfter;
		}

		let y= 10;
		// for(line= 101; line<(this.mixed ? 102 : 191); line++) {
		for(line= 0; line<(this.mixed ? 150 : 191); line++) {
			pixBefore= -1;
			for(column= 0; column<40; column+= 2) {
			// for(column= 0; column<4; column+= 2) {
				const addr= HGR_LINES[line]+column;
				const b1= this.memory[addr];
				const b2= this.memory[addr+1];
				const b3= this.memory[addr+3];

				// x= 5 + 7 * column * (hPixW+2);
				x= 5 + 7 * column * hPixW;
				pal= b1 & 0x80 ? 1 : 0;
				let pal2= b2 & 0x80 ? 1 : 0;

				pixCurrent= b1 & 0x3; // x000 0011

				pixAfter= (b1>>2) & 0x3; // x000 1100;
				draw();

				pixAfter= (b1>>4)&0x3; // x011 0000;
				draw();

				pixAfter= ((b1 & 0x40)>>6) | (b2<<1 & 0x2); // x000 0001 x100 0000
				draw();

				pixAfter=  b2>>1 & 0x3; // x000 0110
				draw(pal == pal2);

				pal= pal2;

				pixAfter= b2>>3 & 0x3; // x001 1000
				draw();

				pixAfter= b2>>5 & 0x3; // x110 0000
				draw();

				pal2= b3 & 0x80 ? 1 : 0;
				pixAfter= b3 & 0x3;
				// draw(pal == pal2);
				draw();

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

	// renderHighGraphic2(ctx) {

	// 	const hgrColours= [
	// 		// palette 0
	// 		[
	// 			"#000000", // black
	// 			"#DD22DD", // purple
	// 			"#10CF00", // green
	// 			"#FFFFFF", // white
	// 		],
	// 		// palette 1
	// 		[
	// 			"#000000", // black
	// 			"#2222FF", // blue
	// 			"#FF6600", // orange
	// 			"#FFFFFF", // white
	// 		]
	// 	];


	// 	let pixelLine= [];

	// 	for(line= 0; line<(this.mixed ? 150 : 191); line++) {
	// 		for(column= 0; column<40; column+= 2) {
	// 			const addr= HGR_LINES[line]+column;
	// 			let b1= this.memory[addr];
	// 			let b2= this.memory[addr+1];
	// 			let pal1= b1 & 0x80 ? 1 : 0;
	// 			let pal2= b2 & 0x80 ? 1 : 0;
	// 			let pix;
	// 			let pal;

	// 			pal= pal1;

	// 			// x000 0011
	// 			pix= b1 & 0x03;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			// x000 1100
	// 			pix= b1>>2 & 0x03;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			// x011 0000
	// 			pix= b1>>4 & 0x03;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			// x100 0000
	// 			pix= b1>>6 & 0x1;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			pal= pal2;

	// 			// x000 0001 x000 0000
	// 			pix= b2 & 0x1;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			// x000 0110 x000 0000
	// 			pix= b2>>1 & 0x3;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			// x001 1000 x000 0000
	// 			pix= b2>>3 & 0x3;
	// 			pixelLine.push( hgrColours[pal][pix] );

	// 			// x110 0000 x000 0000
	// 			pix= b2>>5 & 0x3;
	// 			pixelLine.push( hgrColours[pal][pix] );
	// 		}
	// 	}

	// }

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
			case MODE.HGR:
				this.renderHighGraphic(ctx);
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

