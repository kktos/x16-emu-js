import { TEXT_LINES } from "../../ram_map.js";
import { fontSizes, textColors } from "./text-constants.js";

const BaseAddr= TEXT_LINES[0];

const font40= fontSizes[14][40];
const font80= fontSizes[16][80];
const fonts= {
	40: {
		name: `${font40.h}px "PrintChar21"`,
		offsetLeft: font40.left,
		offsetTop: font40.top + font40.h + 2,
		w: font40.w,
		h: font40.h
	},
	80: {
		name: `${font80.h}px "PRNumber3"`,
		offsetLeft: font80.left,
		offsetTop: font80.top + font80.h + 2,
		w: font80.w,
		h: font80.h
	}
};

function asciiToChar(ascii) {
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
		ascii+= 0xE0C0; // $60-$7F -> $E120-$E13F
	else
	if(ascii>=0xA0)
		ascii-= 0x80;

	return String.fromCharCode(ascii);
}

export function renderText(video, ctx, canvas) {
	const maxCol= video.col80 ? 80 : 40;
	const font= fonts[maxCol];
	ctx.font = font.name;

	if(!video.mixed) {
		ctx.fillStyle = textColors[video.tbColor&0x0F].color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	for(let line= video.mixed ? 20 : 0; line<24; line++)
		for(let column= 0; column < maxCol; column++) {

			const addr= TEXT_LINES[line]+(video.col80 ? column>>1 : column);
			const bank= !video.col80 || column&1 ? 0 : 1;
			const ascii= video.memory[(bank*0x10000)+addr];
			const colour= video.textColours[(bank * 0x0400) + addr-BaseAddr];

			if(colour) {
				ctx.fillStyle = textColors[colour & 0x0F].color;
				ctx.fillRect(font.offsetLeft + (font.w * column), 2 + font.offsetTop + ((font.h+2) * (line-1)), font.w, font.h+2);
			}

			if(ascii === 0xA0)
				continue;

			ctx.fillStyle= textColors[(colour ? colour : video.tbColor) >> 4].color;
			ctx.fillText(asciiToChar(ascii), font.offsetLeft + (font.w * column), font.offsetTop + ((font.h+2) * line));

		}

}

export function clearScreen40(video) {
	for(let line= 0; line<24; line++) {
		const addr= TEXT_LINES[line];
		for(let column= 0; column<40; column++) {
			video.memory[addr + column]= 0xA0;
		}
	}
}
