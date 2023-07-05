import { dumpArrays } from "./arrays.mjs";
import { ERRORS } from "./defs.mjs";
import { list } from "./list.mjs";
import { parseSource } from "./parser.mjs";
import { dumpStrings } from "./strings.mjs";
import { EnumToName, hexWord } from "./utils.mjs";
import { dumpVars } from "./vars.mjs";
import { run } from "./vm.mjs";


const src= `
10 dim a$(10)
20 let tmp$="toto"
30 let a$(i%)= tmp$
`;
/*
10 dim a$(10)
20 for i%=0 to 9
25 let tmp$= chr$(65+i%)
30 let a$(i%)= tmp$
31 let tmp$="prout"
35 print a$(i%)
40 next i%

110 	let $this = 0

1 rem this is a test
5 let parm_1= 50.1
6 print "parm_1 = ";parm_1
7 end
10 for i%=0 to 9
40     print test(i%)
50 next i%
55 let parm_1= 60
99 end
100 function test($parm_1: float)
150     let test= $parm_1 * 2
200     return $parm_1 * 2
300 end function

10 print peek%(36)
20 end
30 function peek
40 asm {
	lda $20
	pha
	lda $21
	pha
	jsr getparm
	sta $20
	stx $21
	ldy #0
	lda ($21),y
	tax
	lda ($20),y
	jsr setreturn
}
50 end function

10 dim a$(10)
20 for i%=0 to 9
25 let tmp$= chr$(65+i%)
30 let a$(i%)= tmp$
31 let tmp$="prout"
35 print a$(i%)
40 next i%

140 dim tab%(10)
150 print tab%[5]

30 rem
40 print (), test()
50 end
100 function test
200 return 3
300 end function

10 let N$= "john"
20 let count%=3
30 PRINT count%, "Your name is ";CHR$(34);N$;CHR$(34)
40 let count%=count%-1
50 if count% > 0 then 30

140 for x%=0 to 9
150 print chr$( 48 + x% )
160 next x%

140 for x%=0 to 10 step 1
150 print x%;
160 next x
110 REM VERSION 1.0
100 REM GUESSING GAME
100 REM A GUESSING GAME
120 PRINT "GUESS THE NUMBER BETWEEN 1 AND 100."
10 REM first lexer.buffer
160 PRINT "YOUR GUESS";
170 INPUT G
210 PRINT "TOO LARGE, GUESS AGAIN"
220 GOTO 160
190 IF G = X THEN 300

150 LET N = 0
160 PRINT "YOUR GUESS";
170 INPUT G
180 LET N = N+1
190 IF G = X THEN 300
200 IF G < X THEN 250
210 PRINT "TOO LARGE, GUESS AGAIN"
220 GOTO 160
230
250 PRINT "TOO SMALL, GUESS AGAIN"
260 GOTO 160
270
300 PRINT "YOU GUESSED IT, IN"; N; "TRIES"
310 PRINT "ANOTHER GAME (YES = 1, NO = 0)";
320 INPUT A
330 IF A = 1 THEN 140
340 PRINT "THANKS FOR PLAYING"
350 END
 */

const argv = process.argv.slice(2);
const args= {};
argv.forEach(arg => {
	const [key, value]= arg.split(/\s*=\s*/);
	args[key]= (value ?? 1)*1;
});

const prg= parseSource(src, args["parser"]);
if(prg.err) {
	console.error(`ERR ${hexWord(prg.err)} - ${EnumToName(ERRORS, prg.err)}`, prg.lineNum );
	console.log(prg.lines);
	dump();
	process.exit();
}

if(args["run"]) {
	console.log("************************************");
	console.log("*             RUN                  *");
	console.log("************************************");

	const err= run(prg);
	if(err) {
		console.error(`ERR ${hexWord(err)} - ${EnumToName(ERRORS, err)}`, prg.lineNum );
	}
}


if(args["dump"])
	dump();

if(args["list"]) {
	console.log("************************************");
	console.log("*             LIST                 *");
	console.log("************************************");

	list();
}

function dump() {
	console.log("");
	console.log("----------- VARS");
	console.log("");
	dumpVars();
	console.log("");
	console.log("----------- ARRAYS");
	console.log("");
	dumpArrays();
	console.log("");
	console.log("----------- STRINGS");
	console.log("");
	dumpStrings();
}

