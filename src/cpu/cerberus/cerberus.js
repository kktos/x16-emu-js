import {m6502} from './m6502.js';
import {simpleRam8} from './memory.js';

function cerberus() {

	async function init() {
		this.memory = new simpleRam8(65536);
		this.cpu = new m6502();
		this.cpu.init(this.memory, '65c02');

		this.display_a = $('#reg_a');
		this.display_x = $('#reg_x');
		this.display_y = $('#reg_y');
		this.display_s = $('#reg_s');
		this.display_pc = $('#reg_pc');
		this.display_flags = $('#reg_flags');
		this.display_address = $('#reg_addr');
		this.display_data = $('#reg_data');
		this.display_read = $('#reg_read');
		this.display_sync = $('#reg_sync');
		this.current_instruction = $('#current_instruction');

		await this.reboot();
	}

	this.reboot = async function() {
		this.cpu.reset();
		for(var idx=0; idx<65536; idx++) {
			this.memory.write(idx, 0);
		}
		this.setMemory(0x0FFFA, 0xb0, 0xfc, 0x02, 0x02 ); // 6502 Interrupt and reset
		this.setMemory(0x0FCB0, 0x40); // 6502 NMI: RTI
		this.setMemory(0x00000, 0xc3, 0x02, 0x02 ); // Z80 Reset - JP 0x0202
		this.setMemory(0x00066, 0xED, 0x45 ); // Z80 NMI routine - RETN

		await this.loadMemUrl("js/emu/chardefs.bin", 0xf000 );
	}

	async function loadMemUrl(url, address, callback) {
		let blob = await fetch(url).then(r => r.blob());

		await blob.arrayBuffer().then( buffer => {
			let data = new Uint8Array(buffer);
			let pointer = address;
			for(var index=0; index<data.length; index++) {
				this.memory.write(address+index, data[index]);
			}
			if( callback ) {
				callback();
			}
		});
	}

	function showState() {
		showReg( this.display_a, this.cpu.a, this.memory.read(this.cpu.a) );
		showReg( this.display_x, this.cpu.x, this.memory.read(this.cpu.x) );
		showReg( this.display_y, this.cpu.y, this.memory.read(this.cpu.y) );
		showStack( this.display_s, this.cpu.s, this.memory.read(0x100+this.cpu.s), this.memory.read(0x100+this.cpu.s+1) );
		this.display_pc.children('.val:eq(0)').text( hexNum(this.cpu.pc, 4));
		this.display_pc.children('.val:eq(1)').text( hexNum(this.memory.read(this.cpu.pc), 2));

		this.display_flags.children('.val:eq(0)').text( flagsText(this.cpu.flags));
		this.display_flags.children('.val:eq(1)').text( binary(this.cpu.flags, 8));

		this.display_address.children('.val').text( hexNum(this.cpu.addressOut, 4) );

		this.display_data.children('.val:eq(0)').text( hexNum(this.memory.read(this.cpu.addressOut), 2) );
		this.display_data.children('.val:eq(1)').text( hexNum(this.memory.read(this.cpu.addressOut+1), 2) );
		showBytes(this.display_data, this.memory.read(this.cpu.addressOut), this.memory.read(this.cpu.addressOut+1));

		this.display_read.html(  this.cpu.read == 0 ? '<div class="val">Write</div><br/>': 'Read');
		this.display_sync.html(  this.cpu.sync == 0 ? `Tick <div class="val">${this.cpu.clock}</div><br/>`: 'Sync');

		this.current_instruction.text( this.cpu.getCurrentInstruction().toString(this.cpu.instructionAddress, this.memory) || '----' );
	}

	function hexNum(value, nibbles) {
		var str='0x';
		while(nibbles-->0) {
			str += (value >> (nibbles*4) &0x0F).toString(16);
		}
		return str;
	}

	function binary(value, bits) {
		var str = '';
		while(bits-->0) {
			str += (value>>bits) % 2;
			if(bits % 4 == 0 && bits != 0) str+=' ';
		}
		return str;
	}

	function toChar(value) {
		value &= 0xff;
		if(value < 32 || value> 128 ) return '.';

		return String.fromCharCode(value);
	}

	function flagsText(bitmask) {
		let idx = 8;
		let flags = 'czidbxvn';
		let str = '';
		while(idx-->0) {
			str += ((bitmask>>idx) & 0x01) == 0 ? flags.charAt(idx) : (flags.charAt(idx).toUpperCase());
			if(idx ==4) str+=' ';
		}
		return str;
	}

	function showReg(elem, data, zpg) {
		elem.children('.val:eq(0)').text( hexNum(data, 2));
		elem.children('.val:eq(1)').text( hexNum(zpg, 2));

		let hov = elem.children('ul');
		hov.children('li:eq(0)').text(`Decimal: ${data}   [${zpg}]`);
		hov.children('li:eq(1)').text(`Signed: ${data<<24>>24}   [${zpg<<24>>24}]`);
		hov.children('li:eq(2)').text(`Binary: ${binary(data, 8)}`);
		hov.children('li:eq(3)').text(`ASCII: ${toChar(data)}`);
	}

	function showStack(elem, data, byte1, byte2) {
		elem.children('.val:eq(0)').text( hexNum(data, 2));
		elem.children('.val:eq(1)').text( hexNum(byte1, 2)+","+hexNum(byte2, 2));
		showBytes(elem, byte1, byte2);
	}

	function showBytes(elem, byte1, byte2) {
		let hov = elem.children('ul');
		hov.children('li:eq(0)').text(`Decimal: [${byte1}, ${byte2}]`);
		hov.children('li:eq(1)').text(`Signed: [${byte1<<24>>24}, ${byte2<<24>>24}]`);
		hov.children('li:eq(2)').text(`Binary: [${binary(byte1, 8)},${binary(byte2, 8)}]`);
		hov.children('li:eq(3)').text(`ASCII: [${toChar(byte1)}${toChar(byte2)}]`);
	}

	function setMemory(address, ...data) {
		for(var index=0; index<data.length; index++) {
			this.memory.write(address+index, data[index]);
		}
	}

	function getMemory() {
		return this.memory.getArray();
	}

	this.loadMemUrl = loadMemUrl;
	this.setMemory = setMemory;
	this.getMemory = getMemory;
	this.showState = showState;

	this.init = init;
}

