
export default class Disk {

	constructor(vm) {
		console.log("new Disk");
	}


	setImage(diskID, imgData) {
	}

	async handleMessage(msg) {
	}

	async read_file(diskID, {filename}) {
	}

	async read(diskID, {track, sector, addr, length}) {
	}

	async readSector(diskID, track, sector, addr, isInterleaved) {
	}

}
