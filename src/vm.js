import ENV from "./env.js";
import KeyMap from "./keymap.js";
import Cpu6502 from "./cpu/cpu6502.js"
import Bus from "./cpu/bus.js";
import Debugger from "./debugger.js";
import Video from "./video.js";

let lastTime= 0;
let acc= 0;
let inc= ENV.FPS;

const OneMHz= 1_000_000 * ENV.FPS | 0;
export default class VM {

	constructor(canvas) {
		this.canvas= canvas;
		this.isRunning= true;
		this.worker= new Worker(new URL('./worker.js', import.meta.url));

		const sab= new SharedArrayBuffer(1024);
		this.worker.postMessage({
			type:"buffer",
			buffer: sab
		});

		this.setSpeed(1);

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

		this.video= new Video(this.bus);
		this.canvas.width= this.video.width;
		this.canvas.height= this.video.height;
	}

	setSpeed(multiplier) {
		this.cpuMultiplier= multiplier;
		this.cyclesPerFrame= multiplier * OneMHz;
	}

	loop(dt= 0) {
		acc+= (dt - lastTime) / 1000;
		while(acc > inc) {
			const isStopped= !this.cpu.execute(this.cyclesPerFrame);
			this.video.update(this.gc, this.cyclesPerFrame);
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
