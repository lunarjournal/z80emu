# z80emu

This repository contains a bare bones implementation of a `Z80` emulator (written in `Typescript`), supporting up to `150+` basic `opcodes`. It is intended to be an educational project to show how one would approach simulating the behaviour of an `8-bit` microprocessor.

The `simulator` interface steps through a compiled binary and dumps the contents of each `Z80` register after each `fetch`, `decode`, `execute` instruction cycle to the console.

> Note: `Z80` assembly programs are intended to be compiled with [`z80asm`](https://www.nongnu.org/z80asm/)

Files:
<br/>
* `z80.ts` - `core` implementation.
* `main.ts` - `sim` interface.

# Signature

```
+---------------------------------------+
|   .-.         .-.         .-.         |
|  /   \       /   \       /   \        |
| /     \     /     \     /     \     / |
|        \   /       \   /       \   /  |
|         "_"         "_"         "_"   |
|                                       |
|  _   _   _ _  _   _   ___   ___ _  _  |
| | | | | | | \| | /_\ | _ \ / __| || | |
| | |_| |_| | .` |/ _ \|   /_\__ \ __ | |
| |____\___/|_|\_/_/ \_\_|_(_)___/_||_| |
|                                       |
|                                       |
| Lunar RF Labs                         |
| https://lunar.sh                      |
|                                       |
| RF Research Laboratories              |
| Copyright (C) 2022-2024               |
|                                       |
+---------------------------------------+
```
