import ENV from "./env.js";
import KeyMap from "./keymap.js";
// import Cpu6502 from "./cpu/cpu6502.js"
// import Bus from "./cpu/bus.js";
import Debugger from "./debugger.js";

let lastTime= 0;
let acc= 0;
let inc= ENV.FPS;
let msgcounter= 0;

const OneMHz= 1_000_000 * ENV.FPS | 0;
export default class VM {

	constructor(canvas, machine) {
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

		this.worker= new Worker(new URL('./cpu/controller.js', import.meta.url));
		this.worker.addEventListener('message', (e) => this.handleMessage(e.data), false);

		this.memory= new SharedArrayBuffer(machine.memory.size);
		this.sendMessage("setup", {
			buffer: this.memory,
			busSrcFile: machine.busSrcFile,
			gc: {},
			NMOS_mode: true
		});

		this.setSpeed(1);

		this.debugger= new Debugger(this, this.memory);

		this.video= new machine.Video(this.memory);
		this.canvas.width= this.video.width;
		this.canvas.height= this.video.height;

		this.setupMemoryMap(machine);
	}

	setupMemoryMap(machine) {
		machine.memory.map.forEach(({addr, data}) => {
			this.memWrite(addr, data);
		});
	}

	memWrite(addr, value) {
		this.sendMessage("memWrite", {
			addr,
			value
		});
	}

	memRead(addr) {

	}

	setSpeed(multiplier) {
		// this.cpuMultiplier= multiplier;
		// this.cyclesPerFrame= multiplier * OneMHz;
		this.sendMessage("setSpeed", {
			speed: multiplier
		});
	}

	loop(dt= 0) {
		acc+= (dt - lastTime) / 1000;
		while(acc > inc) {
			this.video.update(this.gc, this.cyclesPerFrame);
			this.gc.tick++;
			acc-= inc;
		}
		lastTime= dt;
		this.isRunning && requestAnimationFrame((dt)=> this.loop(dt));
	}

	handleMessage(msg) {
		console.log("handleMessage", msg);

		switch(msg.cmd) {
			case "stopped":
				this.debugger.pause();
				break;
		}
	}

	waitMessage(cmd, data= null) {
		const msgID= msgcounter++;
		return new Promise(resolve => {
			this.worker.postMessage({cmd, id: msgID, data});
			const listener= this.worker.addEventListener('message', (e) => {
				if(e.data.id==msgID) {
					this.worker.removeEventListener('message', listener);
					resolve(e.data);
				}
			});
		})
	}

	sendMessage(cmd, data= null) {
		this.worker.postMessage({cmd, id: msgcounter++, data});
	}

	getCPUstate() {
		return this.waitMessage("update");
	}

	updateCPUregister(register, value) {
		this.sendMessage("register", {register, value});
	}

	pause() {
		this.sendMessage("stop");
		this.isRunning= false;
	}

	play() {
		this.isRunning= true;
		this.loop();
		this.sendMessage("run");
	}

	step() {
		this.sendMessage("step");
	}

	stepOut() {
		this.sendMessage("stepOut");
	}

	stepOver() {
		this.sendMessage("stepOver");
	}

	handleEvent(e) {
		if(!e.isTrusted)
			return;

		switch(e.type) {
			case "keyup":
			case "keydown":
				this.sendMessage(e.type, {key: e.key});
				break;
		}

	}

	async start() {

		[
			"keyup", "keydown",
		].forEach(type=> window.addEventListener(type, this));

		this.sendMessage("reset");

		this.play();

	}

}
