import speakerProcessorURL from "./speaker-processor.js?url";

// const duration= 0.1;
// let speakerStartTime= 0;

const SAMPLE_RATE = 22000; //44000;
const cycles_per_sample= 50;//(1023) * 1000 / SAMPLE_RATE;
const high = 0.5;
const low = -0.5;
const sample_size = 128;

export default class Sound {
	constructor(memory, vm) {
		this.memory= new Uint8Array(memory);
		this.vm= vm;

		this.audioContext= new AudioContext({sampleRate: SAMPLE_RATE});
		this.speaker= null;

		this.phase= false;
		this._sampleTime= 0;
		this._sample= new Array(sample_size);
		this._sampleIdx= 0;

		this.isActive= false;
	}

	async setup() {
		try {
			await this.audioContext.audioWorklet.addModule(speakerProcessorURL);
			this.speaker= new AudioWorkletNode(this.audioContext, "speaker-processor");
			this.speaker.connect(this.audioContext.destination);
		}
		catch(e) {
			console.error("Unable to start Sound Processor", e);
		}
	}

	async doTick(now) {

		if(this.audioContext.state !== "running")
			this.audioContext.resume();
		// console.log(now, this.audioContext.state);

		this.phase= !this.phase;
        const phase = this.isActive ? (this.phase ? high : low) : 0;

        for (; this._sampleTime < now; this._sampleTime += cycles_per_sample) {
            this._sample[this._sampleIdx++] = phase;
            if (this._sampleIdx === sample_size) {
				// console.log("OVERFLOW");
				if(this.audioContext.state === "running") {
					this.speaker.port.postMessage(this._sample);
				}
                this._sample = new Array(sample_size);
                this._sampleIdx = 0;
            }
        }

		this.isActive= false;

	}

	handleMessage(msg) {
		switch(msg.mode) {
			case "tick":
				this.isActive= true;
				this.doTick(msg.cycles);
				break;
		}
	}

}

