import React, { useEffect, useMemo, useRef, useState } from "react";
import { mapDimensions } from "./map-layout";
import { overlayCellIndex } from "./studio-connectivity";
import type { ProjectFinding } from "./studio-validation";
import type { LevelProject } from "./studio-project";
export function ConnectivityMap({
  finding,
  project,
  onInspect,
  onClear,
  focusSerial,
  disabled = false,
}: {
  finding: ProjectFinding;
  focusSerial: number;
  disabled?: boolean;
  project: LevelProject;
  onInspect: (x: number, z: number) => void;
  onClear: () => void;
}) {
  const overlay = finding.mapOverlay!,
    d = mapDimensions(project),
    root = useRef<HTMLElement>(null),
    [edge, setEdge] = useState(0);
  const index = useMemo(() => overlayCellIndex(overlay), [overlay]);
  useEffect(() => {
    setEdge(0);
    root.current?.focus();
  }, [finding.id, focusSerial]);
  useEffect(() => setEdge(0), [project.revision]);
  return (
    <section
      className="connectivity-overlay"
      aria-label="Connectivity map overlay"
      tabIndex={-1}
      ref={root}
    >
      <div className="connectivity-heading">
        <div>
          <h2>Connectivity overlay</h2>
          <p>
            {finding.title} · Revision {project.revision}
          </p>
        </div>
        <button onClick={onClear}>Clear overlay</button>
      </div>
      <div className="connectivity-layout">
        <div>
          <svg
            className="connectivity-overview"
            role="img"
            aria-label={"Connectivity overview: " + finding.title}
            viewBox={`-0.5 -0.5 ${d.width + 1} ${d.height + 1}`}
          >
            {project.tiles.map((t) => {
              const info = index.get(t.x + "," + t.z),
                role = info?.role ?? "";
              const base = t.blocked
                ? "#b6beb0"
                : {
                    grass: "#c5d3b4",
                    stone: "#d9d9c8",
                    water: "#a8c8cc",
                    ice: "#d4e7e1",
                  }[t.terrain];
              return (
                <g
                  key={t.x + "," + t.z}
                  data-overlay-cell={t.x + "," + t.z}
                  data-overlay-role={role}
                >
                  <rect
                    x={t.x}
                    y={t.z}
                    width={0.94}
                    height={0.94}
                    fill={
                      info?.affected
                        ? "#e6c877"
                        : info?.reference
                          ? "#c3d6bf"
                          : base
                    }
                    stroke={
                      role === "barrier"
                        ? "#954626"
                        : role === "affected"
                          ? "#946f23"
                          : role === "reference"
                            ? "#536a55"
                            : "none"
                    }
                    strokeWidth={0.08}
                    strokeDasharray={
                      role === "reference" ? "0.18 0.12" : undefined
                    }
                  />
                  {role === "barrier" && (
                    <path
                      d={`M${t.x + 0.18} ${t.z + 0.18}l0.58 0.58m0 -0.58l-0.58 0.58`}
                      stroke="#954626"
                      strokeWidth={0.11}
                    />
                  )}
                </g>
              );
            })}
            {overlay.referenceActors.map((a) => (
              <path
                key={a.id}
                d={`M${a.x + 0.47} ${a.z + 0.14}l0.32 0.62h-0.64z`}
                fill="#ffffff"
                stroke="#263b31"
                strokeWidth={0.09}
              />
            ))}
            {overlay.affectedActors.map((a) => (
              <circle
                key={a.id}
                cx={a.x + 0.47}
                cy={a.z + 0.47}
                r={0.29}
                fill="#263b31"
                stroke="#ffffff"
                strokeWidth={0.08}
              />
            ))}
          </svg>
          <p className="connectivity-caption">
            North ↑ · Read-only overview. Inspect buttons reveal editable map
            cells below.
          </p>
        </div>
        <div className="connectivity-details">
          <ul className="connectivity-legend">
            <li>
              <span className="legend-affected" aria-hidden="true" />
              Affected ground: {overlay.affectedCells.length} tiles
            </li>
            <li>
              <span className="legend-reference" aria-hidden="true" />
              Reference ground: {overlay.referenceCells.length} tiles
            </li>
            <li>
              <span className="legend-barrier" aria-hidden="true">
                ×
              </span>
              Barrier edges: {overlay.barriers.length} tiles
            </li>
          </ul>
          <p className="connectivity-caption">
            Solid ground marks the affected region; dashed ground marks
            reference regions. Crosses mark adjacent water, collision or
            elevation edges. Filled circles are affected actors; triangles are
            reference spawns.
          </p>
          <h3>Affected actors ({overlay.affectedActors.length})</h3>
          {overlay.affectedActors.length ? (
            <ul className="connectivity-actors">
              {overlay.affectedActors.map((a) => (
                <li key={a.id}>
                  <button
                    disabled={disabled}
                    onClick={() => onInspect(a.x, a.z)}
                  >
                    Inspect {a.name} on map
                  </button>
                  <span>
                    {a.x}, {a.z} · {a.team}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No actors start in the highlighted islands.</p>
          )}
          <div className="actions">
            <button
              disabled={disabled}
              onClick={() =>
                onInspect(
                  finding.target.area === "map"
                    ? finding.target.x
                    : overlay.affectedCells[0].x,
                  finding.target.area === "map"
                    ? finding.target.z
                    : overlay.affectedCells[0].z,
                )
              }
            >
              Focus affected ground
            </button>
            <button
              disabled={disabled || !overlay.barriers.length}
              onClick={() => {
                const at = overlay.barriers[edge % overlay.barriers.length];
                onInspect(at.x, at.z);
                setEdge((edge + 1) % overlay.barriers.length);
              }}
            >
              Inspect barrier{" "}
              {overlay.barriers.length
                ? (edge % overlay.barriers.length) + 1
                : 0}{" "}
              of {overlay.barriers.length}
            </button>
          </div>
        </div>
      </div>
      <p className="connectivity-caption">
        Barrier edges are inspection candidates, not a proven repair. Opening
        one cell may leave a wider obstacle. Ranged attacks and terrain-changing
        skills are not simulated.
      </p>
    </section>
  );
}
