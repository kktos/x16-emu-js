import Bus from "./cpu/cerberus/bus.js";
import {m6502} from './cpu/cerberus/m6502.js';


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
	self.cpu= new m6502();
	self.cpu.init(self.bus, '65c02');
}

function loop(dt= 0) {

	self.cpu.tick();

	setTimeout(loop, 1000*FPS);

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
