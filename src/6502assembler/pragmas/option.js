import { ET_S, logError, logLine } from "../log.js";
import { nextSyms } from "../symbol.js";
import { encodeAscii } from "./string.js";

export function processOption(ctx, pragma) {
	ctx.pict+= 'OPT';

	if (ctx.sym.length < 2) {
		logError(ctx, ET_S, 'option expected');
		return false;
	}


	var opt=ctx.sym[1];
	ctx.pict+=' '+opt;
	if (opt=='ZPGA' || opt=='ZPA' || opt=='ZPG') {
		optAutoZpg=true;
		ctx.asm='-AUTO-ZPG ON';
	}
	else if (opt=='WORDA') {
		optAutoZpg=false;
		ctx.asm='-AUTO-ZPG OFF';
	}
	else if (opt=='PETSCII' || opt=='PETSCI') {
		ctx.charEncoding= encodePetscii;
		ctx.convertPi=true;
		ctx.asm='-ENC. PETSCII';
	}
	else if (opt=='ASCII') {
		ctx.charEncoding= encodeAscii;
		ctx.convertPi=false;
		ctx.asm='-ENC. ASCII';
	}
	else if (opt=='PETSCR' || opt=='C64SCR') {
		ctx.charEncoding= encodeCommodoreScreenCode;
		ctx.convertPi=true;
		ctx.asm='-ENC. '+opt;
	}
	else if (
	opt=='ILLEGALS' || opt=='NOILLEGALS' || opt=='NOILLEGA' ||
	opt=='LEGALS' || opt=='LEGALSONLY' || opt=='LEGALSON'
	) {
		useIllegals=opt=='ILLEGALS';
		instrtab = useIllegals? instrAll:instrLegals;
		ctx.asm='-ILLEGALS '+(useIllegals? 'ON':'OFF');
	}
	else if (opt=='REDEF' || opt=='NOREDEF') {
		redefSyms=opt=='REDEF';
		ctx.asm='-REDEF SYMBOLS '+(redefSyms? 'ON':'OFF');
	}
	else if (
	opt=='XREF' || opt=='NOXREF' ||
	opt=='COUNT' || opt=='NOCOUNT' ||
	opt=='CNT' || opt=='NOCNT' ||
	opt=='LIST' || opt=='NOLIST' ||
	opt=='MEMORY' || opt=='NOMEMORY' ||
	opt=='GENERATE' || opt=='NOGENERATE' || opt=='NOGENERA'
	) {
		// MOS cross-assembler directives
		ctx.asm='-IGNORED';
	}
	else {
		logError(ctx, ET_S, 'invalid option');
		return false;
	}
	if (ctx.sym.length > 2) {
		ctx.pict+=' '+ctx.sym[2].charAt(0);
		logError(ctx, ET_S, 'unexpected extra characters');
		return false;
	}
	logLine(ctx);

	nextSyms(ctx);
	return true;
}
