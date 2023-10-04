import { HGR_LINES } from "../../ram_map.js";
import { renderLowGraphic } from "./gr.js";
import { setCharColor, video_control } from "./text-control.js";
import { renderText } from "./text.js";

/*

https://retrocomputing.stackexchange.com/questions/8652/why-did-the-original-apple-e-have-two-sets-of-inverse-video-characters

apple 2 font : https://www.kreativekorp.com/software/fonts/apple2.shtml
*/
const MODE= {
	TEXT: 0,
	GR: 1,
	HGR: 2
};

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


const hPixW= 1;
const hPixH= 1;

function hexWord(val) {
	return val.toString(16).padStart(4, '0').toUpperCase();
}

export default class Video {
	constructor(memory, vm) {
		this.memory= new Uint8Array(memory);
		this.vm= vm;
		this.mode= MODE.TEXT;
		this.col80= false;
		this.altCharset= false;
		this.maxCol= 40;
		this.maxLine= 24;
		this.mixed= false;
		this.lastGRMode= MODE.GR;
		// this.cacheText40= this.buildCacheText40();
		this.cacheHGR= [null, null, null, null];
		this.cacheHGRstate= [true, true, true, true];
		this.refreshCount= 0;

		this.mode= this.lastGRMode= MODE.HGR;

		this.id= Math.floor(Math.random()*100_000_000);
		this.textColours= new Uint8Array(2 * 0x0400);

		this.avgSpeed= 0;
		this.speeds= [10,10,10,10,10,10,10,10,10,10,10];
		this.speedIdx= 0;

		this.fontSize= 8;
		// default FG/BG colours for text
		this.tbColor= 0xF0;
		// FG/BG colour for any new char
		this.chColor= 0x00;
	}

	// 620x548 -> ratio 1.13
	// 700x619 -> ratio 1.13
	// 1134x782 -> ratio 4
	get width() {
		return 1134/2;
		// return 40*15+20; // 620
	}

	get height() {
		return 782/2;
		// return 24*22+20; // 548
	}

	handleMessage(sender, msg) {

		// sender && console.log("Video.handleMessage", msg, sender);

		if(msg.update !== undefined)
			return this.cacheHGRstate[msg.update]= true;
			// return this.buildHGRScreenPart(this.vm.gc.viewport.canvas, msg.update);

		switch(msg.mode) {
			case "col40":
				this.col80= false;
				this.maxCol= 40;
				break;
			case "col80":
				this.col80= true;
				this.maxCol= 80;
				break;
			case "altCharset":
				this.altCharset= msg.value;
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
			case "tbcolor":
				this.tbColor= msg.value;
				break;

			case "ctrl":
				video_control(this, sender, msg.addr, msg.value);
				break;
			case "mem":
				this.chColor && setCharColor(this, msg.bank, msg.addr, this.chColor);
				break;
		}
	}

	// buildCacheText40() {
	// 	const cache= {};
	// 	let x= 7;
	// 	let y= 7+22;
	// 	for(let ascii= 0; ascii<256; ascii++) {

	// 		const buffer = document.createElement('canvas');
	// 		const ctx= buffer.getContext("2d", { alpha: false });
	// 		buffer.width= 10;
	// 		buffer.height= 20;

	// 		cache[ascii]= buffer;
	// 		let code= ascii;

	// 		if(code<=0x1F)
	// 			code+= 0xE140;
	// 		else
	// 		if(code<=0x3F)
	// 			code+= 0xE100;
	// 		else
	// 		if(code<=0x5F)
	// 			code+= 0xE100;
	// 		else
	// 		if(code<=0x7F)
	// 			code+= 0xE100;
	// 		else
	// 		if(code>=0xA0)
	// 			code-= 0x80;
	// 		const char= String.fromCharCode(code);

	// 		ctx.imageSmoothingEnabled = false;
	// 		ctx.msImageSmoothingEnabled = false;
	// 		ctx.fillStyle= "white";
	// 		ctx.font = '20px "PrintChar21"';
	// 		ctx.fillText(char, 0, 20);
	// 	}
	// 	return cache;
	// }

