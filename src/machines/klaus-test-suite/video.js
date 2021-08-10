
export default class Video {
	constructor(memory, vm) {
		this.memory= new Uint8Array(memory);
		this.vm= vm;
		this.state= { PC:0 }
	}

	get width() {
		return 40*15+20;
	}

	get height() {
		return 24*22+20;
	}

	hexword(data) {
		return data.toString(16).toUpperCase().padStart(4, '0');
	}
	hexbyte(data) {
		return data.toString(16).toUpperCase().padStart(2, '0');
	}

	update({tick, viewport:{ctx, canvas}}, cycles) {
		ctx.fillStyle="black";
		ctx.fillRect(0,0,canvas.width,canvas.height);

		if(tick%30 == 0)
			this.vm.getCPUstate()
				.then(state => this.state= state);

		ctx.fillStyle="#FFFFFF";
		ctx.font = '12px monospace';

		ctx.fillText(`PC: ${this.state.PC.toString(16)}`, 10, 300);

		let y= 400;
		let x= 10
		let addr= 0;
		for(let line= 0; line<6; line++) {
			ctx.fillText(this.hexword(addr)+":", x, y+(16*line));
			for(let column= 0; column<30; column++) {
				addr+= column;
				ctx.fillText(this.hexbyte(this.memory[addr]), x+40+(15*column), y+(16*line));
			}
		}

	}

}
