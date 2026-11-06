import { cube3x3x3 } from "cubing/puzzles";
import type { KPattern } from "cubing/kpuzzle";
import type { TwistyPlayer } from "cubing/twisty";

// Mapping SEMENTARA untuk tes (bukan mapping csTimer, itu urusan 0.5)
const KEYMAP: Record<string, string> = {
    j: "U", f: "U'", i: "R", k: "R'", h: "F", g: "F'",
};

export async function setupSpike04(player: TwistyPlayer) {
    const kpuzzle = await cube3x3x3.kpuzzle();
    let pattern: KPattern = kpuzzle.defaultPattern(); // sumber kebenaran

    function applyMove(move: string) {
        pattern = pattern.applyMove(move); // 1. engine
        player.experimentalAddMove(move);  // 2. tampilan
    }

    const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        const move = KEYMAP[e.key];
        if (!move) return;
        e.preventDefault();
        applyMove(move);
    };
    window.addEventListener("keydown", onKey);

    async function compare() {
        const shown = await player.experimentalModel.currentPattern.get();
        const same = pattern.isIdentical(shown);
        console.log("engine == tampilan:", same);
        return same;
    }

    async function randomTest(n = 50) {
        const faces = ["U", "D", "L", "R", "F", "B"];
        const mods = ["", "'", "2"];
        const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
        for (let i = 0; i < n; i++) applyMove(pick(faces) + pick(mods));
        await new Promise((r) => setTimeout(r, 4000)); // tunggu animasi selesai
        return compare();
    }

    // bisa dipanggil dari Console
    (window as any).spike04 = { compare, randomTest };

    return () => window.removeEventListener("keydown", onKey);
}