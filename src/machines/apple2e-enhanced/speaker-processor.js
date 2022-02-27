export class SpeakerAudioProcessor extends AudioWorkletProcessor {
    // private samples: Float32Array[] = [];
    samples= [];

    constructor() {
        super();
        console.info('SpeakerAudioProcessor created');
        // this.port.onmessage = (ev: MessageEvent) => {
        this.port.onmessage = (ev) => {
            this.samples.push(ev.data);
            if (this.samples.length > 256) {
                this.samples.shift();
            }
        };
    }

    static get parameterDescriptors() {
        return [];
    }

    // process(_inputList: Float32Array[][], outputList: Float32Array[][], _parameters: Map<string, Float32Array>) {
    process(_inputList, outputList, _parameters) {
        const sample = this.samples.shift();
        const output = outputList[0];
        if (sample) {
            for (let idx = 0; idx < sample.length; idx++) {
                output[0][idx] = sample[idx];
            }
        }

        // Keep alive indefinitely.
        return true;
    }
}

registerProcessor("speaker-processor", SpeakerAudioProcessor);




// // white-noise-processor.js
// class WhiteNoiseProcessor extends AudioWorkletProcessor {

// 	process (inputs, outputs, parameters) {
// 		//console.log(outputs);
// 	  const output = outputs[0];
// 	  output.forEach(channel => {
// 		for (let i = 0; i < channel.length; i++) {
// 		//   channel[i] = Math.random() * 2 - 1;
// 		  channel[i] = Math.random() * 2 > 1 ? 0.5 : -0.5;
// 		}
// 	  })
// 	  return true;
// 	}

//   }

//   registerProcessor('white-noise-processor', WhiteNoiseProcessor);
