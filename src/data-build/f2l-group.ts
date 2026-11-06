/**
 * Nama grup case F2L dari kolom `name` pada `data_source/f2l.csv`.
 *
 * PDF CubeSkills tidak memakai nomor case standar; labelnya "Basic Inserts 1",
 * "Case 1.1", "Incorrectly Connected 6", "Corner in Place 3", dst. Nama grup =
 * label tanpa nomor urutnya (angka di akhir, dengan atau tanpa titik).
 *
 * Contoh: "Basic Inserts 1" → "Basic Inserts", "Case 1.1" → "Case 1".
 */

const GROUP_PATTERN = /^(.*?)(?:\.\d+|\s+\d+)$/

export function f2lGroupFromName(name: string): string {
  const match = GROUP_PATTERN.exec(name.trim())
  if (!match) {
    throw new Error(
      `f2lGroupFromName: nama "${name}" tidak berakhiran nomor urut`
    )
  }
  return match[1].trim()
}
