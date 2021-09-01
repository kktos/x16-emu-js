;
; source: http://c64os.com/post/baseconversion
;

	.setcpu 65c02
	.org $1000

base         = 10  ;String is in base 10
petoffset    = $30 ;Petscii numbers offset

multA   = $4e ;78
multB = $50 ;80
product      = $52 ;82


	LDA #<base
	STA multB
	LDA #>base
	STA multB+1

	;Initialize multiplier, the running total, to zero

	LDX #0
	STX multA
	STX multA+1

loop:
	LDA str,x
	BEQ done ;If it loads the null terminator, it's done.
	INX

	PHA

	JSR mult16
	LDA product
	STA multA
	LDA product+1
	STA multA+1

	PLA

	SEC
	SBC #petoffset

	CLC
	ADC multA
	STA multA
	LDA #0
	ADC multA+1
	STA multA+1

	JMP loop

done:
	RTS

mult16:

	LDA  #0
	STA  product     ; Zero-out the product area.
	STA  product+1

	LDY  #16         ; We'll loop 16 times.

loop16:
	ASL  product     ; Shift the entire 32 bits over one bit position.
	ROL  product+1
	ROL  multA
	ROL  multA+1
	BCC  skip          ; Skip the adding-in to the result if
						; the high bit shifted out was 0.

	CLC                ; Else, add multA to intermediate result.
	LDA  multB
	ADC  product
	STA  product

	LDA  multB+1
	ADC  product+1
	STA  product+1

	LDA  #0           ; If C=1, incr lo byte of hi cell.
	ADC  multA
	STA  multA

skip:
	DEY              ; If we haven't done 16 iterations yet,
	BNE  loop16       ; then go around again.

	RTS

str:
	.asciiz "43156"
