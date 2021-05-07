import ENV from "./env.js";
import KeyMap from "./keymap.js";
// import Cpu6502 from "./cpu/cpu6502.js"
// import Bus from "./cpu/bus.js";
import Debugger from "./debugger.js";
import Video from "./machines/video_2e.js";

let lastTime= 0;
let acc= 0;
let inc= ENV.FPS;

const OneMHz= 1_000_000 * ENV.FPS | 0;
export default class VM {

	constructor(canvas) {
		this.canvas= canvas;
		this.isRunning= true;

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

		this.memory= new SharedArrayBuffer(64 * 1024);
		this.worker= new Worker(new URL('./cpu/65c02/emu6502.js', import.meta.url));
		this.worker.addEventListener('message', (e) => console.log("WORKER",e), false);
		// this.worker.postMessage({
		// 	type:"init",
		// 	buffer: this.memory,
		// 	gc: {}
		// });
		this.worker.postMessage({
			cmd:"setup",
			buffer: this.memory,
			gc: {},
			NMOS_mode: true
		});

		this.setSpeed(1);



		// const model= {
		// 	nmos: true
		// };
		// this.bus= new Bus(this.gc);
		// this.cpu= new Cpu6502(model, this.bus);
		// this.cpu.reset(true);

		this.debugger= new Debugger(this, this.memory);

		// this.cpu._debugInstruction= this.debugger.onInstruction.bind(this.debugger);

		this.video= new Video(this.memory);
		this.canvas.width= this.video.width;
		this.canvas.height= this.video.height;
	}

	memWrite(addr, value) {
		this.worker.postMessage({
			cmd: "memWrite",
			addr,
			value
		});
	}

	memRead(addr) {

	}

	setSpeed(multiplier) {
		// this.cpuMultiplier= multiplier;
		// this.cyclesPerFrame= multiplier * OneMHz;
		this.worker.postMessage({
			cmd: "setSpeed",
			speed: multiplier
		});
	}

	loop(dt= 0) {
		acc+= (dt - lastTime) / 1000;
		while(acc > inc) {
			// const isStopped= !this.cpu.execute(this.cyclesPerFrame);
			this.video.update(this.gc, this.cyclesPerFrame);
			this.gc.tick++;
			acc-= inc;
			// if(isStopped) {
			// 	this.isRunning= false;
			// 	this.debugger.stop();
			// 	return;
			// }
		}
		lastTime= dt;
		this.isRunning && requestAnimationFrame((dt)=> this.loop(dt));
	}

	pause() {
		this.worker.postMessage({
			cmd: "stop"
		});
		this.isRunning= false;
	}

	play() {
		this.isRunning= true;
		this.loop();

		this.worker.postMessage({
			cmd: "run"
		});

	}

	handleEvent(e) {
		if(!e.isTrusted)
			return;

		switch(e.type) {
			case "keyup":
			case "keydown":
				// this.gc.keys.set(e.key, e.type == "keydown");
				this.worker.postMessage({
					cmd: e.type,
					key: e.key
				});

				break;
		}

	}

	async start() {

		[
			"keyup", "keydown",
		].forEach(type=> window.addEventListener(type, this));

		this.worker.postMessage({
			cmd: "reset"
		});
		this.worker.postMessage({
			cmd: "update"
		});

		this.play();

	}

}
