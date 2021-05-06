import SplitInstruction from "./splitinstruction.js";

export default class InstructionGen {

	constructor(is65c12) {
		this.is65c12= is65c12;
		this.ops= {};
		this.cycle= 0;
	}

	appendOrPrepend(combiner, cycle, op, exact, addr) {
		if (op === undefined) {
			op = cycle;
			cycle = this.cycle;
		}
		exact = exact || false;
		if (typeof op === "string") op = [op];
		if (this.ops[cycle]) {
			this.ops[cycle].op = combiner(this.ops[cycle].op, op);
			if (exact) this.ops[cycle].exact = true;
			if (!this.ops[cycle].addr) this.ops[cycle].addr = addr;
		} else
			this.ops[cycle] = {op: op, exact: exact, addr: addr};
	}

	append(cycle, op, exact, addr) {
		this.appendOrPrepend(function (lhs, rhs) {
			return lhs.concat(rhs);
		}, cycle, op, exact, addr);
	}

	prepend(cycle, op, exact, addr) {
		this.appendOrPrepend(function (lhs, rhs) {
			return rhs.concat(lhs);
		}, cycle, op, exact, addr);
	}

	tick(cycles) {
		this.cycle += (cycles || 1);
	}

	readOp(addr, reg, spurious) {
		this.cycle++;
		let op;
		if (reg)
			op = reg + " = this.cpu.bus.cpuRead(" + addr + ");";
		else
			op = "this.cpu.bus.cpuRead(" + addr + ");";
		if (spurious) op += " // spurious";
		this.append(this.cycle, op, true, addr);
	}

	writeOp(addr, reg, spurious) {
		this.cycle++;
		let op = "this.cpu.bus.cpuWrite(" + addr + ", " + reg + ");";
		if (spurious) op += " // spurious";
		this.append(this.cycle, op, true, addr);
	}

	zpReadOp(addr, reg) {
		this.cycle++;
		this.append(this.cycle, reg + " = this.cpu.bus.cpuRead(" + addr + ");", false);
	}

	zpWriteOp(addr, reg) {
		this.cycle++;
		this.append(this.cycle, "this.cpu.bus.cpuWrite(" + addr + ", " + reg + ");", true);
	}

	render(startCycle) {
		if (this.cycle < 2) this.cycle = 2;
		this.prepend(this.cycle - 1, "this.cpu.checkInt();", true);
		return this.renderInternal(startCycle);
	}

	spuriousOp(addr, reg) {
		if (this.is65c12) {
			this.readOp(addr, reg, true);
		} else {
			this.writeOp(addr, reg, true);
		}
	}

	renderInternal(startCycle) {
		startCycle = startCycle || 0;
		let i;
		let toSkip = 0;
		let out = [];
		for (i = startCycle; i < this.cycle; ++i) {
			if (!this.ops[i]) {
				toSkip++;
				continue;
			}
			if (toSkip && this.ops[i].exact) {
				if (this.ops[i].addr) {
					out.push("this.cpu.polltimeAddr(" + toSkip + ", " + this.ops[i].addr + ");");
				} else {
					out.push("this.cpu.polltime(" + toSkip + ");");
				}
				toSkip = 0;
			}
			out = out.concat(this.ops[i].op);
			toSkip++;
		}
		if (toSkip) {
			if (this.ops[this.cycle] && this.ops[this.cycle].addr) {
				out.push("this.cpu.polltimeAddr(" + toSkip + ", " + this.ops[this.cycle].addr + ");");
			} else {
				out.push("this.cpu.polltime(" + toSkip + ");");
			}
		}
		if (this.ops[this.cycle]) out = out.concat(this.ops[this.cycle].op);
		return out.filter(function (l) {
			return l;
		});
	}

	split(condition) {
		return new SplitInstruction(this, condition, this.is65c12);
	}
}