export function Display() {

	this.CHAR_WIDTH = 40;
	this.CHAR_HEIGHT = 30;

	this.CHAR_DEF_ADDRESS = 0x0F000;
	this.SCREEN_ADDRESS = 0x0F800;

	function init(elem, keyCallback) {
		this.cvs = document.createElement("canvas");
		this.cvs.width = this.CHAR_WIDTH * 8 * 2;
		this.cvs.height = this.CHAR_HEIGHT * 8 *2;
		this.cvs.setAttribute("tabindex", 1);
		elem.append(this.cvs);
		if( keyCallback ) {
			$(this.cvs).keypress(keyCallback);
		}
	}

	function focus() {
		this.cvs.focus();
	}

	function draw(memory, fps) {
		const ctx = this.cvs.getContext("2d");
		const width = this.cvs.width;

		if( !this.pixels ) {
			this.screen = ctx.getImageData(0,0, width, this.cvs.height);
			this.pixels = new Uint32Array(this.screen.data.buffer);
		}
		let address = this.SCREEN_ADDRESS;

		for( var line=0; line<this.CHAR_HEIGHT; line++ ) {
			for(var col=0; col<this.CHAR_WIDTH; col++) {
				let char = memory[address++];

				let charAddress = this.CHAR_DEF_ADDRESS+char*8;

				for( var row=0; row<8; row++ ) {
					let charByte = memory[charAddress++];
					let pixelAddress = (col*16)+(line*16+row*2)*width;

					for( var pix=7; pix>=0; pix-- ) {
						let color = ((charByte >> pix) & 0x01) == 0 ? 0xFF000000 : 0x0FFFFFFFF;

						this.pixels[pixelAddress] = color;
						this.pixels[pixelAddress+1] = color;
						pixelAddress+=width;
						this.pixels[pixelAddress] = color;
						this.pixels[pixelAddress+1] = color;
						pixelAddress+=2-width;
					}
				}
			}
		}
		ctx.putImageData(this.screen, 0, 0);
		if( fps ) {
			ctx.font = "25px Arial";
			ctx.fillStyle="red";
			ctx.fillText("FPS: "+fps, 60, 60);
		}
	}

	this.init = init;
	this.focus = focus;
	this.draw = draw;
}

