import Bus from "./cpu/cerberus/bus.js";
import CPU6502 from "./cpu/torlus/cpu.js";

let lastTime= 0;
let acc= 0;
let inc= 1/30;
let loopCount= 0;

const FPS= 1 / 30;
const OneMHz= 1_000_000 * FPS | 0;

self.bus= null;
self.cpu= null;
self.isRunning= true;
self.cyclesPerFrame= OneMHz;

function init(gc, buffer) {
	self.bus= new Bus(gc, buffer);
	self.cpu= new CPU6502();

	cpu.read= function(addr) {
		return self.bus.read(addr);
	}
	cpu.write= function(addr, value) {
		self.bus.write(addr, value);
	}
}

function loop(dt= 0) {
	// const start= Date.now();

	self.cpu.cycles= 0;
	while(cpu.cycles < self.cyclesPerFrame) {
		self.cpu.step();
	}

	setTimeout(loop, 1000*FPS);

	// const timeSpent= Date.now() - start;
	// const cyclesPerMs= 1/(timeSpent/cpu.cycles);
	// const cyclesPerS= Math.round(cyclesPerMs*1000);
	// const mhz= Math.round(cyclesPerMs/1000, 2);

	// console.log(cpu.cycles, timeSpent, cyclesPerS, mhz);
	// document.body.innerHTML="ran <b>"+cpu.cycles+"</b> cycles<br>";
	// document.body.innerHTML+="took <b>"+timeSpent+"</b> miliseconds<br>";
	// document.body.innerHTML+="<b>"+cyclesPerS+"</b> cycles per second or <b>"+mhz+"</b>Mhz<br>";

}

function setSpeed(speed) {
	self.cyclesPerFrame= OneMHz * speed;
	console.log("setSpeed", speed, self.cyclesPerFrame);
}

onmessage= (evt) => {

	if(!evt.data || !evt.data.type)
		return;

	console.log("worker.onmessage", evt.data.type);

	switch(evt.data.type) {
		case "init":
			init(evt.data.gc, evt.data.buffer);
			break;

		case "reset":
			self.cpu.reset(true);
			break;

		case "memWrite":
			self.bus.writeHexa(evt.data.addr, evt.data.value);
			break;

		case "start":
			loop();
			break;

		case "setSpeed":
			setSpeed(evt.data.speed);
			break;

		case "keydown":
		case "keyup":
			self.bus.keys.set(evt.data.key, evt.data.type == "keydown");
			break;
	}

}
