import React, { useEffect, useState } from "react";
import {
  exportValidationReport,
  type ProjectValidation,
  type ValidationTarget,
} from "./studio-validation";
export function ValidationPanel({
  report,
  title = "Project validation",
  onInspect,
  disabled = false,
  pending = false,
  onDismiss,
}: {
  report: ProjectValidation;
  title?: string;
  onInspect?: (target: ValidationTarget) => void;
  disabled?: boolean;
  pending?: boolean;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(report.errors > 0),
    [filter, setFilter] = useState("all");
  useEffect(() => {
    if (report.errors > 0) setOpen(true);
  }, [report.errors]);
  const visible = report.findings.filter(
    (f) => filter === "all" || f.severity === filter,
  );
  return (
    <section className="validation-panel" aria-label={title}>
      <div className="validation-heading">
        <div>
          <h2>{title}</h2>
          <p className="validation-counts">
            {report.errors} {report.errors === 1 ? "error" : "errors"} ·{" "}
            {report.warnings} {report.warnings === 1 ? "warning" : "warnings"}
            {report.revision !== null ? ` · Revision ${report.revision}` : ""}
          </p>
        </div>
        <div className="actions">
          <button aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Hide findings" : "Show findings"}
          </button>
          {onDismiss && (
            <button onClick={onDismiss}>Dismiss import report</button>
          )}
        </div>
      </div>
      <p className="validation-scope">
        {onDismiss
          ? "Rejected import only. These findings do not describe or change your open project."
          : pending
            ? "Checks describe the applied revision. Apply or discard pending drafts before playtesting or following a finding."
            : report.errors
              ? "Errors block playtesting. Fix the source before continuing."
              : "No blocking errors. Warnings need review and do not block playtesting."}
      </p>
      {open && (
        <>
          <div className="validation-tools">
            <label>
              Finding severity
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All findings</option>
                <option value="error">Errors</option>
                <option value="warning">Warnings</option>
              </select>
            </label>
            <button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([exportValidationReport(report)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "echoes-validation-report.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Export validation report
            </button>
          </div>
          {visible.length === 0 ? (
            <p>
              {report.findings.length === 0
                ? "No findings from the implemented checks. Playtest routes, abilities and mission balance before sharing."
                : "No findings match this filter."}
            </p>
          ) : (
            <ol className="validation-findings">
              {visible.map((f) => (
                <li key={f.id} data-severity={f.severity}>
                  <div className="finding-heading">
                    <span className="finding-severity">
                      {f.severity === "error" ? "Error" : "Warning"}
                    </span>
                    <h3>{f.title}</h3>
                  </div>
                  <p>{f.detail}</p>
                  <p>
                    <strong>Fix:</strong> {f.fix}
                  </p>
                  {onInspect && (
                    <button
                      disabled={disabled}
                      onClick={() => onInspect(f.target)}
                    >
                      {f.target.area === "map"
                        ? `Inspect tile ${f.target.x}, ${f.target.z}`
                        : f.target.area === "content"
                          ? `Inspect ${f.target.section === "actors" ? "actor" : f.target.section === "dialogue" ? "dialogue" : "contract"} ${f.target.id}`
                          : f.target.area === "rules"
                            ? `Inspect ${f.target.section === "skills" ? "ability" : f.target.section === "gear" ? "gear" : "job"} ${f.target.id}`
                            : "Inspect project source"}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p className="validation-scope">
            Ground checks ignore occupancy, turn movement budgets, ranged
            attacks and terrain-changing skills. They cannot certify mission
            completion or balance.
          </p>
        </>
      )}
    </section>
  );
}
