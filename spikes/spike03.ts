import { cube3x3x3 } from "cubing/puzzles";
import { Alg } from "cubing/alg";

export async function runSpike03() {
    const kpuzzle = await cube3x3x3.kpuzzle();
    const solved = kpuzzle.defaultPattern();

    const algs = [
        "R U R' U'",
        "R U R' U R U2 R'", // Sune
        "R U R' U' R' F R2 U' R' U' R U R' F'", // T-perm
        "M2 E2 S2",
        "r U r' U' r' F r F'",
    ];

    for (const text of algs) {
        const alg = new Alg(text);
        const after = solved.applyAlg(alg);
        const back = after.applyAlg(alg.invert());
        console.log(
            text,
            "| solved setelah alg:", after.isIdentical(solved),
            "| solved setelah alg + inverse:", back.isIdentical(solved)
        );
    }

    // Tes rotasi seluruh cube (keputusan PRD: solved tidak peduli rotasi)
    const rotated = solved.applyAlg(new Alg("y x"));
    console.log("identik setelah y x:", rotated.isIdentical(solved));
    console.log(
        "solved (abaikan orientasi):",
        rotated.experimentalIsSolved({
            ignorePuzzleOrientation: true,
            ignoreCenterOrientation: true,
        })
    );

    // Lihat bentuk data state
    console.log(solved.patternData);
}