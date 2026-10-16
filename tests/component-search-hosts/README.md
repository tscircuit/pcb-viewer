Run `bun run test:component-search-hosts` with `runframe` and `tscircuit.com` checked out alongside this repository. Set `PCB_SEARCH_HOSTS_ROOT` to another directory containing those two checkouts if needed. Install dependencies in all three repositories and install Playwright Chromium first.

This test imports each host's actual `PcbViewerWithContainerHeight` source, substitutes the current built PCB viewer package, produces a minified Vite build, and serves it through Vite preview. Each host's installed Tailwind generates the preflight CSS. Tests cover desktop/mobile widths, search input focus and typing, selecting a bottom-layer component, contextual centering/zoom, the three-second outline, Escape dismissal, and the website's click-to-interact gate.

This is a production-mode wrapper integration test, not an end-to-end test of the deployed website, full RunFrame app, or WebGPU renderer. It uses the canvas renderer and a small known circuit so results do not depend on GPU availability, routing, registry access, or circuit compilation.

## Production rollout

1. Merge the PCB viewer search PR and publish its release through the repository's release workflow.
2. Update RunFrame's PCB viewer dependency to that published release and regenerate any lockfile used by its build. Build and publish RunFrame's library, standalone, standalone-preview, and iframe distributions; standalone bundles contain their own viewer code.
3. Update tscircuit.com's RunFrame dependency and direct PCB viewer dependency to the released versions. Run its existing `copy-runframe-versions` script to keep viewer dependencies aligned, regenerate `bun.lock`, and build/deploy the website.
4. Smoke-test a live package PCB tab (activate Click to Interact first), the editor's RunFrame PCB tab, and a standalone/iframe preview. Search for a known designator, click it, verify smooth zoom and temporary highlighting, and repeat on mobile.

A compatible semver range alone does not update an existing lockfile or previously built standalone bundle. Do not point production dependencies at an unpublished version or a local file path.
