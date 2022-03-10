import MyWorker from "./cpu/controller.js?worker";
import Debugger from "./debugger.js";
import ENV from "./env.js";
import KeyMap from "./keymap.js";

let lastTime,
	acc,
	inc= ENV.FPS,
	msgcounter= 0,
	speeds= [0,0],
	speedIdx= 0;

const OneMHz= 1_000_000 * ENV.FPS | 0;
export default class VM {

	constructor(canvas, machine) {
		this.machine= machine;
		this.canvas= canvas;
		this.isRunning= true;

		this.gc= {
			viewport: {
				canvas,
				ctx: canvas.getContext("2d", { alpha: false }),
			},

			dt: inc,
			tick: 0,
			mhz: 0,

			mouse: {x: 0, y: 0, down: false},
			keys: new KeyMap(),
		};

		this.cpuWorker= new MyWorker();
		// this.worker= new Worker(new URL('./cpu/controller.mjs', import.meta.url));
		// this.worker= new Worker('/js/cpu/controller.js');
		this.cpuWorker.addEventListener('message', (e) => this.handleMessage(e.data), false);

		this.memory= new SharedArrayBuffer(machine.memory.size);

		// this.sendMessage("setup", {
		// 	buffer: this.memory,
		// 	busSrcFile: machine.busSrcFile,
		// 	debuggerOnBRK: machine.debuggerOnBRK===false ? false : true,
		// 	NMOS_mode: true
		// });

		this.setSpeed(1);

		this.debugger= new Debugger(this, this.memory);

		this.video= new machine.Video(this.memory, this);

		this.sound= new machine.Sound(this.memory, this);

		this.canvas.width= this.video.width;
		this.canvas.height= this.video.height;
		this.gc.viewport.ctx.imageSmoothingEnabled = false; // magic!
		this.gc.viewport.ctx.msImageSmoothingEnabled = false; // magic!

	}

	async setup() {
		await this.sound.setup();

		await this.waitMessage("setup", {
			memory: this.memory,
			busSrcFile: this.machine.busSrcFile,
			debuggerOnBRK: this.machine.debuggerOnBRK===false ? false : true,
			NMOS_mode: true
		});

		this.setupMemoryMap();

		this.sendMessage("addHook", {addr: 0xC600});

	}

	setupMemoryMap() {
		this.machine.memory.map.forEach(({bank, addr, data}) => {
			this.memWrite(bank, addr, data);
		});
	}

	memWrite(bank, addr, value) {
		this.sendMessage("memWrite", {
			bank,
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

	async loop(dt= 0) {
		acc+= (dt - lastTime) / 1000;
		while(acc > inc) {
			this.video.update(this.gc);
			this.gc.tick++;
			this.sound.doTick( await this.waitMessage("cycles") );
			acc-= inc;
		}
		lastTime= dt;

		if(this.isRunning) {
			requestAnimationFrame((dt)=> this.loop(dt));

			this.waitMessage("mhz").then(data=>{
				speedIdx= speedIdx+1 % speeds.length;
				speeds[speedIdx]= data/1_000;
				const avg= speeds.reduce((acc, cur)=>acc+cur, 0) / speeds.length;
				this.gc.mhz= Math.round((avg + Number.EPSILON) * 100) / 100
			});

		}
		// setTimeout(() =>this.debugger.update() , 0);
		// this.debugger.update();

	}

	handleMessage(msg) {
		// console.log("handleMessage", msg);

		switch(msg.cmd) {
			case "video":
				this.video.handleMessage(msg.data);
				break;
			case "sound":
				this.sound.handleMessage(msg.data);
				break;
			case "stopped":
				this.debugger.pause();
				break;

			case "hooked":
				console.log("hooked", msg.data.PC.toString(16), msg.data);
				switch(msg.data.PC) {
					case 0xC600:
						this.sendMessage("register", {register:"PC", value:0x801});
						setTimeout( () => this.sendMessage("run"), 0);
						break;

					default:
						this.debugger.pause();
						break;
				}
				break;
		}
	}

	waitMessage(cmd, data= null) {
		const msgID= msgcounter++;
		return new Promise(resolve => {
			const {port1, port2}= new MessageChannel();
			port1.onmessage= ({data:{cmd, id, data}}) => {

				// if(!["mhz","cycles"].includes(cmd))
				// 	console.log("waitMessage response", cmd, id, data);

				resolve(data);
			};

			// if(!["mhz","cycles"].includes(cmd))
			// 	console.log("waitMessage send", cmd, msgID, data);

			this.cpuWorker.postMessage({cmd, id: msgID, data}, [port2]);
		});
	}
/*
	waitMessage0(cmd, data= null) {
		const msgID= msgcounter++;
		return new Promise(resolve => {

			if(!this.isRunning)
				console.log("waitMessage", "post", {cmd, id: msgID, data});

			const listener= this.cpuWorker.addEventListener('message', (e) => {

				if(!this.isRunning)
					console.log("waitMessage", "onMessage", e.data);

				const response= e.data;
				if(response.id!=msgID) {
					console.error("waitMessage", "received wrong answer");
					console.error("waitMessage", "post", {cmd, id: msgID, data});
					console.error("waitMessage", "response", response);
				}
				resolve(response);

				// this.cpuWorker.removeEventListener('message', listener);
			}, { once: true });

			this.cpuWorker.postMessage({cmd, id: msgID, data});

		})
	}
*/
	sendMessage(cmd, data= null) {
		this.cpuWorker.postMessage({cmd, id: msgcounter++, data});
	}

	getCPUCycles() {
		return this.waitMessage("cycles");
	}

	getCPUstate() {
		return this.waitMessage("update");
	}

	updateCPUregister(register, value) {
		this.sendMessage("register", {register, value});
	}

	updateVideo() {
		this.video.update(this.gc);
	}

	async pause() {
		console.log( "stopped at", (await this.waitMessage("stop")).toString(16) );
		this.isRunning= false;
	}

	play() {
		this.isRunning= true;
		lastTime= 0;
		acc= 0;
		requestAnimationFrame((dt)=> this.loop(dt));
		this.sendMessage("run");
	}

	async step() {
		await this.waitMessage("step");
		this.video.update(this.gc);
	}

	async stepOut() {
		await this.waitMessage("stepOut");
		this.video.update(this.gc);
	}

	async stepOver() {
		await this.waitMessage("stepOver");
		this.video.update(this.gc);
	}

	handleEvent(e) {
		if(!e.isTrusted)
			return;

		switch(e.type) {
			case "keyup":
			case "keydown":
				// console.log(e);
				this.sendMessage(e.type, {key: e.key});
				break;
		}

	}

	async start() {

		const machine= document.getElementById("machine");
		[
			"keyup", "keydown",
		].forEach(type=> machine.addEventListener(type, this));

		this.sendMessage("reset");

		this.play();

	}

}
