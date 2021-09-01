import { hexWord } from "./utils.mjs";
import { parseSource } from "./parser.mjs";
import { run } from "./vm.mjs";
import { ERRORS, vars } from "./defs.mjs";

const src= `
100 let x%=0
140 for x%=0 to 10
150 print x%;
160 next x%
`;
/*
140 for x%=0 to 10 step 1
150 print x%;
160 next x

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

const prg= parseSource(src);
if(!prg)
	process.exit();

const err= run(prg);
if(err) {
	const idx= Object.values(ERRORS).indexOf(err);
	console.error(`ERR ${hexWord(err)} - ${Object.keys(ERRORS)[idx]}`, prg.lineNum );
}

console.log("");
console.log("----------- VARS");
console.log("");
console.log(vars);