var cerb = new cerberus();
await cerb.init();
var mem = cerb.getMemory();

bootCpu();

var refreshCallback;
var runState = false;

export function setCallback(callback) {
	refreshCallback = callback;
}

export function memoryArray() {
	return mem;
}

export function toggleInput(which) {
	switch(which) {
		case 'nmi' : cerb.cpu.setNmi( cerb.cpu.nmi ^ 0x01 ); break;
		case 'irq' : cerb.cpu.setIrq( cerb.cpu.irq ^ 0x01 ); break;
	}
	refresh();
}
export function loadMemUrl(url, address, callback) {
	cerb.loadMemUrl(url, address, function() {
		if( callback ) {
			callback();
		}
		refresh();
	});
}

var lastRefresh = 0;

export function refresh(timestamp) {
	if( !runState || timestamp == undefined ) {
		cerb.showState();
	}
	else if( timestamp ) {
		if( timestamp - lastRefresh > 250 ) {
			cerb.showState();
			lastRefresh = timestamp;
		}
	}

	if( refreshCallback ) {
		refreshCallback(cerb.cpu, runState, timestamp, errorMessage);
	}
}

var breakFunction;

export function runCpu(breakOption, breakValue) {
	runState = true;
	errorMessage = undefined;
	prevTimestamp = undefined;

	let breakNum = parseInt(breakValue, 16);

	switch(breakOption) {
		case "pc": breakFunction = new Function("cpu", `return (cpu.pc==${breakNum});`);   break;
		case "a" : breakFunction = new Function("cpu", `return (cpu.a==${breakNum});`);   break;
		case "x" : breakFunction = new Function("cpu", `return (cpu.x==${breakNum});`);   break;
		case "y" : breakFunction = new Function("cpu", `return (cpu.y==${breakNum});`);   break;
		default:
			breakFunction = undefined;
	}
	window.requestAnimationFrame(cpuLoop);
}

var prevTimestamp;
var errorMessage;

const CLOCKS_PER_MILLI = 4000;

function cpuLoop(timestamp) {
	let ticks = (timestamp - prevTimestamp) * CLOCKS_PER_MILLI;
	if( ticks > CLOCKS_PER_MILLI * 2000 ) {
		ticks = CLOCKS_PER_MILLI * 200;
	}

	try {
		while( ticks-->0 | cerb.cpu.sync == 0 ) {
			cerb.cpu.tick();
			if( breakFunction && cerb.cpu.sync && breakFunction(cerb.cpu) ) {
				runState = false;
				cerb.showState();
				break;
			}
		}
	}
	catch( err ) {
		runState = false;
		let inst = cerb.cpu.currentInstruction;
		errorMessage = "Run stopped on instruction "+ (inst? inst.toString(): 'UNKNOWN')+"  :"+err.message;
	}

	prevTimestamp = timestamp;
	refresh(timestamp);

	if( runState ) {
		window.requestAnimationFrame(cpuLoop);
	}
}

export function stopCpu() {
	runState = false;
}

export function stepCpu() {
	errorMessage = undefined;
	try {
		do {
			cerb.cpu.tick();
		} while(cerb.cpu.sync == 0);
	}
	catch( err ) {
		let inst = cerb.cpu.currentInstruction;
		errorMessage = "Stopped on instruction "+ (inst? inst.toString(): 'UNKNOWN')+"  :"+err.message;
	}
	refresh();
}

export function tickCpu() {
	errorMessage = undefined;
	try {
		cerb.cpu.tick();
	}
	catch( err ) {
		let inst = cerb.cpu.currentInstruction;
		errorMessage = "Stopped on instruction "+ (inst? inst.toString(): 'UNKNOWN')+"  :"+err.message;
	}
	refresh();
}

export function resetCpu() {
	cerb.cpu.reset();
	refresh();
}

export async function bootCpu() {
	await cerb.reboot();
	for( var i=0; i<1200; i++ ) {
		cerb.setMemory(0x0f800+i, (i%256));
	}
	refresh();
}

export function disassemble(address, bytes) {
	return cerb.cpu.disassemble(address, bytes);
}
