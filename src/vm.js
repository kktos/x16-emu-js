import MyWorker from "./cpu/controller.js?worker";
import Debugger from "./debugger/debugger.js";
import ENV from "./env.js";
import KeyMap from "./keymap.js";

let lastTime;
let acc;
const inc= ENV.FPS;
let msgcounter= 0;
const speeds= [0,0];
let speedIdx= 0;

const OneMHz= 1_000_000 * ENV.FPS | 0;
export default class VM {

	constructor(canvas, machine) {
		this.machine= machine;
		this.canvas= canvas;
		this.isRunning= true;

		// this.diskImages= [];

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
		this.cpuWorker.addEventListener('message', (e) => this.handleMessage(e), false);

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

		this.disk= new machine.Disk(this);

		this.canvas.width= this.video.width;
		this.canvas.height= this.video.height;
		this.gc.viewport.ctx.imageSmoothingEnabled = false; // magic!
		this.gc.viewport.ctx.msImageSmoothingEnabled = false; // magic!

		window.VM= this;
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
		// this.sendMessage("addHook", {bank:1, addr: 0xCABA});

	}

	setupMemoryMap() {
		this.machine.memory.map.forEach(({bank, addr, data, type}) => {
			this.memWriteHexa(bank, addr, data, type);
		});
	}

	memWriteHexa(bank, addr, hexString, type) {
		this.sendMessage("memWriteHexa", {
			bank,
			addr,
			hexString,
			type
		});
	}

	memWriteBin(bank, addr, values) {
		return this.waitMessage("memWriteBin", {
			bank,
			addr,
			values
		});
	}

	DBG_memRead(bank, addr, isDebug) {
		return this.waitMessage((isDebug ? "dbgReadBytes" : "memReadBytes"), {
			bank,
			addr,
			count: 1
		});
	}
	DBG_memWrite(bank, addr, value) {
		return this.waitMessage("memWrite", {
			bank,
			addr,
			value
		});
	}
	DBG_memSearch(from, to, value) {
		return this.waitMessage("memSearch", {
			from,
			to,
			value
		});
	}

	setDisk(diskID, imgData) {
		this.disk.setImage(diskID, imgData);
		// this.diskImages[diskID]= imgData;
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

	async handleMessage(evt) {
		const msg= evt.data;
		const sender= evt.ports[0];

		// sender && console.log("VM.handleMessage", msg, sender);

		switch(msg.cmd) {
			case "clog":
				console.clog(msg.data.color, "### WORKER", msg.data);
				break;
			case "log":
				console.log("### WORKER", msg.data);
				break;
			case "video":
				this.video.handleMessage(sender, msg.data);
				break;
			case "sound":
				this.sound.handleMessage(msg.data);
				break;
			case "disk":
				this.disk.handleMessage(msg.data).then(()=> {
					this.sendMessage("memWrite", {
						addr: 0xC0FF,
						value: 1
					});
				});

				// this.disk.read(0, msg.data).then(()=> {
				// 	this.sendMessage("memWrite", {
				// 		addr: 0xC0FF,
				// 		value: 1
				// 	});
				// });
				break;
			case "stopped":
				console.log("STOPPED", msg.PC.toString(16), msg.op);
				this.debugger.pause();
				break;

			case "hooked": {
				const res= await this.machine.hooks?.(this, msg.data);
				if(res.wannaKeepItRunning) {
					setTimeout( () => this.sendMessage(msg.data.caller, res.data), 0);
				} else {
					this.debugger.pause();
					this.debugger.update();
				}
				break;
			}
		}
	}

	waitMessage(cmd, data= null) {
		const msgID= msgcounter++;
		return new Promise(resolve => {
			const {port1, port2}= new MessageChannel();
			port1.onmessage= ({data:{cmd, id, data}}) => {
				// console.error("waitMessage", cmd, id, data);
				resolve(data);
			};

			// console.log("waitMessage", cmd, msgID, data);

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

	step() {
		return this.waitMessage("step").then(()=>{
			setTimeout(()=>this.video.update(this.gc),0);
		});
	}

	stepOut() {
		return this.waitMessage("stepOut").then(()=>{
			setTimeout(()=>this.video.update(this.gc),0);
		});
	}

	stepOver() {
		return this.waitMessage("stepOver").then(()=>{
			setTimeout(()=>this.video.update(this.gc),0);
		});
	}

	async reset() {
		await this.waitMessage("reset");
		// this.video.update(this.gc);
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
