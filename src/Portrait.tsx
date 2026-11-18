import { useEffect, useRef } from "react";
import { spriteCanvas, loadSpriteArt, spriteWidth } from "./sprites";
import { jobs } from "./data";
import type { Unit } from "./engine";
export function Portrait({ u, size = 48 }: { u: Unit; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let mounted = true;
    const draw = () => {
      if (!mounted || !ref.current) return;
      const p = ref.current.getContext("2d")!;
      p.clearRect(0, 0, spriteWidth, spriteWidth);
      // A closer portrait keeps faces readable in the roster and turn order.
      p.drawImage(
        spriteCanvas(u.job, u.team === "enemy"),
        32,
        0,
        128,
        128,
        0,
        0,
        spriteWidth,
        spriteWidth,
      );
    };
    draw();
    void loadSpriteArt().then(draw);
    return () => {
      mounted = false;
    };
  }, [u.job, u.team]);
  return (
    <canvas
      ref={ref}
      width={spriteWidth}
      height={spriteWidth}
      style={{ width: size, height: size }}
      className="portrait"
      role="img"
      aria-label={jobs[u.job].name}
    />
  );
}
