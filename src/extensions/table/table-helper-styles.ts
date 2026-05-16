export function buildTableHelperStyles(edgeButtonSize: number): string {
    return `
  table.table-helper {
    width: 100%;
    display: inline-table;
    border: 0.5px solid rgba(60, 60, 67, 0.18);
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02), 0 18px 38px rgba(0, 0, 0, 0.05);
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  table.table-helper:hover {
    border-color: hsl(var(--color-primary-hsl) / 0.24);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02), 0 22px 44px rgba(0, 0, 0, 0.07);
  }

  table.table-helper tr:first-child {
    background: #f5f5f7;
    color: #1d1d1f;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.005em;
  }

  table.table-helper tr:first-child td {
    border-right: 0.5px solid rgba(60, 60, 67, 0.10);
  }

  table.table-helper tr:first-child td:last-child {
    border-right: none;
  }

  table.table-helper tr:not(:first-child) {
    transition: background-color 0.14s ease;
  }

  table.table-helper tr:not(:first-child):hover {
    background: rgba(60, 60, 67, 0.025);
  }

  table.table-helper td {
    min-width: 150px;
    height: ${edgeButtonSize * 1.5}px;
    padding: 12px 16px;
    position: relative;
    border-bottom: 0.5px solid rgba(60, 60, 67, 0.10);
    border-right: 0.5px solid rgba(60, 60, 67, 0.10);
    color: #1d1d1f;
    caret-color: hsl(var(--color-primary-hsl));
    line-height: 1.55;
    transition: background-color 0.14s ease, box-shadow 0.14s ease;
  }

  table.table-helper td:last-child {
    border-right: none;
  }

  table.table-helper tr:last-child td {
    border-bottom: none;
  }

  table.table-helper td:focus {
    z-index: 1;
    outline: none;
    background: hsl(var(--color-primary-hsl) / 0.08);
    box-shadow:
      inset 0 0 0 1px hsl(var(--color-primary-hsl)),
      0 0 0 3px hsl(var(--color-primary-hsl) / 0.14);
  }

  table.table-helper tr:first-child td:first-child {
    border-top-left-radius: 11px;
  }

  table.table-helper tr:first-child td:last-child {
    border-top-right-radius: 11px;
  }

  table.table-helper tr:last-child td:first-child {
    border-bottom-left-radius: 11px;
  }

  table.table-helper tr:last-child td:last-child {
    border-bottom-right-radius: 11px;
  }

  table.table-helper td em {
    font-style: italic;
  }

  table.table-helper td strong {
    color: #1d1d1f;
    font-weight: 600;
  }

  table.table-helper td code {
    padding: 2px 6px;
    border: 0.5px solid #d1d1d6;
    border-radius: 6px;
    background: #f2f2f7;
    color: #d70015;
    font-family: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
  }

  table.table-helper td del {
    text-decoration: line-through;
    opacity: 0.55;
  }

  table.table-helper td mark {
    padding: 2px 6px;
    border-radius: 6px;
    background: #fff2b2;
    color: #5f4b00;
  }

  table.table-helper td u {
    text-decoration: underline;
    text-decoration-color: hsl(var(--color-primary-hsl));
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  .table-helper-operate-button {
    z-index: 3;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0.5px solid rgba(60, 60, 67, 0.18);
    background: rgba(255, 255, 255, 0.92);
    color: #6e6e73;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.10);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;
  }

  .table-helper-operate-button.is-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .table-helper-operate-button:hover {
    color: hsl(var(--color-primary-hsl));
    border-color: hsl(var(--color-primary-hsl) / 0.45);
    background: rgba(255, 255, 255, 1);
    transform: scale(1.06);
  }

  .table-helper-operate-button:active {
    transform: scale(0.94);
  }

  .table-helper-operate-button.top,
  .table-helper-operate-button.bottom {
    width: ${edgeButtonSize * 1.2}px;
    height: ${edgeButtonSize * 0.6}px;
    border-radius: ${edgeButtonSize * 0.3}px;
  }

  .table-helper-operate-button.left,
  .table-helper-operate-button.right {
    width: ${edgeButtonSize * 0.6}px;
    height: ${edgeButtonSize * 1.2}px;
    border-radius: ${edgeButtonSize * 0.3}px;
  }

  .dark table.table-helper {
    border-color: rgba(84, 84, 88, 0.5);
    background: #1c1c1e;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 22px 44px rgba(0, 0, 0, 0.42);
  }

  .dark table.table-helper:hover {
    border-color: hsl(var(--color-primary-light-hsl) / 0.34);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04), 0 26px 52px rgba(0, 0, 0, 0.5);
  }

  .dark table.table-helper tr:first-child {
    background: #2c2c2e;
    color: #f5f5f7;
  }

  .dark table.table-helper tr:first-child td,
  .dark table.table-helper td {
    border-right-color: rgba(84, 84, 88, 0.28);
    border-bottom-color: rgba(84, 84, 88, 0.28);
  }

  .dark table.table-helper tr:not(:first-child):hover {
    background: rgba(255, 255, 255, 0.025);
  }

  .dark table.table-helper td {
    color: #f5f5f7;
    caret-color: hsl(var(--color-primary-light-hsl));
  }

  .dark table.table-helper td:focus {
    background: hsl(var(--color-primary-light-hsl) / 0.16);
    box-shadow:
      inset 0 0 0 1px hsl(var(--color-primary-light-hsl)),
      0 0 0 3px hsl(var(--color-primary-light-hsl) / 0.22);
  }

  .dark table.table-helper td strong {
    color: #ffffff;
  }

  .dark table.table-helper td code {
    border-color: #3a3a3c;
    background: #2c2c2e;
    color: #ff6482;
  }

  .dark table.table-helper td mark {
    background: #5f4b00;
    color: #fff2b2;
  }

  .dark table.table-helper td u {
    text-decoration-color: hsl(var(--color-primary-light-hsl));
  }

  .dark .table-helper-operate-button {
    border-color: rgba(84, 84, 88, 0.5);
    background: rgba(44, 44, 46, 0.94);
    color: #a1a1a6;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5);
  }

  .dark .table-helper-operate-button:hover {
    color: hsl(var(--color-primary-light-hsl));
    border-color: hsl(var(--color-primary-light-hsl) / 0.54);
    background: rgba(44, 44, 46, 1);
  }

  .tippy-box[data-theme~='custom'] {
    border: 0.5px solid rgba(60, 60, 67, 0.18);
    border-radius: 13px;
    background: rgba(255, 255, 255, 0.86);
    color: #1d1d1f;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.14);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    font-size: 13px;
    padding: 0;
  }

  .tippy-box[data-theme~='custom'][data-placement^='bottom'] > .tippy-arrow::before {
    border-bottom-color: rgba(255, 255, 255, 0.86);
  }

  .tippy-box[data-theme~='custom'][data-placement^='top'] > .tippy-arrow::before {
    border-top-color: rgba(255, 255, 255, 0.86);
  }

  .tippy-box[data-theme~='custom'][data-placement^='right'] > .tippy-arrow::before {
    border-right-color: rgba(255, 255, 255, 0.86);
  }

  .tippy-box[data-theme~='custom'][data-placement^='left'] > .tippy-arrow::before {
    border-left-color: rgba(255, 255, 255, 0.86);
  }

  .tippy-box[data-theme~='custom'] .tippy-content {
    padding: 0;
  }

  .table-action-popover {
    display: flex;
    gap: 2px;
    padding: 5px;
  }

  .tippy-button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #6e6e73;
    cursor: pointer;
    padding: 6px;
    font-size: 14px;
    transition: background-color 0.14s ease, color 0.14s ease, transform 0.12s ease;
  }

  .tippy-button:hover {
    background: rgba(60, 60, 67, 0.08);
    color: hsl(var(--color-primary-hsl));
  }

  .tippy-button:active {
    transform: scale(0.96);
  }

  .tippy-button i {
    display: block;
    width: 18px;
    height: 18px;
  }

  .alignment-options {
    gap: 2px;
  }

  .alignment-options .tippy-button {
    aspect-ratio: 1;
  }

  .dark .tippy-box[data-theme~='custom'] {
    border-color: rgba(84, 84, 88, 0.5);
    background: rgba(28, 28, 30, 0.86);
    color: #f5f5f7;
    box-shadow: 0 28px 64px rgba(0, 0, 0, 0.56);
  }

  .dark .tippy-box[data-theme~='custom'][data-placement^='bottom'] > .tippy-arrow::before {
    border-bottom-color: rgba(28, 28, 30, 0.86);
  }

  .dark .tippy-box[data-theme~='custom'][data-placement^='top'] > .tippy-arrow::before {
    border-top-color: rgba(28, 28, 30, 0.86);
  }

  .dark .tippy-box[data-theme~='custom'][data-placement^='right'] > .tippy-arrow::before {
    border-right-color: rgba(28, 28, 30, 0.86);
  }

  .dark .tippy-box[data-theme~='custom'][data-placement^='left'] > .tippy-arrow::before {
    border-left-color: rgba(28, 28, 30, 0.86);
  }

  .dark .tippy-button {
    color: #a1a1a6;
  }

  .dark .tippy-button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: hsl(var(--color-primary-light-hsl));
  }
  `;
}
