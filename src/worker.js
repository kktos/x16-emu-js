import Bus from "./cpu/bus.js";

let bus;

function init(gc) {
	bus= new Bus(gc);
}
onmessage= (evt) => {
	console.log("worker.onmessage", evt);

	if(!evt.data || !evt.data.type)
		return;

	switch(evt.data.type) {
		case "buffer":
			console.log("set buffer");
			break;
	}

}
