
// 00 	   01    02    03    04    05    06    07    08    09    0a    0b    0c    0d    0e     0f
// 00 	   0d    0b    09    07    05    03    01    0e    0c    0a    08    06    04    02     0f
const deInterleave= [0x00, 0x07, 0x0e, 0x06, 0x0d, 0x05, 0x0c, 0x04, 0x0b, 0x03, 0x0a, 0x02, 0x09, 0x01, 0x08, 0x0f];

function h(num, len=8) {
	return num.toString(16).padStart(len,"0").toUpperCase();
}

export default class Disk {

	constructor(vm) {
		this.vm= vm;
		this.diskImages= [];
		this.dir= null;
	}

	setImage(diskID, imgData) {
		this.diskImages[diskID]= imgData;
		const diskTag= new TextDecoder().decode(imgData.slice(-4));
		if(diskTag == "DISK") {
			const dirOffset = new DataView(imgData.slice(-8, -4).buffer).getUint32(0);
			const dirBuffer= imgData.slice(dirOffset);
			const dirView= new DataView(imgData.slice(dirOffset).buffer);

			this.dir= {};

			const dirEndOffset= dirBuffer.length-8;
			let offset= 0;
			let idx= 0;
			while(offset < dirEndOffset) {
				let recordOffset= offset;
				const recordlen= dirView.getUint8(recordOffset++);
				const strlen= dirView.getUint8(recordOffset++);
				const name= new TextDecoder().decode(dirBuffer.slice(recordOffset, recordOffset+strlen));
				recordOffset+= strlen;
				const dataOffset= dirView.getUint32(recordOffset);
				recordOffset+= 4;
				const dataLen= dirView.getUint32(recordOffset);
				recordOffset+= 4;
				const dataAddr= dirView.getUint32(recordOffset);
				recordOffset+= 4;

				// console.log(h(dataOffset), h(dataLen), h(dataAddr), name );
				this.dir[name]= {offset: dataOffset, len: dataLen, org: dataAddr };
				offset+= recordlen;

				// safeguard
				if(idx++>100)
					break;
			}

			console.log(this.dir);
		}
	}

	async handleMessage(msg) {
		switch(msg.cmd) {
			case "read":
				return this.read(msg.diskID, msg);
			case "read_file":
				return this.read_file(msg.diskID, msg);
		}
	}

	async read_file(diskID, {filename}) {
		if(!this.diskImages[diskID]) {
			console.error(`read_file: unknown disk ID ${diskID}`);
			return;
		}

		const file= this.dir[filename.toUpperCase()];
		if(!file) {
			console.error(`read_file: unknown file "${filename}"`);
			return;
		}

		console.log("disk", `READ_FILE ${filename} ${h(file.offset)}.${h(file.len)} @${h(file.org)}`);

		const data= this.diskImages[diskID].slice(file.offset, file.offset + file.len );
		return this.vm.memWriteBin(0, file.org, data);
	}

	async read(diskID, {track, sector, addr, length}) {
		if(!this.diskImages[diskID])
			return;

		const offset= track*0x1000 + sector*0x100;
		const data= this.diskImages[diskID].slice(offset, offset + length );
		await this.vm.memWriteBin(0, addr, data);

		const ts= `T${track.toString(16)}:S${sector.toString(16)}`;
		// console.clog("disk", `READ ${ts}[$${offset.toString(16)}] to $${addr.toString(16)}:$${(addr+length).toString(16)}`);
		console.log("disk", `READ ${ts}[$${offset.toString(16)}] to $${addr.toString(16)}:$${(addr+length).toString(16)}`);

	}

	async readSector(diskID, track, sector, addr, isInterleaved) {
		if(!this.diskImages[diskID])
			return;

		isInterleaved && (sector= deInterleave[sector]);
		const offset= track*0x1000 + sector*0x100;
		const data= this.diskImages[diskID].slice(offset, offset + 0x0100 );
		await this.vm.memWriteBin(0, addr, data);

		const ts= `T${track.toString(16)}:S${sector.toString(16)}`;
		// console.clog("disk", `READSECTOR ${ts}[$${offset.toString(16)}] to $${addr.toString(16)}`);
		console.log("disk", `READSECTOR ${ts}[$${offset.toString(16)}] to $${addr.toString(16)}`);
	}

}
