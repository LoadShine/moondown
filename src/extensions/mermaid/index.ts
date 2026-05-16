import type { Extension } from '@codemirror/state';
import { renderMermaid } from './mermaid-renderer.ts';

export function mermaidExtension(): Extension {
    return renderMermaid;
}
