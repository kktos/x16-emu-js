import Core6502 from "./core6502";

export default class Cpu6502 extends Core6502 {

	constructor(model, bus) {
		super(model, bus);

		this.targetCycles= 0;
		this.currentCycles= 0;
		this.cycleSeconds= 0;
		this.resetLine= true;
	}

	reset(hard) {
		super.reset(hard);

		if (hard) {
			this.targetCycles = 0;
			this.currentCycles = 0;
			this.cycleSeconds = 0;
		}
		this.halted = false;
	}


	execute(numCyclesToRun) {
		this.halted = false;
		this.targetCycles += numCyclesToRun;
		// To prevent issues with wrapping around / overflowing the accuracy that poxy Javascript numbers have,
		// find the smaller of the target and current cycles, and if that's over one second's worth; subtract
		// that from both, to keep the domain low (while accumulating seconds). Take care to preserve the bottom
		// bit though; as that encodes whether we're on an even or odd bus cycle.
		const smaller = Math.min(this.targetCycles, this.currentCycles) & 0xfffffffe;
		if (smaller >= 2 * 1000 * 1000) {
			this.targetCycles -= 2 * 1000 * 1000;
			this.currentCycles -= 2 * 1000 * 1000;
			this.cycleSeconds++;
		}
		// Any tracing or debugging means we need to run the potentially slower version: the debug read or
		// debug write might change tracing or other debugging while we're running.
		// if (this.forceTracing || this._debugInstruction || this._debugRead || this._debugWrite) {
			return this.executeInternal();
		// } else {
		// 	return this.executeInternalFast();
		// }
	};
	executeInternal() {
		let first = true;
		while (!this.halted && this.currentCycles < this.targetCycles) {
			// this.oldPcIndex = (this.oldPcIndex + 1) & 0xff;
			// this.oldPcArray[this.oldPcIndex] = this.pc;
			// this.memStatOffset = this.memStatOffsetByIFetchBank[this.pc >>> 12];
			const opcode = this.bus.cpuRead(this.pc);
			if (this._debugInstruction /*&& !first*/ && this._debugInstruction(this.pc, opcode)) {
				return false;
			}
			first = false;
			this.incpc();
			this.runner.run(opcode);
			// this.oldAArray[this.oldPcIndex] = this.a;
			// this.oldXArray[this.oldPcIndex] = this.x;
			// this.oldYArray[this.oldPcIndex] = this.y;
			if (this.takeInt) this.brk(true);
			if (!this.resetLine) this.reset(false);
		}
		return !this.halted;
	};
	executeInternalFast() {
		while (!this.halted && this.currentCycles < this.targetCycles) {
			// this.memStatOffset = this.memStatOffsetByIFetchBank[this.pc >>> 12];
			const opcode = this.bus.cpuRead(this.pc);
			this.incpc();
			this.runner.run(opcode);
			if (this.takeInt) this.brk(true);
			if (!this.resetLine) this.reset(false);
		}
		return !this.halted;
	};

}