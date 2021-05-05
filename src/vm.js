import ENV from "./env.js";
import KeyMap from "./keymap.js";
import Cpu6502 from "./cpu/cpu6502.js"
import Bus from "./cpu/bus.js";
import Debugger from "./debugger.js";
import Video from "./video.js";
import {TEXT_LINES} from "./apple2-monitor.js";

let lastTime= 0;
let acc= 0;
let inc= ENV.FPS;

export default class VM {

	constructor(canvas) {
		this.canvas= canvas;
		this.isRunning= true;

		this.cpuMultiplier= 1;
		this.cyclesPerFrame= 1_000_000 * ENV.FPS | 0;

		this.gc= {
			viewport: {
				canvas,
				ctx: canvas.getContext("2d"),
			},

			dt: inc,
			tick: 0,

			mouse: {x: 0, y: 0, down: false},
			keys: new KeyMap(),
		};

		const model= {
			nmos: true
		};
		this.bus= new Bus(this.gc);
		this.cpu= new Cpu6502(model, this.bus);
		this.cpu.reset(true);

		this.debugger= new Debugger(this, this.cpu);

		this.cpu._debugInstruction= this.debugger.onInstruction.bind(this.debugger);

		this.video= new Video();
		this.canvas.width= this.video.width;
		this.canvas.height= this.video.height;
	}

	updateVideo({tick, viewport:{ctx, canvas}}, cycles) {
		ctx.fillStyle="black";
		ctx.fillRect(0,0,canvas.width,canvas.height);

		let x= 7;
		let y= 7+22;
		ctx.fillStyle="white";
		ctx.font = '20px "PrintChar21"';
		for(let line= 0; line<24; line++)
			for(let column= 0; column<40; column++) {
				const addr= TEXT_LINES[line]+column;
				let ascii= this.bus.ram[addr];
				if(ascii<=0x1F)
					ascii+= 0xE140;
				else
				if(ascii<=0x3F)
					ascii+= 0xE100;
				else
				if(ascii<=0x5F)
					ascii+= ((tick/10)|0)%2 ? 0xE100 : 0 ;
				else
				if(ascii<=0x7F)
					ascii+= -0x40 + ( ((tick/10)|0)%2 ? 0xE100 : 0 );
				else
				if((ascii>=0xA0) && (ascii<=0xDF))
					ascii= ascii - 0x80;
				const char= String.fromCharCode(ascii);
				ctx.fillText(char, x+(15*column), y+(22*line));
			}

		// ctx.fillStyle="#7777FF";
		// ctx.font = '12px monospace';
		// y= 400;
		// x= 10
		// for(let line= 0; line<6; line++) {
		// 	const addr= (TEXT_LINES[line]).toString(16).toUpperCase();
		// 	ctx.fillText(addr.padStart(4, '0')+":", x, y+(16*line));
		// 	for(let column= 0; column<40; column++) {
		// 		const char= (this.bus.ram[TEXT_LINES[line]+column]).toString(16);
		// 		ctx.fillText(char.padStart(2, '0'), x+40+(15*column), y+(16*line));
		// 	}
		// }

		// ctx.fillStyle="red";
		// ctx.font = '16px monospace';
		// ctx.fillText(`${cycles} - ${tick}`, 10, canvas.height-20);
		// ctx.fillText(`PC:${this.cpu.pc}`, 10, canvas.height-40);
		// ctx.fillText(` X:${this.cpu.x}`, 10, canvas.height-60);

	}

	loop(dt= 0) {

		acc+= (dt - lastTime) / 1000;
		while(acc > inc) {

			const cycles= this.cpuMultiplier * this.cyclesPerFrame;
			const isStopped= !this.cpu.execute(cycles);
			// if(isStopped)
			// 	console.log("-- CPU STOPPED");
			this.updateVideo(this.gc, cycles);
			
			this.gc.tick++;
			acc-= inc;

			if(isStopped) {
				this.isRunning= false;
				this.debugger.stop();
				return;
			}

		}
		lastTime= dt;
		this.isRunning && requestAnimationFrame((dt)=> this.loop(dt));
	}

	pause() {
		this.isRunning= false;
	}

	play() {
		this.isRunning= true;
		this.loop();
	}

	handleEvent(e) {
		if(!e.isTrusted)
			return;

		switch(e.type) {
			case "keyup":
			case "keydown":
				this.gc.keys.set(e.key, e.type == "keydown");
				break;
		}

	}

	async start() {

		[
			"keyup", "keydown",
		].forEach(type=> window.addEventListener(type, this));

		this.play();

	}

}