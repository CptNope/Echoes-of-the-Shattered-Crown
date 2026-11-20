# ADR-0009: Build, validate and publish GitHub Pages through Actions

[ADR index](README.md) · [Architecture](../ARCHITECTURE.md)

- Status: Accepted
- Recorded: 2026-11-19
- Decision date: Not recorded; reconstructed from current v0.8 implementation
- Origin: Retrospective
- Supersedes: None
- Superseded by: None

This is a retrospective record of the implemented baseline. The alternatives and rationale are present-day analysis, not a transcript of an earlier approval or an invented original date.

## Context

The repository site is hosted under a project subpath. Publishing source directly or assuming root-relative asset paths can produce a page that loads HTML but fails to load the game or art.

## Decision

Use the Pages workflow to install locked dependencies, check documentation/catalog/planning integrity, run deterministic tests, build for the repository base path, verify built assets, and publish only dist. Main publishing events deploy through the workflow token/OIDC; pull requests validate without deployment. Verify live code and character/effect assets after deployment.

## Alternatives considered

| Alternative | Tradeoff |
| --- | --- |
| Publish raw TypeScript/source files | Skips the production build contract. |
| Manually copy generated files | Makes validation and deployed-source provenance harder to reproduce. |
| Assume site-root hosting | Breaks project-subpath URLs. |
| Treat a successful upload as full release certification | Does not establish live assets, supported-device behavior or save/route safety. |

## Consequences

Build/deployment is reproducible and requires no application backend or manually stored publishing token. Markdown documentation renders in GitHub's repository viewer; there is no generated docs site in Pages. A green workflow is operational evidence, not a complete release/device/accessibility certification.

## Evidence and verification

[pages.yml](../../.github/workflows/pages.yml), [vite.config.ts](../../vite.config.ts), [verify-pages.mjs](../../scripts/verify-pages.mjs) and [deployment guide](../DEPLOYMENT.md) describe the current pipeline.

## Revisit conditions

Revisit for a custom host/domain, approved offline behavior, separate docs site or changed distribution requirements. Preserve origin/save-transfer and rollback implications.

## Related records

- [ADR-0003](0003-browser-client-stack.md)
- [ADR-0008](0008-art-manifests-and-provenance.md)

