/**
 * @file z80.ts
 * @brief Experimental Z80 Emulator - z80.ts
 *
 * +---------------------------------------+
 * |   .-.         .-.         .-.         |
 * |  /   \       /   \       /   \        |
 * | /     \     /     \     /     \     / |
 * |        \   /       \   /       \   /  |
 * |         "_"         "_"         "_"   |
 * |                                       |
 * |  _   _   _ _  _   _   ___   ___ _  _  |
 * | | | | | | | \| | /_\ | _ \ / __| || | |
 * | | |_| |_| | .` |/ _ \|   /_\__ \ __ | |
 * | |____\___/|_|\_/_/ \_\_|_(_)___/_||_| |
 * |                                       |
 * |                                       |
 * | Lunar RF Labs                         |
 * | https://lunar.sh                      |
 * |                                       |
 * | RF Research Laboratories              |
 * | Copyright (C) 2022-2024               |
 * |                                       |
 * +---------------------------------------+
 *
 * Copyright (c) 2022 Lunar RF Labs
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright notice,
 *       this list of conditions and the following disclaimer in the documentation
 *       and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

//------------------------------
//          Flags(F)
//------------------------------
//            BITS
// MSB                       LSB
//
// 7   6   5   4   3   2   1   0  
// -----------------------------
// S   Z   5   H   3  P/V  N   C 
//------------------------------
// X = 8 bit value
// S: Sign Flag - (X & 0x80) Represents sign (2's compliment)
// Z: Zero Flag - (X ? 0 : 1) Determine if accumulator is 0
// 5: 5th bit of last 8-bit instruction that altered flags
// H: Half Carry - (X & 0x0F) Carry from bits 4 to 5 (least significant nibble overflow)
// 3: 3rd bit of last 8-bit instruction that altered flags 
// PV: Parity/Overflow - Indicate register overflow or IO data parity (signed arithmetic) 
//     -- Parity set if even number of bits set
//     -- Overflow set if X (treated as signed integer) is greater than the maximum 
//        possible number (+127) or is less than the minimum possible number (–128)
// N: Subtract - Set on subtraction operation (arithmetic type) (add=0, sub=1)
// C: Carry - Carry from bits 8 to 9. Check for unsigned values. Set if subtraction is neg.

const DECODE_LUT =  [
                    "NOP",          "LD BC, **",    "LD (BC), A",   "INC BC",      "INC B",
                    "DEC B",        "LD B, *",      "RLCA",         "EX AF,AF'",   "ADD HL, BC",
                    "LD A, (BC)",   "DEC BC",       "INC C",        "DEC C",       "LD C, *", 
                    "RRCA",         "DJNZ, *",      "LD DE, **",    "LD (DE), A",  "INC DE",
                    "INC D",        "DEC D",        "LD D, *",      "RLA",         "JR *", 
                    "ADD HL, DE",   "LD A, (DE)",   "DEC DE",       "INC E",       "DEC E",
                    "LD E, *",      "RRA",          "JR NZ, *",     "LD HL, **",   "LD (**), HL",
                    "INC HL",       "INC H",        "DEC H",        "LD H, *",     "DAA",
                    "JR Z. *",      "ADD HL, HL",   "LD HL, (**)",  "DEC HL",      "INC L",
                    "DEC L",        "LD L, *",      "CPL",          "JR NC, *",    "LD SP, **",
                    "LD (**), A",   "INC SP",       "INC (HL)",     "DEC (HL)",    "LD (HL), *",
                    "SCF",          "JR C, *",      "ADD HL, SP",   "LD A, (**)",  "DEC SP",
                    "INC A",        "DEC A",        "LD A, *",      "CCF",         "LD B, B",
                    "LD B, C",      "LD B, D",      "LD B, E",      "LD B, H",     "LD B, L",
                    "LD B, (HL)",   "LD B, A",      "LD C, B",      "LD C, C",     "LD C, D",
                    "LD C, E",      "LD C, H",      "LD C, L",      "LD C, (HL)",  "LC C, A",
                    "LD D, B",      "LD D, C",      "LD D, D",      "LD D, E",     "LD D, H",
                    "LD D, L",      "LD D, (HL)",   "LD D, A",      "LD E, B",     "LD E, C",
                    "LD E, D",      "LD E, E",      "LD E, H",      "LD E, L",     "LD E, (HL)",
                    "LD E, A",      "LD H, B",      "LD H, C",      "LD H, D",     "LD H, E",
                    "LD H, H",      "LD H, L",      "LD H, (HL)",   "LD H, A",     "LD L, B",
                    "LD L, C",      "LD L, D",      "LD L, E",      "LD L, H",     "LD L, L",
                    "LD L, (HL)",   "LD L, A",      "LD (HL), B",   "LD (HL), C",  "LD (HL), D",
                    "LD (HL), E",   "LD (HL), H",   "LD (HL), L",   "HALT",        "LD (HL), A",
                    "LD A, B",      "LD A, C",      "LD A, D",      "LD A, E",     "LD A, H",
                    "LD A, L",      "LD A, (HL)",   "LD A, A",      "ADD A, B",    "ADD A, C",
                    "ADD A, D",     "ADD A, E",     "ADD A, H",     "ADD A, L",    "ADD A, (HL)",
                    "ADD A, A",     "ADC A, B",     "ADC A, C",     "ADC A, D",    "ADC A, E",
                    "ADC A, H",     "ADC A, L",     "ADC A, (HL)",  "ADC A, A",    "SUB A, B",
                    "SUB A, C",     "SUB A, D",     "SUB A, E",     "SUB A, H",    "SUB A, L",
                    "SUB A, (HL)",  "SUB A",        "SBC A, B",     "SBC A, C",    "SBC A, D",
                    "SBC A, E",     "SBC A, H",     "SBC A, L",     "SBC A, (HL)", "SBC A, A",
                    "AND A, B",     "AND A, C",     "AND A, D",     "AND A, E",    "AND A, H",
                    "AND A, L",     "AND A, (HL)",  "AND A, A",     "XOR A, B",    "XOR A, C",
                    "XOR A, D",     "XOR A, E",     "XOR A, H",     "XOR A, L",    "XOR A, (HL)",
                    "XOR A, A",     "OR A, B",      "OR A, C",      "OR A, D",     "OR A, E",
                    "OR A, H",      "OR A, L",      "OR A, (HL)",   "OR A, A",     "CP A, B",
                    "CP A, C",      "CP A, D",      "CP A, E",      "CP A, H",     "CP A, L",
                    "CP A, (HL)",   "CP A, A"     
                   ];

const OPCODE_16 = [
    0x01, 0x03, 0x08, 0x09, 0x0B, 
    0x11, 0x13, 0x19, 0x1B, 0x21,
    0x23, 0x29, 0x2A, 0x2B, 0x31,
    0x33, 0x39, 0x3B

]

enum CONDITION_LUT{
    NZ, Z, NC, C, PO, PE, P, M
};
enum RF_LUT{
    B, C, D, E, H, L, _HL_, A
}
enum RF_PAIR_LUT{
    BC, DE, HL, SP
}
enum ALU_LUT{
    ADD_A, ADC_A, SUB_A, SBC_A, AND, XOR, OR, CP
}

export interface Instruction{
    syntax: string;
    bytes: Buffer;
}

export class Z80 {
    rom: Buffer;
    mem: Buffer;
    cycles: number;
    
    // Z80 register file
    rf = {
    PC  : 0x0,
    SP  : 0x0,
    IX  : 0x0,
    IY  : 0x0,
    I   : 0x0,
    R   : 0x0,

    flags  : 
    { 
        S  : 0x0,  Z  : 0x0,
        H  : 0x0,  PV : 0x0,
        N  : 0x0,  C  : 0x0,
        F5 : 0x0,  F3 : 0x0
    },

    _flags  : 
    { 
        S  : 0x0,  Z  : 0x0,
        H  : 0x0,  PV : 0x0,
        N  : 0x0,  C  : 0x0,
        F5 : 0x0,  F3 : 0x0
    },

    A   : 0x0, 
    B   : 0x0,   C  : 0x0,
    D   : 0x0,   E  : 0x0,
    H   : 0x0,   L  : 0x0,

    AF  : 0x0,
    BC  : 0x0,   DE : 0x0,
    HL  : 0x0,

    _A  : 0x0,
    _B  : 0x0,   _C  : 0x0,
    _D  : 0x0,   _E  : 0x0,
    _H  : 0x0,   _L  : 0x0,

    _AF : 0x0,
    _BC : 0x0,   _DE : 0x0,
    _HL : 0x0
}

    rot8L(val: number){
        if(val &0x80){
            val = (val << 1) | 0x1;
        }else{
            val = (val << 1) & 0xFE;
        }
        return val;
    }
    rot8R(val: number){
        if(val &0x1){
            val = (val >> 1) | 0x80;
        }else{
            val = (val >> 1) & 0x7F;
        }
        return val;
    }
    parity(val: number){
        val ^= val >> 1;
        val ^= val >> 2;
        val = (val & 0x11111111) * 0x11111111;
        return (val >> 28) & 1;
    }
    
    format16(reg: number, pad: number) {
        let reg16 = reg
            .toString(16)
            .toUpperCase()
            .padStart(pad, "0");
        return reg16;
    }
    print16(label: string, val: number) {
        this.print(`${label} = ${this.format16(val, 4)}h`);
    }

    print(message: any) {
        console.log(message);
    }
    print8(label: string, val: number) {
        this.print(`${label} = ${this.format16(val, 2)}h`);
    } 
    dump(){
        let rf = this.rf;
        this.print16('PC',  rf.PC);  this.print16('SP', rf.SP);
        this.print16('AF',  rf.AF);  this.print16('BC', rf.BC);
        this.print16('DE',  rf.DE);  this.print16('HL', rf.HL);
        this.print16(`AF'`, rf._AF); this.print16(`BC'`, rf._BC);
        this.print16(`DE'`, rf._DE); this.print16(`HL'`, rf._HL);
        this.print8('R', rf.R);
    }

    // Based off z80-documented-v0.91.pdf
    reset(){
        let rf = this.rf;

        for(const register in rf){
            rf[register] = 0xFFFF;
        }
        rf.flags  = 
        {
            S  : 0x0,  Z  : 0x0,
            F5 : 0x0,  H  : 0x0,
            F3 : 0x0,  PV : 0x0,
            N  : 0x0,  C  : 0x0
        };

        rf._flags  = 
        {
            S  : 0x0,  Z  : 0x0,
            F5 : 0x0,  H  : 0x0,
            F3 : 0x0,  PV : 0x0,
            N  : 0x0,  C  : 0x0
        };

        rf.PC = 0x0000;
        rf.R  = 0x00;

    }

    clamp(){
        let rf = this.rf;

        rf.A &=0xFF; rf._A &=0xFF;
        rf.B &=0xFF; rf._B &=0xFF;
        rf.C &=0xFF; rf._C &=0xFF;
        rf.D &=0xFF; rf._D &=0xFF;
        rf.H &=0xFF; rf._H &=0xFF;
        rf.L &=0xFF; rf._L &=0xFF;

        rf.AF &=0xFFFF; rf._AF &=0xFFFF;
        rf.BC &=0xFFFF; rf._BC &=0xFFFF;
        rf.DE &=0xFFFF; rf._DE &=0xFFFF;
        rf.HL &=0xFFFF; rf._HL &=0xFFFF;
    }

    map (opcode : number){
        let opcode16 = false;
        let rf = this.rf;
        let f  = rf.flags;
        this.clamp();

        for (let i = 0; i < OPCODE_16.length; i++){
            if(OPCODE_16[i] === opcode){
                opcode16 = true;
                break;
            }
        }
        
        if(opcode16){

            rf.B = rf.BC >> 8; rf.C = rf.BC &0xFF;
            rf.D = rf.DE >> 8; rf.E = rf.DE &0xFF;
            rf.H = rf.HL >> 8; rf.L = rf.HL &0xFF;
            rf.A = rf.AF >> 8; 

        }else{
            rf.AF = rf.A << 8;

            rf.BC = rf.C | rf.B << 8;
            rf.DE = rf.E | rf.D << 8;
            rf.HL = rf.L | rf.H << 8;
        }
        rf.AF &=0xFF00;
        rf.AF |= f.C << 0 | f.N << 1 | f.PV << 2 | f.F3 << 3;
        rf.AF |= f.H << 4 | f.F5 << 5 | f.Z << 6 | f.S << 7; 

    }
    r8_stub(z : number){
        let rf = this.rf;
        switch(z){
            case RF_LUT._HL_:
                return this.mem.readUInt8(rf.HL);
            default:
                return rf[RF_LUT[z]];
        }
    }
    j8_stub(byte: number){
        let rf = this.rf;
        byte = byte &0xFF;
        if(byte &0x80){
            rf.PC -= ((~byte &0xFF) + 1);
        }
        else{
            rf.PC += byte;
        }
    }
    f358_stub(byte : number){
        let flags = this.rf.flags;
        flags.F3 = byte &0x8  ? 1 : 0;
        flags.F5 = byte &0x20 ? 1 : 0;
    }

    add8(bl : number, br: number){
        let flags = this.rf.flags;
        let byte = (bl+br)&0xFF;
        let pv : boolean = false;
        let s = br >= 0 ? 1 : -1;
        let sr = br * s;

        this.f358_stub(byte);
        flags.S = byte &0x80 ? 1 : 0;
        flags.C = (bl+br) &0x100 ? 1 : 0;
        flags.Z = byte ? 0 : 1;

        flags.H =((bl &0x0F) + s*(sr &0x0F)) &0x10 ? 1 : 0;

        bl = bl | ((bl & 0x80) << 1);
        sr = sr | ((sr & 0x80) << 1);
        byte = bl + sr;

        pv = (byte & 0x80) >> 7 != (byte &0x100) >> 8;
        flags.PV = pv ? 1 : 0;
        flags.N = 0;
    }

    sub8(bl : number, br: number){
        let flags = this.rf.flags;
        this.add8(bl,-br);
        flags.N = 1;
    }

    and(val : number){
        let flags = this.rf.flags;
        let byte = val &0xFF;
        let pv = this.parity(byte);
        
        this.f358_stub(byte);
        flags.S = byte &0x80 ? 1 : 0;
        flags.Z = byte ? 0 : 1;
        flags.PV = pv ?  0 : 1;
        flags.H = 1;

    }
    xor(val : number){
        let flags = this.rf.flags;
        this.and(val);
        flags.H = 0;
    }
    
    add16(wl : number, wr: number){
        let flags = this.rf.flags;
        let byte = (wl+wr)&0xFFFF;

        flags.F3 = byte &0x0800 ? 1 : 0;
        flags.F5 = byte &0x2000 ? 1 : 0;

        flags.C = (wl+wr) &0x10000 ? 1 : 0; 
        flags.N  = 0;

        let alu0 =  ((wl &0xFF) + (wr &0xFF) ) >> 8 ;
        let alu1 =  ((wl &0x0F00) + (wr &0x0F00)) >> 8;

        flags.H = (alu0+alu1) & 0x10 ? 1 : 0;

    }

    inc(val : number){
        let flags = this.rf.flags;
        let byte = val &0xFF;

        this.f358_stub(byte);
        flags.S = byte & 0x80 ? 1 : 0;
        flags.Z = byte ? 0 : 1;
        flags.H = (byte & 0x0F) ? 0 : 1;
        flags.PV = (byte==0x80) ? 1 : 0;

    }

    dec(val : number){
        let flags = this.rf.flags;
        let byte = val &0xFF;
        
        this.f358_stub(byte);
        flags.S = byte & 0x80 ? 1 : 0;
        flags.Z = byte ? 0 : 1;
        flags.H = (byte &0x0F) == 0x0F ? 1 : 0;
        flags.PV = (byte == 0x7F) ? 1 : 0;
        flags.N = 1;
        
    }

    rlca(val : number, lca: number){
        let flags = this.rf.flags;
        let byte = val &0xFF;
        let result = lca &0xFF;

        this.f358_stub(result);
        flags.C = byte & 0x80 ? 1 : 0;
        flags.H = 0;
        flags.N = 0;

    }

    rrca(val : number, rca : number){
        let flags = this.rf.flags;
        let byte = val &0xFF;
        let result = rca &0xFF;

        this.f358_stub(result);
        flags.C = byte & 0x1 ? 1 : 0;
        flags.H = 0;
        flags.N = 0;
    }

    cpl(val : number){
        let flags = this.rf.flags;
        let byte = val &0xFF;
        
        this.f358_stub(byte);
        flags.N = 1;
        flags.H = 1;
    }

    scf(){
        let flags = this.rf.flags;
        
        this.f358_stub(this.rf.A);
        flags.H = 0;
        flags.C = 1;
        flags.N = 0;
    }
    ccf(){
        let flags = this.rf.flags;

        this.f358_stub(this.rf.A);
        flags.H = flags.C;
        flags.C = flags.C ? 0 : 1;
        flags.N = 0;
    }

    daa(val : number, daa: number){
        let flags = this.rf.flags;
        let byte = val &0xFF;
        let result = daa &0xFF;

        this.f358_stub(result);
        flags.S = byte & 0x80 ? 1 : 0;
        flags.Z = (byte) ? 0 : 1;
        flags.PV = this.parity(result) ?  0 : 1;
        flags.C = 0;

        if  ( result == ((val + 0x66) &0xFF  ) ||
              result == ((val + 0x60) &0xFF) ){
                flags.C = 1;
           }

           if((val &0x0F) > 9 || (flags.H)){
                if(((val &0x0F) + 0x6) &0x10){
                    flags.H = 1;
                }else{
                    flags.H = 0;
                }
            }
    }

    decode(address: number) : Instruction{
        let code = this.mem[address &0xFFFF];
        let ins : Instruction = <Instruction>{};
        let bytes = 0x1;
        let operand = 0x0;
        let fmt16 = null;

        ins.bytes = new Buffer([code]); 
        ins.syntax = DECODE_LUT[code];

        // Get number of operand bytes
        if(code <= 0x9f)
        bytes+= ins.syntax.split("*").length -1;

        // Decoder logic for ## bytes

        if(bytes > 1){
            if(address+bytes > this.mem.length){
                this.rf.PC += bytes;
                ins.syntax = "??";
                return ins;
            }
            let sub = this.mem.slice(address, address+bytes);
            ins.bytes = new Buffer(sub);
            if(bytes == 2){
                operand = this.mem.readUInt8(address+1);
                fmt16 =  this.format16(operand, 2) + "h";
                ins.syntax = DECODE_LUT[code].replace('*',fmt16);
            }
            if(bytes == 3){
                operand  = this.mem.readUInt16LE(address+1);
                fmt16 =  this.format16(operand, 4) + "h";
                ins.syntax = DECODE_LUT[code].replace('**', fmt16) ;
            }
        }
        return ins;
    }

    step(){
        let byte = 0x0;
        let word = 0x0;
        let local = 0x0;
        let cycles = 0x0;
        let index = null;
        // Clamp registers to 16-bit boundaries
        let mem: Buffer = this.mem;
        let rf = this.rf;
        let opcode = mem[rf.PC++];

        // ------------------------------
        //        Bits in opcode
        // ------------------------------
        //            BITS
        // MSB                       LSB
        //
        // 7   6   5   4   3   2   1   0  
        // -----------------------------
        // | x |   |   y   |   |   z   |
        // -----   ---------   --------- 
        //         | p |   |
        //         -----   q

        let z = (opcode&0x7);
        let y = (opcode&0x38)>>3;
        let x = (opcode&0xC0)>>6;
        let p = (opcode&0x30)>>4;
        let q = (opcode&0x8)>>3;

        this.print(`z = ${x}\ty=${y}\tx=${x}`);
        this.print(`p = ${p}\tq=${q}`);
        this.print("");

        switch (true) {

            // --------------------------
            //    OPCODES: 0x0-0x0F
            // --------------------------

            // opcode: 0x00
            // syntax: NOP
            // description: No Operation
            // use: delay
            // clock cycles (T): 4  
            // flags: all preserved
            // size (bytes): 1
            case opcode==0x00:
                cycles+=4;
                break

            // opcode: 0x01,0x11,0x21,0x31 LS_BYTE(*) MS_BYTE(*)
            // syntax: LD (BC,DE,HL,SP) **
            // description: Load ** into reg (BC,DE,HL,SP)
            // use: load 16 bit value into register (BC,DE,HL,SP)
            // clock cycles (T): 10  
            // flags: all preserved
            // size (bytes): 3
            case opcode==0x01:
            case opcode==0x11:
            case opcode==0x21:
            case opcode==0x31:

                index = RF_PAIR_LUT[p];
                word = mem.readUInt16LE(rf.PC);
                rf[index] = word;
                cycles+=10;
                rf.PC += 2;
                break

            // opcode: 0x02
            // syntax: LD (BC), A
            // description: Load A into (BC)
            // use: load register A value into address (BC)
            // clock cycles (T): 7 
            // flags: all preserved  
            // size (bytes): 1  

            case opcode==0x02:
                mem[rf.BC] = rf.A;
                cycles+=7;
                break;

            // opcode: 0x03,0x13,0x23,0x33
            // syntax: INC (BC,DE,HL,SP)
            // description: Increment (BC,DE,HL,SP) by 1
            // use: increase 16-bit value held by 
            // (BC,DE,HL,SP) by 1
            //
            // clock cycles (T): 6
            // flags: all preserved  
            // size (bytes): 1  

            // INC
            case opcode==0x03:
            case opcode==0x13:
            case opcode==0x23:
            case opcode==0x33:

            // DEC
            case opcode==0x0B:
            case opcode==0x1B:
            case opcode==0x2B:
            case opcode==0x3B:
                
                byte = q ? -1 : 1;
                index = RF_PAIR_LUT[p];
                rf[index] = rf[index] + byte;
                cycles+=6;
                break;


            // opcode: 0x04
            // syntax: INC B,C,D,E,H,L
            // description: Increment B,C,D,E,H,L by 1
            // use: increase 8-bit value held by 8-bit
            // registers B,C,D,E,H,L by 1
            //
            // clock cycles (T): 4
            // flags: 
            //      - C: Preserved
            //      - N: Reset
            //      - PV: Overflow Detect
            //      - H: Half Carry
            //      - Z: Zero
            //      - S: Sign
            //
            // Note on Overflow Detection
            // --------------------------
            // Assume X=0'b01111111 before (inc B), it is clear that
            // after inc B, X (treated as signed) has overflowed
            // since X++=0'b10000000 and thus the initial and final
            // sign bits are different       
            //
            // Thus during inc B, we check for an overflow by comparing
            // register B to the value 0x80, if they match an overflow
            // has occured
            //
            // Note on Half Carry
            // ------------------
            // Half carry functions similar to normal carry, but operates per nibble
            // instead of each byte (required for BCD arithmetic)
            // For example, assume X=0'b00001111 before inc B, it is clear that
            // after inc B, the first least significant nibble has resulted in overflow
            // i.e, X++=0'b00010000
            //
            // size (bytes): 1  

            // INC
            case opcode==0x04:
            case opcode==0x0C:
            case opcode==0x14:
            case opcode==0x1C:
            case opcode==0x24:
            case opcode==0x2C:
            case opcode==0x34:
            case opcode==0x3C:

            // DEC 
            case opcode==0x05:
            case opcode==0x0D:
            case opcode==0x15:
            case opcode==0x1D:
            case opcode==0x25:
            case opcode==0x2D:
            case opcode==0x35:
            case opcode==0x3D:

                local = 4;
                index =  RF_LUT[y];
                let skew = (z == 4) ? 1 : -1;
                switch(y){
                    case RF_LUT._HL_:
                        byte = mem.readUInt8(rf.HL);
                        byte = (byte + skew) & 0xFF;
                        mem[rf.HL] = byte;
                        local = 11;
                        break;
                    default:
                        byte = (rf[index] + skew) & 0xFF;
                        rf[index] = byte;
                }
                if(z==0x4){
                    this.inc(byte);
                }else{
                    this.dec(byte);
                }
                cycles += local;
                break;


            // opcode: 0x06 BYTE(*)
            // syntax: LD B, *
            // description: Load * into B
            // use: load 8 bit value into register B
            // clock cycles (T): 7 
            // flags: all preserved
            // size (bytes): 2

            case opcode==0x06:
            case opcode==0x0E:
            case opcode==0x16:
            case opcode==0x1E:
            case opcode==0x26:
            case opcode==0x2E:
            case opcode==0x36:
            case opcode==0x3E:  
            case opcode>=0x40 && 
                 opcode <=0x75:
            case opcode>=0x77 &&
                 opcode <=0x7F:

                local = x ? 4 : 7;
                index =  RF_LUT[y];

                if(!x){
                    byte = mem.readUInt8(rf.PC);
                }else{
                    byte = this.r8_stub(z);
                }

                switch(y){
                    case RF_LUT._HL_:
                        mem[rf.HL] = byte;
                        local = x ? 7 : 10;
                        break;
                    default:
                        rf[index] = byte;
                }

                cycles += local;

                if(!x){
                rf.PC += 1;
                }

                break;

            // opcode: 0x07
            // syntax: RLCA
            // description: Register A rotated left by 1 (contents are wraped)
            // use: bitwise shift left (wrap)
            // clock cycles (T): 4
            // flags: 
            //      - C: Obtains value of MSB before shift occured
            //      - N: Reset
            //      - H: Reset
            // size (bytes): 1  

            case opcode==0x07:
                byte = rf.A;
                rf.A = this.rot8L(rf.A);
                this.rlca(byte, rf.A);
                cycles +=4;
                break;


            // opcode: 0x08
            // syntax: EX AF, AF'
            // description: Exchange the 16-bit contents of AF and AF'
            // use: Exchange contents
            // clock cycles (T): 4
            // flags: all preserved
            // size (bytes): 1  

            case opcode==0x08:
                word = rf.AF;
                rf.AF = rf._AF;
                rf._AF = word;
                cycles += 4;
                break;

            // opcode: 0x09, 0x19, 0x29, 0x39
            // syntax: ADD HL, (BC, DE, HL, SP)
            // description: Value of (BC, DE, HL, SP) is added to HL
            // use: Add 16 bit register pair (BC, DE, HL, SP)
            // to register pair HL
            // clock cycles (T): 11
            // flags: 
            //      - C (Carry from bit 16 to 17)
            //      - N (set to 0)
            //      - H (Half Carry for last ALU addition)
            // size (bytes): 1  

            case opcode==0x09:
            case opcode==0x19:
            case opcode==0x29:
            case opcode==0x39:

                index = RF_PAIR_LUT[p];
                word = rf[index];
                this.add16(rf.HL, word);
                rf.HL = rf.HL + word;
                cycles+=11;
                break;

            // opcode: 0x0A
            // syntax: LD A, (BC)
            // description: Load (BC) into A
            // use: load 8-bit value pointed to by (BC) into register A
            // clock cycles (T): 7 
            // flags: all preserved  
            // size (bytes): 1  

            case opcode==0x0A:
                rf.A = mem[rf.BC];
                cycles+=7;
                break;


            // opcode: 0x0F
            // syntax: RRCA
            // description: Register A rotated right by 1 (contents are wraped)
            // use: bitwise shift right (wrap)
            // clock cycles (T): 4
            // flags: 
            //      - C: Obtains value of MSB before shift occured
            //      - N: Reset
            //      - H: Reset
            // size (bytes): 1  

            case opcode==0x0F:
                byte = rf.A;
                rf.A =  this.rot8R(byte);
                this.rrca(byte, rf.A);
                cycles+=4;
                break;


            // --------------------------
            //    OPCODES: 0x10-0x1F
            // --------------------------

            // opcode: 0x10
            // syntax: DJNZ *
            // description: Decrement register B & if not 0 add * 
            // (treated as signed integer) to PC.
            // jmp off. = end of ins bytes +- * (2's complement to decimal)
            // use: Creting loops
            // clock cycles (T): 4
            // flags: all preserved
            // size (bytes): 1  

            case opcode==0x10:
                byte = mem.readUInt8(rf.PC);
                rf.B = rf.B - 1;
                rf.PC+=1;
                
                if(!(rf.B)){
                    cycles+=8;
                    break;
                }

                this.j8_stub(byte);
                cycles+=13;
                break;

           
            // opcode: 0x02
            // syntax: LD (DE), A
            // description: Load A into (DE)
            // use: load register A value into address (DE)
            // clock cycles (T): 7 
            // flags: all preserved  
            // size (bytes): 1  

            case opcode==0x12:
                mem[rf.DE] = rf.A;
                cycles+=7;
                break;


            // opcode: 0x17
            // syntax: RLA
            // description: Register A rotated left by 1 
            // use: bitwise shift left 
            // clock cycles (T): 4
            // flags: 
            //      - C: Obtains value of MSB before shift occured
            //      - N: Reset
            //      - H: Reset
            // size (bytes): 1  

            case opcode==0x17:
                byte = rf.A;
                rf.A = this.rot8L(byte & 0x7F);

                if(rf.flags.C){
                    rf.A |=0x1;
                }

                this.rlca(byte, rf.A);
                cycles+=4;
                break;

            // opcode: 0x18 BYTE(*)
            // syntax: JR *
            // description: Relative jump, add * (2's complement) to pc
            // use: Relative jump
            // clock cycles (T): 12
            // flags: all preserved
            // size (bytes): 2

            case opcode==0x18:
                byte = mem.readUInt8(rf.PC);
                rf.PC+=1;

                this.j8_stub(byte);
                cycles+=12;
                break;


            // opcode: 0x1A
            // syntax: LD A, (DE)
            // description: Load (DE) into A
            // use: load 8-bit value pointed to by (DE) into register A
            // clock cycles (T): 7 
            // flags: all preserved  
            // size (bytes): 1  

            case opcode==0x1A:
                rf.A = mem[rf.DE];
                cycles+=7;
                break;

            // opcode: 0x1F
            // syntax: RRA
            // description: Register A rotated right by 1 
            // use: bitwise shift right 
            // clock cycles (T): 4
            // flags: 
            //      - C: Obtains value of MSB before shift occured
            //      - N: Reset
            //      - H: Reset
            // size (bytes): 1  

            case opcode==0x1F:
                byte = rf.A;
                rf.A = this.rot8R(byte & 0xFE);

                if(rf.flags.C){
                    rf.A |=0x80;
                }
                this.rrca(byte, rf.A);
                cycles+=4;
                break;

            // --------------------------
            //    OPCODES: 0x20-0x2F
            // --------------------------

            // opcode: 0x20,0x28,0x30,0x38 BYTE(*)
            // syntax: JR CC, *
            // description: Relative jump if conditioner CC met
            // (treated as signed integer) to PC.
            // jmp off. = end of ins bytes +- * (2's complement to decimal)
            // use: Conditional Branch
            // clock cycles (T): 12 condition met, 7 condition not met
            // flags: all preserved
            // size (bytes): 2

            case opcode==0x20:
            case opcode==0x28:
            case opcode==0x30:
            case opcode==0x38:

            byte = mem.readUInt8(rf.PC);
            let cc = {
                index : (y-4) <= 2 ? "Z" : "C",
                bool: (y-4) % 2 == 1 ? 1 : 0
            };
            rf.PC += 1;
    
            if(rf.flags[cc.index] == cc.bool){
                this.j8_stub(byte);
                cycles += 12;
            }
            else{
                cycles += 7;
            }
            break;


            // opcode: 0x22 LS_BYTE(*) MS_BYTE(*)
            // syntax: LD (**), HL
            // description: load HL into (**)
            // use: load register HL value into address (**)
            // clock cycles (T): 16
            // flags: all preserved  
            // size (bytes): 3

            case opcode==0x22:
                word = mem.readUInt16LE(rf.PC);
                mem[word] = rf.L;
                mem[word+1] = rf.H;
                cycles +=16;
                rf.PC +=2;
                break;


            // opcode: 0x27
            // syntax: DAA
            // description: Adjust A for BCD addition and subtraction
            // use: Register A BCD Adjust
            // clock cycles (T): 4 
            // flags: all preserved
            // size (bytes): 1

            case opcode==0x27:
                byte = rf.A;
                if((byte &0x0F) > 9 || rf.flags.H){
                    byte = (byte+0x6);
                }
                if((((byte) >> 4) > 9) || rf.flags.C){
                    let bcd = (((byte &0xF0) >> 4) + 6);
                    byte =  (byte &0x0F) | (bcd &0xF) << 4;
                }
                this.daa(rf.A, byte);
                rf.A = byte;
                cycles+=4;
                break;


            // opcode: 0x2A LS_BYTE(*) MS_BYTE(*)
            // syntax: LD HL, (**)
            // description: Load (**) into HL
            // use: load 8-bit value pointed to by (**) into register HL
            // clock cycles (T): 7 
            // flags: all preserved  
            // size (bytes): 3

            case opcode==0x2A:
                word = mem.readUInt16LE(rf.PC);
                rf[rf.HL] = mem.readUInt16LE( word );
                rf.PC+=2;
                cycles+=16;
                break;

            
            // opcode: 0x2F 
            // syntax: CPL
            // description: Contents of A are inverted (1's complement)
            // use: Invert register A (1's complement)
            // clock cycles (T): 4
            // flags:
            //      - N (set)
            //      - H (set)
            // size (bytes): 1

            case opcode==0x2F:
                rf.A = (~rf.A) & 0xFF;
                this.cpl(rf.A);
                cycles+=4;
                break;

            // --------------------------
            //    OPCODES: 0x30-0x3F
            // --------------------------


            // opcode: 0x32 LS_BYTE(*) MS_BYTE(*)
            // syntax: LD (**), A
            // description: load A into (**)
            // use: load register A value into address (**)
            // clock cycles (T): 13
            // flags: all preserved  
            // size (bytes): 3

            case opcode==0x32:
                word = mem.readUInt16LE(rf.PC);
                mem[word] = rf.A;
                cycles +=13;
                rf.PC +=2;
                break;

            // opcode: 0x37
            // syntax: SCF
            // description: Set carry flag
            // use: set carry bit in flag (F) register
            // clock cycles (T): 4
            // flags: 
            //      - C: set
            //      - N: clear
            //      - H: clear
            // size (bytes): 1

            case opcode==0x37:
                this.scf();
                cycles+=4;
                break;    


            // opcode: 0x3A
            // syntax: LD A, (**)
            // description: Load value at address (**) into A
            // use: load 8-bit value pointed to by (**) into register A
            // clock cycles (T): 16
            // flags: all preserved  
            // size (bytes): 3

            case opcode==0x3A:
                word = mem.readUInt16LE(rf.PC);
                byte = mem.readUInt8(word);
                rf.A = byte;
                rf.PC+=2;
                cycles+=16;
                break;


            // opcode: 0x3F 
            // syntax: CCF
            // description: Invert carry flag
            // use: Invert carry flag bit in flags (F) register
            // clock cycles (T): 4
            // flags:
            //      - C (inverted) ~
            //      - H (inverted) ~
            //      - N (reset)
            // size (bytes): 1

            case opcode==0x3F:
                this.ccf();
                cycles+=4;
                break;

            // opcode: 0x76 
            // syntax: CCF
            case opcode==0x76:
                this.print("! HALT");
                break;

            case opcode>=0x80 && 
                 opcode <=0xBF:

            byte = this.r8_stub(z);

            let p8 = 0x0;
            let a = rf.A;

            switch(y){
                
                case ALU_LUT.ADC_A:
                    byte += rf.flags.C;

                case ALU_LUT.ADD_A:
                    p8 = a + byte;
                    this.add8(a, byte);
                    break;

                case ALU_LUT.SBC_A:
                    byte += rf.flags.C;

                case ALU_LUT.SUB_A:
                    p8 = a - byte;

                case ALU_LUT.CP:
                    this.sub8(a, byte);
                    break;

                case ALU_LUT.AND:
                    p8 = a & byte;
                    this.and(p8);
                    break;

                case ALU_LUT.XOR:
                    p8 = a ^ byte;
                    this.xor(p8);
                    break;

                case ALU_LUT.OR:
                    p8 = a | byte;
                    this.xor(p8);
                    break;
            }

            if(p8){
                rf.A = p8 & 0xFF;
            }
            
        }

    // update cycles
    this.cycles += cycles;
    this.map(opcode);
    // increase R by one for single prefix opcodes
    // only first 7 bits used to increment register    
    rf.R = (rf.R + 1) & 0x7F;
    }

    constructor(rom: Buffer) {
        // Rom and Memory Init
        // this.rom = new Buffer(config.ROM_SIZE);        
        this.mem = rom;
        
        this.print(`Allocated ${rom.length} bytes `);
        this.print("");

        // reset emulator
        this.reset();

    }
}
