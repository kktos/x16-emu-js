
export default async function processHooks(vm, cpu) {

	let wannaKeepItRunning= true;

	switch(cpu.PC) {

		case 0xC600: {
			if(vm.diskImages[0])
				readSector(vm, vm.diskImages[0], 0, 0, 0x800, true);

			await vm.waitMessage("register", {PC: 0x801});
			// slot 6 * 16
			await vm.memWriteBin(0, 0x2B, [0x60]);
			// PT2BTBUFHI 8+1=9 as inc after $800 was just loaded
			await vm.memWriteBin(0, 0x27, [0x09]);

			break;
		}

		case 0xC65C: {
			const bytes= await vm.waitMessage("memReadBytes", {addr: 0x26, end: 0x41});

			const BOOTSEC= bytes[0x3D-0x26]; //0x3D
			const BOOTRK= bytes[0x41-0x26]; //0x41
			const PT2BTBUF= bytes[0x26-0x26] + bytes[0x27-0x26]*256; /*0x26 0x27*/

			if(vm.diskImages[0])
				readSector(vm, vm.diskImages[0], BOOTRK, BOOTSEC, PT2BTBUF, true);

			await vm.waitMessage("register", {PC: 0x801});

			break;
		}

		case 0xBD00: {
			const iobAddr= 256*cpu.A + (1*cpu.Y);
			const bytes= await vm.waitMessage("memReadBytes", {addr: iobAddr, count: 16});

			const track= bytes[0x04];
			const sector= bytes[0x05];
			const buffer= bytes[0x08] + bytes[0x09]*256;

			console.log("RWTS", {
				A:cpu.A.toString(16),
				Y:cpu.Y.toString(16),
				bytes: bytes.reduce((acc, curr)=> acc+curr.toString(16)+" ", ""),
			});

			if(buffer && vm.diskImages[0])
				readSector(vm, vm.diskImages[0], track, sector, buffer, false);

			// need to CLC
			// need to return where we came
			await vm.waitMessage("register", {c: 0, meta:{RTS:1}});

			break;
		}

		default:
			wannaKeepItRunning= false;
			break;
	}

	return wannaKeepItRunning;
}

// 00 	   01    02    03    04    05    06    07    08    09    0a    0b    0c    0d    0e     0f
// 00 	   0d    0b    09    07    05    03    01    0e    0c    0a    08    06    04    02     0f
const deInterleave= [0x00, 0x07, 0x0e, 0x06, 0x0d, 0x05, 0x0c, 0x04, 0x0b, 0x03, 0x0a, 0x02, 0x09, 0x01, 0x08, 0x0f];

async function readSector(vm, disk, track, sector, addr, isInterleaved) {
	isInterleaved && (sector= deInterleave[sector]);
	const offset= track*0x1000 + sector*0x100;
	const data= disk.slice(offset, offset + 0x0100 );
	await vm.memWriteBin(0, addr, data);

	const ts= `T${track.toString(16)}:S${sector.toString(16)}`;
	console.clog("disk", `DISK READ ${ts}[$${offset.toString(16)}] to $${addr.toString(16)}`);
}
