import { useEffect, useRef } from "react";
import { TwistyPlayer } from "cubing/twisty";
import { runSpike03 } from "./spike03";

export default function App() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    runSpike03().catch((e) => console.error("spike03 gagal:", e));

    const player = new TwistyPlayer({
      puzzle: "3x3x3",
      alg: "R U R' U'",
      controlPanel: "none",
      background: "none",
      cameraLatitude: 35,
      cameraLongitude: 0,
    });
    player.style.width = "500px";
    player.style.height = "500px";
    player.style.pointerEvents = "none";
    box.current?.appendChild(player);
    return () => {
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