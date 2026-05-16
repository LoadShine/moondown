import type { Extension } from '@codemirror/state';
import { imageExtension } from '../image';
import { latexExtension } from '../latex';
import { markdownSyntaxHiding } from '../markdown-syntax-hiding';
import { mermaidExtension } from '../mermaid';
import { tableExtension } from '../table';

const wysiwygExtensionFactories: ReadonlyArray<() => Extension> = [
    tableExtension,
    imageExtension,
    mermaidExtension,
    latexExtension,
    markdownSyntaxHiding,
];

/**
 * WYSIWYG extension preset.
 * Built from factory functions to avoid accidental mutation.
 */
export const wysiwygExtensions: Extension[] = wysiwygExtensionFactories.map((factory) => factory());

export function resolveWysiwygExtensions(enabled: boolean): Extension[] {
    if (!enabled) {
        return [];
    }
    return [...wysiwygExtensions];
}
