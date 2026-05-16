import type { Extension } from '@codemirror/state';
import { renderLatex } from './latex-renderer.ts';

export function latexExtension(): Extension {
    return renderLatex;
}
