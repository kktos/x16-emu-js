import { TEXT_LINES } from "../../ram_map.js";
import { renderText } from "./text.js";

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

export function renderLowGraphic(video, ctx, canvas) {
	const x= 5;
	const y= 10;

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for(let line= 0; line<(video.mixed ? 40 : 48); line+=2) {
		for(let column= 0; column<40; column++) {
			const addr= TEXT_LINES[line/2]+column;
			const byte= video.memory[addr];
			ctx.fillStyle= grColours[byte & 0x0F];
			ctx.fillRect(x+(15*column), y+(11*line), 20, 11);
			ctx.fillStyle= grColours[byte>>4 & 0x0F];
			ctx.fillRect(x+(15*column), y+(11*(line+1)), 20, 11);
		}

	}
	if(this.mixed)
		renderText(video, ctx, canvas);
}
