export default class KeyMap {
	constructor() {
		this.map= new Map();
	}

	get(key) {
		if(!this.map.has(key))
			this.map.set(key, false);
		const state= this.map.get(key);
		if(state)
			this.map.set(key, false);
		return state;
	}

	set(key, pressed) {
		this.map.set(key, pressed);
	}
	
	isPressed(key) {
		return this.get(key) == true;
	}
}