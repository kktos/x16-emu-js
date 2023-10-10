import machine from "./machines/apple2e-enhanced/machine.js";
import {hexbyte} from "./utils.js";
import VM from "./vm.js";

// import machine from "./machines/klaus-test-suite/machine.js";
// import machine from "./machines/apple2-plus/machine.js";

async function main() {
	const canvas= document.getElementById("screen");
	const vm= new VM(canvas, machine);
	await vm.setup();
	vm.start();

	window.R= async (bank, addr, isDebug) => {
		const rez= await vm.DBG_memRead(bank, addr, isDebug);
		console.log(hexbyte(rez));
	};
	window.W= async (bank, addr, value) => {
		await vm.DBG_memWrite(bank, addr, value);
	};
	window.S= async (from, to, value) => {
		await vm.DBG_memSearch(from, to, value);
	};
}


main();

const src=`
	.cpu "65c02"

	.macro log fmt, parm1
		.db $42,$FF
		.cstr fmt
		.db 1
		.dw parm1
	.end

	MON_CH		= $24
	BASL		= $28
	KSWL		= $38
	KSWH		= $39
	RNDL		= $4E
	RNDH		= $4F

	KBD 		= $C000
	KBDSTROBE	= $C010

	CMD 	= $C0B0
	VALUE 	= $C0B1
	ADDRH 	= $C0B2
	ADDRL 	= $C0B3
	COUT  	= $C0BF

	SET_CHAR_COLOR	= $01
	WRITE_CHAR 		= $02
	SET_MODE 		= $06
	SET_CURSOR 		= $07
	OUTPUT_STRING 	= $25

	.ORG $1000

	; sta $C051
	; sta $C001
	; sta $C00D
	; lda #80
	; sta $21

	; set videoMode = 0
	lda #SET_MODE
	sta CMD
	lda #0
	sta VALUE

	lda #<key_in
	sta KSWL
	lda #>key_in
	sta KSWH
	rts

key_in

		lda #SET_CURSOR
		sta CMD
		lda #1
		sta VALUE

		lda #$A0
		STA   (BASL),Y

KEYIN    INC   RNDL
         BNE   KEYIN2     ;INCR RND NUMBER
         INC   RNDH
KEYIN2   lda   KBD        ;KEY DOWN?
         BPL   KEYIN      ;  LOOP
         STA   (BASL),Y

		 log "A=%a",0

		 cmp #$88
		 bne key_in_exit

		 dec MON_CH
		 dey
		 lda #$A0
		 STA   (BASL),Y

key_in_exit
		lda #SET_CURSOR
		sta CMD
		lda #0
		sta VALUE

		LDA   KBD        ;GET KEYCODE
		BIT   KBDSTROBE    ;CLR KEY STROBE
		RTS

;	lda #SET_CURSOR
;	sta CMD
;	lda #1
;	sta VALUE

waitKey
	lda KBD
	bpl waitKey

;	lda #SET_CURSOR
;	sta CMD
;	lda #0
;	sta VALUE

	lda KBD
	sta KBDSTROBE
	rts

	; lda #WRITE_CHAR
	; sta CMD
	; lda #0
	; sta ADDRH
	; lda #0
	; sta ADDRL
	; lda #"X
	; sta VALUE

	; lda #WRITE_CHAR
	; sta CMD
	; lda #39
	; sta ADDRH
	; lda #0
	; sta ADDRL
	; lda #"X
	; sta VALUE

	; lda #WRITE_CHAR
	; sta CMD
	; lda #0
	; sta ADDRH
	; lda #24
	; sta ADDRL
	; lda #"X
	; sta VALUE

	; lda #WRITE_CHAR
	; sta CMD
	; lda #39
	; sta ADDRH
	; lda #24
	; sta ADDRL
	; lda #"X
	; sta VALUE

	jmp print_string

	ldx #0
loop

	lda #SET_CHAR_COLOR
	sta CMD
	lda color
	sta VALUE
	inc color

	lda text,x
	beq exit
	ora #$80
	sta COUT
	inx
	bne loop

print_string

	lda #SET_CHAR_COLOR
	sta CMD
	lda #$92
	sta VALUE

	lda #OUTPUT_STRING
	sta CMD
	lda #>ads
	sta ADDRH
	lda #<ads+1
	sta ADDRL
	lda ads
	sta VALUE

exit
	lda #SET_CHAR_COLOR
	sta CMD
	stz VALUE
	rts

color 	.db 00
text 	.cstr "THIS IS A TEST"
ads 	.pstr "GUINNESS IS GOOD FOR YOU"

`;
document.getElementById("editor").innerText= src;
