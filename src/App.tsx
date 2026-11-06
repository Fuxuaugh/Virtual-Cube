import { useEffect, useRef } from "react";
import { TwistyPlayer } from "cubing/twisty";

export default function App() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const player = new TwistyPlayer({
      puzzle: "3x3x3",
      alg: "",
      controlPanel: "none",
      background: "none",
      hintFacelets: "floating",
      cameraLatitude: 35,
      cameraLongitude: 0,
    });
    player.style.width = "600px";
    player.style.height = "600px";
    player.style.pointerEvents = "none"; // mematikan drag mouse
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

