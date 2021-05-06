import InstructionGen from "./instructiongen.js";

export default class SplitInstruction {
	constructor(preamble, condition, is65c12) {
		this.preamble = preamble;
		this.condition = condition;
		this.ifTrue = new InstructionGen(is65c12);
		this.ifTrue.tick(preamble.cycle);
		this.ifFalse = new InstructionGen(is65c12);
		this.ifFalse.tick(preamble.cycle);
	}

	readOp(...args) {
		this.ifTrue.readOp.apply(this.ifTrue, args);
		this.ifFalse.readOp.apply(this.ifFalse, args);
	}

	append(...args) {
		this.ifTrue.append.apply(this.ifTrue, args);
		this.ifFalse.append.apply(this.ifFalse, args);
	}

	// ["append", "prepend", "readOp", "writeOp", "spuriousOp"].forEach((op) {
	// 	self[op] = function () {
	// 		self.ifTrue[op].apply(self.ifTrue, arguments);
	// 		self.ifFalse[op].apply(self.ifFalse, arguments);
	// 	};
	// });

	indent(a) {
		let result= [];
		a.forEach((x) => result.push("\t" + x));
		return result;
	}

	render() {
		return this.preamble.renderInternal()
			.concat(["if(" + this.condition + ") {"])
			.concat(this.indent(this.ifTrue.render(this.preamble.cycle)))
			.concat(["} else {"])
			.concat(this.indent(this.ifFalse.render(this.preamble.cycle)))
			.concat("}");
	};
}
