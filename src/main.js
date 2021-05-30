import VM from "./vm.js";

import machine from "./machines/apple2e-enhanced/machine.js";
// import machine from "./machines/apple2-plus/machine.js";

const canvas= document.getElementById("screen");

const vm= new VM(canvas, machine);


/**
CH          =     $24
CV          =     $25
WNDLFT      =     $20
WNDWDTH     =     $21
WNDTOP      =     $22
WNDBTM      =     $23
BASL        =     $28
BASH        =     $29
INVFLG      =     $3

* = $0800

prg = *
lda #$7f
sta INVFLG

lda #$00
sta WNDLFT
lda #$28
sta WNDWDTH
lda #$00
sta WNDTOP
lda #$18
sta WNDBTM

lda #$00
sta BASL
lda #$04
sta BASH

ldx #0
stx CH
stx CV

loop = *
lda text,x
beq prg
jsr $1000
inx
jmp loop
text = *
 */
// const prg= `
// A9 7F 8D 03 00 A9 00 8D
// 20 00 A9 28 8D 21 00 A9
// 00 8D 22 00 A9 18 8D 23
// 00 A9 00 8D 28 00 A9 04
// 8D 29 00 A2 00 8E 24 00
// 8E 25 00 4C E3 F1
// `;
// let addr= vm.memWrite(0x0800, prg);

// addr= vm.bus.write(0x0800, "4c e3 f1");

// addr= vm.bus.writeString(addr, "ceci est un test");
// addr= vm.memWrite(addr, "8D 8d 8d 8d 8d 8d 8d");
// addr= vm.bus.writeString(addr, "sur 2 lignes");
// addr= vm.memWrite(addr, "8D 8d 8d 8d 8d 8d 8d");
// addr= vm.bus.writeString(addr, "ceci est un test");
// addr= vm.bus.write(addr, "8D 8d 8d 8d 8d 8d 8d");
// addr= vm.bus.writeString(addr, "de scroll");
// addr= vm.bus.write(addr, "8D 8d");
// addr= vm.bus.writeString(addr, "en vertical");
// addr= vm.bus.write(addr, "00");

vm.memWrite(0x0400, "AA AA AA");

vm.start();
