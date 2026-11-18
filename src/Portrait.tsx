import { useEffect, useRef } from "react";
import { spriteCanvas } from "./scene";
import { jobs } from "./data";
import type { Unit } from "./engine";

export function Portrait({ u, size = 48 }: { u: Unit; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!,
      p = c.getContext("2d")!;
    p.clearRect(0, 0, 32, 42);
    p.drawImage(spriteCanvas(u.job, u.team === "enemy"), 0, 0);
  }, [u.job, u.team]);
  return (
    <canvas
      ref={ref}
      width="32"
      height="42"
      style={{ width: size, height: (size * 42) / 32 }}
      className="portrait"
      aria-label={jobs[u.job].name}
    />
  );
}
