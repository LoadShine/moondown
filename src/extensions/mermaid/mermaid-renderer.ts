import type { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, type EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { CSS_CLASSES, CUSTOM_EVENTS } from '../../core/constants';
import { renderBlockWidgets } from '../table/table-widget-rendering.ts';

interface MermaidRenderResult {
    svg: string;
    bindFunctions?: (element: Element) => void;
}

interface MermaidRuntime {
    initialize: (config: Record<string, unknown>) => void;
    render: (id: string, definition: string) => Promise<MermaidRenderResult> | MermaidRenderResult;
}

interface SourceRange {
    from: number;
    to: number;
}

let mermaidRuntimePromise: Promise<MermaidRuntime | null> | null = null;
let mermaidInitialized = false;
let renderIdCounter = 0;

function normalizeLanguageTag(raw: string): string {
    const firstToken = raw.trim().split(/\s+/)[0] ?? '';
    return firstToken.toLowerCase();
}

function parseMermaidDefinition(state: EditorState, node: SyntaxNodeRef): string | null {
    if (node.name !== 'FencedCode') {
        return null;
    }

    const infoNode = node.node.getChild('CodeInfo');
    if (!infoNode) {
        return null;
    }

    const language = normalizeLanguageTag(state.sliceDoc(infoNode.from, infoNode.to));
    if (language !== 'mermaid') {
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

async function getMermaidRuntime(): Promise<MermaidRuntime | null> {
    if (mermaidRuntimePromise) {
        return mermaidRuntimePromise;
    }

    mermaidRuntimePromise = (async () => {
        try {
            const imported = await import('mermaid');
            const runtimeCandidate = (imported.default ?? imported) as Partial<MermaidRuntime>;

            if (!runtimeCandidate || typeof runtimeCandidate.initialize !== 'function' || typeof runtimeCandidate.render !== 'function') {
                return null;
            }

            if (!mermaidInitialized) {
                runtimeCandidate.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    suppressErrorRendering: true,
                });
                mermaidInitialized = true;
            }

            return runtimeCandidate as MermaidRuntime;
        } catch (error) {
            console.error('[MoondownMermaid] Failed to load Mermaid runtime', error);
            return null;
        }
    })();

    return mermaidRuntimePromise;
}

async function renderMermaidInto(target: HTMLElement, definition: string): Promise<void> {
    renderStatus(target, CSS_CLASSES.MERMAID_LOADING, 'Rendering Mermaid diagram...');

    if (definition.trim().length === 0) {
        renderStatus(target, CSS_CLASSES.MERMAID_ERROR, 'Mermaid code block is empty.');
        return;
    }

    const runtime = await getMermaidRuntime();
    if (!target.isConnected) {
        return;
    }

    if (!runtime) {
        renderStatus(target, CSS_CLASSES.MERMAID_ERROR, 'Mermaid runtime is unavailable in this environment.');
        return;
    }

    try {
        const renderId = `moondown-mermaid-${renderIdCounter++}`;
        const result = await runtime.render(renderId, definition);
        if (!target.isConnected) {
            return;
        }

        target.innerHTML = result.svg;

        if (typeof result.bindFunctions === 'function') {
            result.bindFunctions(target);
        }
    } catch (error) {
        if (!target.isConnected) {
            return;
        }

        const message = toErrorMessage(error);
        renderStatus(target, CSS_CLASSES.MERMAID_ERROR, `Mermaid render failed: ${message}`);
    }
}

function selectSourceBlock(view: EditorView, from: number, to: number): void {
    view.dispatch({
        selection: EditorSelection.single(from, to),
        scrollIntoView: true,
    });
    view.focus();
}

function findMermaidRangeAt(
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

            const parsed = parseMermaidDefinition(state, node);
            if (parsed !== null) {
                matchedRange = { from, to };
            }
        },
    });

    return matchedRange;
}

function resolveMermaidSourceRange(
    state: EditorState,
    fallbackFrom: number,
    fallbackTo: number,
    definition: string
): SourceRange {
    const directMatch = findMermaidRangeAt(state, fallbackFrom, fallbackTo);
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

            const parsed = parseMermaidDefinition(state, node);
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

class MermaidWidget extends WidgetType {
    constructor(
        readonly definition: string,
        private from: number,
        private to: number
    ) {
        super();
    }

    eq(other: MermaidWidget): boolean {
        const isSameDefinition = this.definition === other.definition;
        // CodeMirror may preserve the previous widget instance when eq returns true.
        // Keep source range in sync so click handlers never use stale positions.
        this.from = other.from;
        this.to = other.to;
        return isSameDefinition;
    }

    toDOM(view: EditorView): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = CSS_CLASSES.MERMAID_WIDGET;

        const canvas = document.createElement('div');
        canvas.className = CSS_CLASSES.MERMAID_CANVAS;

        const hint = document.createElement('div');
        hint.className = CSS_CLASSES.MERMAID_HINT;
        hint.textContent = 'Mermaid diagram preview (click to select source).';

        wrapper.append(canvas, hint);

        wrapper.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const sourceRange = resolveMermaidSourceRange(view.state, this.from, this.to, this.definition);
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

        void renderMermaidInto(canvas, this.definition);
        return wrapper;
    }

    ignoreEvent(): boolean {
        return true;
    }
}

function shouldHandleNode(node: SyntaxNodeRef): boolean {
    return node.name === 'FencedCode';
}

function createWidget(state: EditorState, node: SyntaxNodeRef): MermaidWidget | undefined {
    const definition = parseMermaidDefinition(state, node);
    if (definition === null) {
        return undefined;
    }

    return new MermaidWidget(definition, node.from, node.to);
}

export const renderMermaid = renderBlockWidgets(shouldHandleNode, createWidget);
