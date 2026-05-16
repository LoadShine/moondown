# Moondown Architecture

This document defines the engineering baseline used for the refactored Moondown codebase.

## Layered Design

1. `src/moondown.ts` and `src/editor/moondown-editor.ts`
- Public facade.
- Maintains backward-compatible API surface.

2. `src/editor/runtime/*`
- Editor lifecycle orchestration (`EditorState` creation, `EditorView` management, runtime reconfiguration).
- No product-specific UI logic.

3. `src/editor/config/*`
- Configuration normalization and defaults.
- Converts optional external config into deterministic runtime config.

4. `src/extensions/runtime/*`
- Shared runtime state contracts (`Compartment`, `StateEffect`, `StateField`).
- Feature plugins consume this layer but should not depend on extension presets.

5. `src/extensions/*`
- Product capabilities (slash menu, bubble menu, table, image, etc.).
- Each feature module owns only its behavior and local UI logic.
- Prefer submodules per concern (for example `*-items`, `*-dom`, `*-positioning`, `*-popover`, `*-edge-buttons`) instead of monolithic files.
- For bubble menu content transforms, keep block transforms in `content-block-actions`, inline transforms in `content-inline-actions`, and active-state checks in `content-active-state`, with `content-functions` as a compatibility facade.
- For table editing specifically, keep mutation logic in `table-editor-model`, cursor movement in `table-editor-navigation`, DOM build/selection helpers in `table-editor-dom`, and orchestration in `table-editor`.
- For table widget rendering, keep save orchestration in `table-widget-save`, range/lookup logic in `table-widget-position`, and syntax-tree rendering glue in `table-widget-rendering`.
- For table helper styles, keep CSS text generation in `table-helper-styles` and style-node injection in `compute-css`.
- For image widgets, keep widget state/orchestration in `image-widgets` and reusable DOM/drag/change helpers in `image-widget-helpers`.
- For Mermaid widgets, keep fenced-code detection and widget construction in `mermaid-renderer`, with runtime loading/rendering isolated from editor lifecycle failures.
- For LaTeX widgets, keep fenced-code detection and KaTeX rendering in `latex-renderer`, with runtime loading/rendering isolated from editor lifecycle failures.
- For markdown syntax hiding, keep shared contracts in `types`, structural handlers in `node-structural-handlers`, inline handlers in `node-inline-handlers`, footnote logic in `footnote-handlers`, link-definition logic in `link-definition-handlers`, and preserve `node-handlers` / `reference-handlers` as compatibility re-export boundaries.

6. `src/core/*`
- Stable domain types, constants, pure utilities.
- Keep framework/runtime details minimal in this layer.

7. `src/theme/*`
- Keep visual tokens in `theme-palette`, highlight rules in `theme-highlight-style`, editor style-object construction in `theme-editor-styles`, and CodeMirror theme composition in `base-theme`.

8. `src/plugins/*`
- Public plugin authoring helpers (`defineMoondownPlugin`, `createExtensionPlugin`).
- Plugin contracts are declared in `core/types/editor-types` and executed by `editor/runtime/editor-plugin-runtime`.
- Plugin runtime hooks (`setup` / `onViewCreated` / `onUpdate` / `onDestroy`) are error-isolated per plugin.
- Plugin-contributed slash commands are collected at runtime and merged into slash menu resolution.
- Plugin scaffold generation is handled by `scripts/create-plugin-scaffold.mjs` and documented in `README.md`.

## Dependency Rules

1. Facade may depend on runtime/config/extensions.
2. Runtime may depend on extension presets and runtime state contracts.
2.1 Runtime owns plugin lifecycle orchestration; feature modules must not call plugin hooks directly.
3. Feature extensions must depend on `extensions/runtime/*` for shared state, not on extension preset assembly files.
4. `core/*` must not import from `extensions/*` or `editor/*`.
5. `plugins/*` may depend on `core/*` but should not depend on concrete feature implementations under `extensions/*`.
6. Avoid circular dependencies; shared contracts belong in dedicated runtime modules.

## Engineering Standards

1. Keep public API methods thin and deterministic.
2. Prefer explicit config normalization over scattered default values.
3. Use immutable copies when storing user-provided objects (for example translations).
4. Add tests for behavior changes and regressions before large feature rewrites.
5. Keep modules focused; if a file grows beyond ~300 lines, split by responsibility where practical.
