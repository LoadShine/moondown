import type { EditorState } from '@codemirror/state';
import { parseMarkdownImage } from '../../core/utils/string-utils';

const latexLanguages = new Set(['latex', 'katex', 'tex', 'math']);

export type WidgetEditTargetKind = 'image' | 'mermaid' | 'latex';

export interface WidgetEditTarget {
    kind: WidgetEditTargetKind;
    from: number;
    to: number;
    originalMarkdown: string;
    value: string;
    title: string;
    placeholder: string;
    multiline: boolean;
    applyLabel: string;
    buildUpdatedMarkdown: (nextValue: string) => string;
}

interface ParsedFencedCodeBlock {
    openingLine: string;
    closingLine: string;
    language: string;
    body: string;
}

function parseFencedCodeBlock(markdown: string): ParsedFencedCodeBlock | null {
    const normalized = markdown.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    if (lines.length < 2) {
        return null;
    }

    const openingLine = lines[0];
    const closingLine = lines[lines.length - 1];
    if (!openingLine.startsWith('```') || !closingLine.startsWith('```')) {
        return null;
    }

    const infoString = openingLine.slice(3).trim();
    const language = infoString.split(/\s+/)[0]?.toLowerCase() ?? '';
    const body = lines.slice(1, -1).join('\n');

    return {
        openingLine,
        closingLine,
        language,
        body,
    };
}

function buildFencedCodeBlock(openingLine: string, closingLine: string, nextValue: string): string {
    const normalizedBody = nextValue.replace(/\r\n/g, '\n').replace(/\n$/, '');
    if (normalizedBody.length === 0) {
        return `${openingLine}\n${closingLine}`;
    }
    return `${openingLine}\n${normalizedBody}\n${closingLine}`;
}

function resolveImageTarget(markdown: string, from: number, to: number): WidgetEditTarget | null {
    const image = parseMarkdownImage(markdown);
    if (!image) {
        return null;
    }

    return {
        kind: 'image',
        from,
        to,
        originalMarkdown: markdown,
        value: image.src,
        title: 'Edit Image URL',
        placeholder: 'https://example.com/image.png',
        multiline: false,
        applyLabel: 'Apply',
        buildUpdatedMarkdown: (nextValue: string) => `![${image.alt}](${nextValue.trim()})`,
    };
}

function resolveFencedCodeTarget(markdown: string, from: number, to: number): WidgetEditTarget | null {
    const block = parseFencedCodeBlock(markdown);
    if (!block) {
        return null;
    }

    if (block.language === 'mermaid') {
        return {
            kind: 'mermaid',
            from,
            to,
            originalMarkdown: markdown,
            value: block.body,
            title: 'Edit Mermaid Source',
            placeholder: 'flowchart TD\n  A --> B',
            multiline: true,
            applyLabel: 'Apply',
            buildUpdatedMarkdown: (nextValue: string) =>
                buildFencedCodeBlock(block.openingLine, block.closingLine, nextValue),
        };
    }

    if (latexLanguages.has(block.language)) {
        return {
            kind: 'latex',
            from,
            to,
            originalMarkdown: markdown,
            value: block.body,
            title: 'Edit LaTeX Source',
            placeholder: '\\frac{a}{b}',
            multiline: true,
            applyLabel: 'Apply',
            buildUpdatedMarkdown: (nextValue: string) =>
                buildFencedCodeBlock(block.openingLine, block.closingLine, nextValue),
        };
    }

    return null;
}

export function resolveWidgetEditTarget(
    state: EditorState,
    from: number,
    to: number
): WidgetEditTarget | null {
    if (from === to) {
        return null;
    }

    const markdown = state.sliceDoc(from, to);
    return resolveImageTarget(markdown, from, to) ?? resolveFencedCodeTarget(markdown, from, to);
}

export function isWidgetEditableSelection(
    state: EditorState,
    from: number,
    to: number
): boolean {
    return resolveWidgetEditTarget(state, from, to) !== null;
}
