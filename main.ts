// Copyright (C) 
// Author: Dylan Muller

import {fstat, readFile, readFileSync, existsSync, exists } from "fs";
import {Z80, Instruction} from "./z80"

function printUsage(){
    console.log("usage: node main.js [in]");
}

if(process.argv.length < 3){
    printUsage();
    process.exit();
}

if(!existsSync(process.argv[2])){
    console.log("?")
    process.exit();
}

let bytecode: Buffer = readFileSync(process.argv[2]);
let z80 : Z80 = new Z80(bytecode);
z80.rf.HL = 0xFE00;
z80.rf.BC = 0x00FF;

console.log("init");
z80.dump();
for(; z80.rf.PC < bytecode.length;){
    let dasm: Instruction = z80.decode(z80.rf.PC);
    console.log("");
    console.log(z80.format16(z80.rf.PC, 4) + "\t" + dasm.syntax);
    console.log("");
    z80.step();
    z80.dump();
}

console.log("");
console.log("Memory Dump");
console.log("");

for(let i = 0; i < z80.mem.length;i++){
    z80.print8(i.toString(16), z80.mem[i]);
}
