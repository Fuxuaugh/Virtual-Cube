import Dexie from "dexie";

const db = new Dexie("spike");
db.version(1).stores({ notes: "++id, createdAt" });

export async function runSpike07() {
    const before = await db.table("notes").count();
    console.log("jumlah catatan sebelum:", before);
    await db.table("notes").add({ text: "halo", createdAt: Date.now() });
    const after = await db.table("notes").count();
    console.log("jumlah catatan sesudah:", after);
}