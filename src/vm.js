import MyWorker from "./cpu/controller.js?worker";
import Debugger from "./debugger/debugger.js";
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

		this.diskImages= [];

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

		this.sendMessage("addHook", {bank:0, addr: 0xC600});
		this.sendMessage("addHook", {bank:0, addr: 0xC65C});
		this.sendMessage("addHook", {bank:0, addr: 0xBD00});

	}

	setupMemoryMap() {
		this.machine.memory.map.forEach(({bank, addr, data}) => {
			this.memWriteHexa(bank, addr, data);
		});
	}

	memWriteHexa(bank, addr, hexString) {
		this.sendMessage("memWriteHexa", {
			bank,
			addr,
			hexString
		});
	}

	memWriteBin(bank, addr, values) {
		return this.waitMessage("memWriteBin", {
			bank,
			addr,
			values
		});
	}

	setDisk(diskID, imgData) {
		this.diskImages[diskID]= imgData;
		// console.log("setDisk",{diskID, imgData});
	}

	// async memRead(addr) {
	// 	const byte= await this.waitMessage("memReadByte", {addr});
	// 	return byte;
	// }

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
			this.video.update(this.gc, !this.isRunning);
			this.gc.tick++;
			this.sound.doTick( await this.waitMessage("cycles") );
			acc-= inc;
		}
		lastTime= dt;

		requestAnimationFrame((dt)=> this.loop(dt));

		if(this.isRunning) {
			this.waitMessage("mhz").then(data=>{
				speedIdx= speedIdx+1 % speeds.length;
				speeds[speedIdx]= data/1_000;
				const avg= speeds.reduce((acc, cur)=>acc+cur, 0) / speeds.length;
				this.gc.mhz= Math.round((avg + Number.EPSILON) * 100) / 100
			});
		}

	}

	async handleMessage(msg) {
		// console.log("handleMessage", msg);

		switch(msg.cmd) {
			case "clog":
				console.clog(msg.data.color, "### WORKER", msg.data);
				break;
			case "log":
				console.log("### WORKER", msg.data);
				break;
			case "video":
				this.video.handleMessage(msg.data);
				break;
			case "sound":
				this.sound.handleMessage(msg.data);
				break;
			case "stopped":
				// console.log("STOPPED", msg.PC.toString(16));
				this.debugger.pause();
				break;

			case "hooked":
				if(this.machine.hooks?.(this, msg.data)) {
					setTimeout( () => this.sendMessage(msg.data.caller), 0);
				} else {
					this.debugger.pause();
					this.debugger.update();
				}
				break;
		}
	}

	waitMessage(cmd, data= null) {
		const msgID= msgcounter++;
		return new Promise(resolve => {
			const {port1, port2}= new MessageChannel();
			port1.onmessage= ({data:{cmd, id, data}}) => {
				resolve(data);
			};
			this.cpuWorker.postMessage({cmd, id: msgID, data}, [port2]);
		});
	}

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
		this.sendMessage("register", {[register]: value});
	}

	updateVideo() {
		this.video.update(this.gc);
	}

	async pause() {
		await this.waitMessage("stop");
		// console.log( "stopped at", (await this.waitMessage("stop")).toString(16) );
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

		await this.waitMessage("reset");

		this.debugger.setupUI();
		this.debugger.pause();

		// this.play();

	}

}
