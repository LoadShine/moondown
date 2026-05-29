import type { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, type EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { CSS_CLASSES, CUSTOM_EVENTS } from '../../core/constants';
import { renderBlockWidgets } from '../table/table-widget-rendering.ts';

interface KatexRenderOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    strict?: string;
    output?: 'htmlAndMathml' | 'html' | 'mathml';
    trust?: boolean;
}

interface KatexRuntime {
    renderToString?: (expression: string, options?: KatexRenderOptions) => string;
    render?: (expression: string, element: HTMLElement, options?: KatexRenderOptions) => void;
}

interface SourceRange {
    from: number;
    to: number;
}

const latexLanguages = new Set(['latex', 'katex', 'tex', 'math']);
let katexRuntimePromise: Promise<KatexRuntime | null> | null = null;

function splitLatexLines(definition: string): string[] {
    return definition
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

function normalizeLanguageTag(raw: string): string {
    const firstToken = raw.trim().split(/\s+/)[0] ?? '';
    return firstToken.toLowerCase();
}

function parseLatexDefinition(state: EditorState, node: SyntaxNodeRef): string | null {
    if (node.name !== 'FencedCode') {
        return null;
    }

    const infoNode = node.node.getChild('CodeInfo');
    if (!infoNode) {
        return null;
    }

    const language = normalizeLanguageTag(state.sliceDoc(infoNode.from, infoNode.to));
    if (!latexLanguages.has(language)) {
        return null;
    }

    const textNode = node.node.getChild('CodeText');
    if (!textNode) {
        return '';
    }

    return state.sliceDoc(textNode.from, textNode.to);
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return String(error);
}

function renderStatus(target: HTMLElement, className: string, message: string): void {
    target.innerHTML = '';
    const status = document.createElement('div');
    status.className = className;
    status.textContent = message;
    target.append(status);
}

async function getKatexRuntime(): Promise<KatexRuntime | null> {
    if (katexRuntimePromise) {
        return katexRuntimePromise;
    }

    katexRuntimePromise = (async () => {
        try {
            const imported = await import('katex');
            const runtimeCandidate = (imported.default ?? imported) as KatexRuntime;
            if (!runtimeCandidate || (typeof runtimeCandidate.renderToString !== 'function' && typeof runtimeCandidate.render !== 'function')) {
                return null;
            }
            return runtimeCandidate;
        } catch (error) {
            console.error('[MoondownLatex] Failed to load KaTeX runtime', error);
            return null;
        }
    })();

    return katexRuntimePromise;
}

async function renderLatexInto(target: HTMLElement, definition: string): Promise<void> {
    renderStatus(target, CSS_CLASSES.LATEX_LOADING, 'Rendering LaTeX...');

    if (definition.trim().length === 0) {
        renderStatus(target, CSS_CLASSES.LATEX_ERROR, 'LaTeX code block is empty.');
        return;
    }

    const runtime = await getKatexRuntime();
    if (!target.isConnected) {
        return;
    }

    if (!runtime) {
        renderStatus(target, CSS_CLASSES.LATEX_ERROR, 'KaTeX runtime is unavailable in this environment.');
        return;
    }

    const renderOptions: KatexRenderOptions = {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
        output: 'mathml',
        trust: false,
    };

    try {
        const lines = splitLatexLines(definition);
        if (lines.length === 0) {
            renderStatus(target, CSS_CLASSES.LATEX_ERROR, 'LaTeX code block is empty.');
            return;
        }

        target.innerHTML = '';

        for (const line of lines) {
            const lineTarget = document.createElement('div');
            lineTarget.className = 'cm-latex-line';
            target.append(lineTarget);

            if (!target.isConnected) {
                return;
            }

            if (typeof runtime.renderToString === 'function') {
                lineTarget.innerHTML = runtime.renderToString(line, renderOptions);
                continue;
            }

            if (typeof runtime.render === 'function') {
                runtime.render(line, lineTarget, renderOptions);
                continue;
            }

            renderStatus(target, CSS_CLASSES.LATEX_ERROR, 'KaTeX runtime does not support rendering API.');
            return;
        }

        return;
    } catch (error) {
        if (!target.isConnected) {
            return;
        }

        const message = toErrorMessage(error);
        renderStatus(target, CSS_CLASSES.LATEX_ERROR, `LaTeX render failed: ${message}`);
    }
}

function selectSourceBlock(view: EditorView, from: number, to: number): void {
    view.dispatch({
        selection: EditorSelection.single(from, to),
        scrollIntoView: true,
    });
    view.focus();
}

function findLatexRangeAt(
    state: EditorState,
    from: number,
    to: number,
): SourceRange | null {
    if (from < 0 || to > state.doc.length || from >= to) {
        return null;
    }

    let matchedRange: SourceRange | null = null;
    syntaxTree(state).iterate({
        from: Math.max(0, from - 1),
        to: Math.min(state.doc.length, to + 1),
        enter: (node) => {
            if (node.name !== 'FencedCode' || node.from !== from || node.to !== to) {
                return;
            }

            const parsed = parseLatexDefinition(state, node);
            if (parsed !== null) {
                matchedRange = { from, to };
            }
        },
    });

    return matchedRange;
}

function resolveLatexSourceRange(
    state: EditorState,
    fallbackFrom: number,
    fallbackTo: number,
    definition: string
): SourceRange {
    const directMatch = findLatexRangeAt(state, fallbackFrom, fallbackTo);
    if (directMatch) {
        return directMatch;
    }

    const normalizedDefinition = definition.replace(/\r\n/g, '\n').replace(/\n+$/g, '');
    const nearestRangeRef: {
        current: (SourceRange & { distance: number; matchesDefinition: boolean }) | null;
    } = { current: null };
    syntaxTree(state).iterate({
        from: 0,
        to: state.doc.length,
        enter: (node) => {
            if (node.name !== 'FencedCode') {
                return;
            }

            const parsed = parseLatexDefinition(state, node);
            if (parsed === null) {
                return;
            }

            const normalizedParsed = parsed.replace(/\r\n/g, '\n').replace(/\n+$/g, '');
            const distance = Math.abs(node.from - fallbackFrom);
            const matchesDefinition = normalizedParsed === normalizedDefinition;
            if (
                !nearestRangeRef.current ||
                (matchesDefinition && !nearestRangeRef.current.matchesDefinition) ||
                (matchesDefinition === nearestRangeRef.current.matchesDefinition && distance < nearestRangeRef.current.distance)
            ) {
                nearestRangeRef.current = {
                    from: node.from,
                    to: node.to,
                    distance,
                    matchesDefinition,
                };
            }
        },
    });

    if (nearestRangeRef.current) {
        return {
            from: nearestRangeRef.current.from,
            to: nearestRangeRef.current.to,
        };
    }

    const safeFrom = Math.max(0, Math.min(fallbackFrom, state.doc.length));
    const safeTo = Math.max(safeFrom, Math.min(fallbackTo, state.doc.length));
    return {
        from: safeFrom,
        to: safeTo,
    };
}

class LatexWidget extends WidgetType {
    constructor(
        readonly definition: string,
        private from: number,
        private to: number
    ) {
        super();
    }

    eq(other: LatexWidget): boolean {
        const isSameDefinition = this.definition === other.definition;
        // CodeMirror may preserve the previous widget instance when eq returns true.
        // Keep source range in sync so click handlers never use stale positions.
        this.from = other.from;
        this.to = other.to;
        return isSameDefinition;
    }

    toDOM(view: EditorView): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = CSS_CLASSES.LATEX_WIDGET;

        const canvas = document.createElement('div');
        canvas.className = CSS_CLASSES.LATEX_CANVAS;

        const hint = document.createElement('div');
        hint.className = CSS_CLASSES.LATEX_HINT;
        hint.textContent = 'LaTeX preview (click to select source).';

        wrapper.append(canvas, hint);

        wrapper.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const sourceRange = resolveLatexSourceRange(view.state, this.from, this.to, this.definition);
            this.from = sourceRange.from;
            this.to = sourceRange.to;
            selectSourceBlock(view, sourceRange.from, sourceRange.to);
            wrapper.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.WIDGET_EDIT_REQUEST, {
                bubbles: true,
                detail: {
                    from: sourceRange.from,
                    to: sourceRange.to,
                },
            }));
        });

        void renderLatexInto(canvas, this.definition);
        return wrapper;
    }

    ignoreEvent(): boolean {
        return true;
    }
}

function shouldHandleNode(node: SyntaxNodeRef): boolean {
    return node.name === 'FencedCode';
}

function createWidget(state: EditorState, node: SyntaxNodeRef): LatexWidget | undefined {
    const definition = parseLatexDefinition(state, node);
    if (definition === null) {
        return undefined;
    }

    return new LatexWidget(definition, node.from, node.to);
}

export const renderLatex = renderBlockWidgets(shouldHandleNode, createWidget);