	buildHGRScreenPart(part) {

		let buffer= this.cacheHGR[part];
		if(!buffer) {
			buffer= document.createElement('canvas');
			this.cacheHGR[part]= buffer;
			buffer.width= 280;
			buffer.height= 48; //canvas.height / 4; //192/4;

			// console.log(part, buffer.width, buffer.height);
		}

		const ctx= buffer.getContext("2d", { alpha: false });
		ctx.imageSmoothingEnabled = false;
		ctx.msImageSmoothingEnabled = false;
		// ctx.scale(1, 2);

		// if(part)
		// 	return;

		// ctx.strokeStyle= ["#7B7D7D", "#512E5F", "#0B5345", "#6E2C00"][part];
		// ctx.strokeRect(0, 0, buffer.width, buffer.height);
		ctx.fillStyle= ["#000000", "#010d16e6", "#000000", "#010d16e6"][part];
		ctx.fillRect(0, 0, buffer.width, buffer.height);

		this.renderHGRScreenPart(ctx, 48*part, 48*(part+1));

		this.refreshCount++;
	}

	renderHGRScreenPart(ctx, lineFrom, lineTo) {
		const incH= hPixW+0;
		const y= 0;
		const stepH= 7 * incH;
		let x;
		let column;
		let pal;
		let pixCurrent;
		let pixBefore;
		let pixAfter;

		// console.log("renderHGRScreenPart", lineFrom, lineTo);

		// ctx.fillStyle= "black";
		// ctx.fillRect(0, 0, 260, lineTo-lineFrom);

		function draw(line) {
			switch(pixCurrent) {
				case 3: {
					// ctx.fillStyle= "gray";
					ctx.fillStyle= hgrColours[pal].white;
					ctx.fillRect(x, y+line*hPixH, hPixW*2, hPixH);
					break;
				}

				// 01 - VIOLET / BLUE
				case 1: {
					const col= hgrColours[pal].col1;

					ctx.fillStyle= pixBefore & 0x2 ? hgrColours[pal].white : col;
					ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);

					if(pixAfter === 0x1||pixAfter===0x3) {
						ctx.fillStyle= col;
						ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
					}
					break;
				}

				// 10 - GREEN / ORANGE
				case 0x02: {
					let col= hgrColours[pal].col2;

					if(pixBefore === 0x2||pixBefore===0x3) {
						ctx.fillStyle= col;
						ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);
					}

					col= pixAfter===0x3 ? hgrColours[pal].white : hgrColours[pal].col2;

					ctx.fillStyle= col;
					ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
					break;
				}
			}
			x+= incH*2;
			pixBefore= pixCurrent;
			pixCurrent= pixAfter;
		}

		for(let line= lineFrom; line < lineTo; line++) {
			pixBefore= -1;
			for(column= 0; column<40; column+= 2) {
				const addr= HGR_LINES[line]+column;
				const b1= this.memory[addr];
				const b2= this.memory[addr+1];

				x= stepH * column;
				pal= b1 & 0x80 ? 1 : 0;
				const pal2= b2 & 0x80 ? 1 : 0;

				pixCurrent= b1 & 0x3; // x000 0011

				pixAfter= (b1>>2) & 0x3; // x000 1100;
				draw(line - lineFrom);

				pixAfter= (b1>>4)&0x3; // x011 0000;
				draw(line - lineFrom);

				pixAfter= ((b1 & 0x40)>>6) | (b2<<1 & 0x2); // x000 0001 x100 0000
				draw(line - lineFrom);

				pixAfter=  b2>>1 & 0x3; // x000 0110
				draw(line - lineFrom);

				pal= pal2;

				pixAfter= b2>>3 & 0x3; // x001 1000
				draw(line - lineFrom);

				pixAfter= b2>>5 & 0x3; // x110 0000
				draw(line - lineFrom);

				// pal2= b3 & 0x80 ? 1 : 0;
				// pixAfter= b3 & 0x3;
				pixAfter= pixCurrent;
				// draw(pal == pal2);
				draw(line - lineFrom);

			}
		}
	}

	renderHighGraphic(ctx) {

		this.cacheHGR.forEach((img, part) => {

			// if(this.cacheHGRstate[part]) {
			// 	this.cacheHGRstate[part]= false;
			// 	this.buildHGRScreenPart(part);
			// }
			this.buildHGRScreenPart(part);

			if(img)
				ctx.drawImage(img, 0, part*155, 700, 155);
		});

		if(this.mixed)
			this.renderText40Mixed(ctx);

	}

	renderHighGraphic_old(mainCtx) {
		const incH= hPixW+0;
		const y= 10;
		const stepH= 7 * incH;
		let x, column, line, pal;
		let pixCurrent, pixBefore, pixAfter;

		function draw() {
			switch(pixCurrent) {
				case 0: {
					// ctx.fillStyle= hgrColours[pal].black;
					// ctx.fillRect(x, y+line*hPixH, hPixW*2, hPixH);
					break;
				}
				case 3: {
					// ctx.fillStyle= "gray";
					ctx.fillStyle= hgrColours[pal].white;
					ctx.fillRect(x, y+line*hPixH, hPixW*2, hPixH);
					break;
				}

				// 01 - VIOLET / BLUE
				case 1: {
					const col= hgrColours[pal].col1;

					ctx.fillStyle= pixBefore & 0x2 ? hgrColours[pal].white : col;
					ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);

					if(pixAfter == 0x1||pixAfter==0x3) {
						ctx.fillStyle= col;
						ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
					}
					break;
				}

				// 10 - GREEN / ORANGE
				case 0x02: {
					let col= hgrColours[pal].col2;

					if(pixBefore == 0x2||pixBefore==0x3) {
						ctx.fillStyle= col;
						ctx.fillRect(x, y+line*hPixH, hPixW, hPixH);
					}

					col= pixAfter==0x3 ? hgrColours[pal].white : hgrColours[pal].col2;

					ctx.fillStyle= col;
					ctx.fillRect(x + hPixW, y+line*hPixH, hPixW, hPixH);
					break;
				}
			}
			x+= incH*2;
			pixBefore= pixCurrent;
			pixCurrent= pixAfter;
		}


		const tempCanvas= document.createElement("canvas");
		const ctx= tempCanvas.getContext("2d", { alpha: false });
		ctx.imageSmoothingEnabled = false;
		ctx.msImageSmoothingEnabled = false;

		tempCanvas.width= 280;
		tempCanvas.height= 48*4;

		for(let part= 0; part<4; part++) {
			this.renderHGRScreenPart(ctx, 48*part, 48*(part+1));
			ctx.translate(0, 48);
		}
		// ctx.translate(0, 48*-4);

		mainCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, this.width, this.height);

		return;

		// const tempCanvas= document.createElement("canvas");
		// const ctx= tempCanvas.getContext("2d");
		// tempCanvas.width= 280;
		// tempCanvas.height= this.mixed ? 150 : 193;

		for(line= 0; line<(this.mixed ? 150 : 193); line++) {
			pixBefore= -1;
			for(column= 0; column<40; column+= 2) {
				const addr= HGR_LINES[line]+column;
				const b1= this.memory[addr];
				const b2= this.memory[addr+1];

				x= 5 + stepH * column;
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

				// pal2= b3 & 0x80 ? 1 : 0;
				// pixAfter= b3 & 0x3;
				pixAfter= pixCurrent;
				// draw(pal == pal2);
				draw();

			}
		}

		// mainCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 10, 10, this.width-20, this.height-20);
		mainCtx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

		if(this.mixed)
			this.renderText40Mixed(mainCtx);
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

	update({tick, mhz, viewport:{ctx, canvas}}, isVmPaused) {
		// ctx.fillStyle="black";
		// ctx.fillRect(0,0,canvas.width,canvas.height);

		const s= performance.now();

		switch(this.mode) {
			case MODE.TEXT: {
				renderText(this, ctx, canvas);
				break;
			}
			case MODE.GR:
				renderLowGraphic(this, ctx, canvas);
				break;
			case MODE.HGR:
				// this.renderHighGraphic_old(ctx);
				// this.renderHighGraphic(ctx);
				this.renderHighGraphic_old(ctx);
				break;
		}

		ctx.fillStyle="red";
		ctx.font = `${this.fontSize}px monospace`;

		if(isVmPaused) {
			const txt= `PAUSED ${this.refreshCount} ${tick} ${mhz.toFixed(2)}MHz`;
			ctx.fillText(txt, canvas.width-ctx.measureText(txt).width-5, this.fontSize-1);
			return;
		}

		const m= ["TEXT", "GR", "HGR"][this.mode] + (this.mode===MODE.TEXT ? (this.col80 ? "80":"40"):"");

		const e= performance.now();
		this.speedIdx= this.speedIdx+1 % this.speeds.length;
		this.speeds[this.speedIdx]= e - s;
		const avg= this.speeds.reduce((acc, cur)=>acc+cur, 0) / this.speeds.length;

		const txt= `${this.mixed?"mixed":""} ${m} W${canvas.width}H${canvas.height} ${avg.toFixed(2)}ms ${this.refreshCount} ${tick} ${mhz.toFixed(2)}MHz`;
		ctx.fillText(txt,canvas.width-ctx.measureText(txt).width-5, this.fontSize-1);

	}

}

