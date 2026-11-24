import React, { useEffect, useRef } from "react";
import { gearArtwork, gearPixels, type IllustratedItem } from "./gear-art";
import "./gear-art.css";
export function GearIcon({
  item,
  size = 64,
}: {
  item: IllustratedItem;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    ref.current
      ?.getContext("2d")
      ?.putImageData(
        new ImageData(gearPixels(gearArtwork(item)), 64, 64),
        0,
        0,
      );
  }, [item]);
  return (
    <canvas
      ref={ref}
      width={64}
      height={64}
      className="gear-icon"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
