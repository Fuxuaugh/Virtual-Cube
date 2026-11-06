import { useEffect, useRef } from "react";
import { TwistyPlayer } from "cubing/twisty";
import { setupSpike04 } from "./spike04";
import { runSpike07 } from "./spike07";

export default function App() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Jalankan Spike 07 (Uji coba persistensi Dexie.js)
    runSpike07().catch((e) => console.error("spike07 gagal:", e));

    // Setup Spike 04 (TwistyPlayer)
    const player = new TwistyPlayer({
      puzzle: "3x3x3",
      tempoScale: 5,
      controlPanel: "none",
      background: "none",
      cameraLatitude: 35,
      cameraLongitude: 0,
    });
    player.style.width = "500px";
    player.style.height = "500px";
    player.style.pointerEvents = "none";
    box.current?.appendChild(player);

    let cleanup: (() => void) | undefined;
    setupSpike04(player).then((c) => (cleanup = c));

    return () => {
      cleanup?.();
      player.remove();
    };
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div ref={box} />
    </div>
  );
}