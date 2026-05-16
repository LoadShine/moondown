import { RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';
import {
    type DecorationItem,
    type HandlerContext,
    handleFencedCode,
    handleBlockquote,
    handleHorizontalRule,
    handleOrderedListLineMarker,
    handleListItem,
    handleEmphasis,
    handleInlineCode,
    handleHeading,
    handleLink,
    handleStrikethrough,
    handleMark,
    handleUnderline,
    handleImage,
    handleLinkDefinition,
    handleFootnoteDefinition
} from "./node-handlers";

/**
 * StateEffect to toggle the syntax hiding feature.
 */
export const toggleSyntaxHidingEffect = StateEffect.define<boolean>();

/**
 * StateField to hold the current enabled/disabled state of syntax hiding.
 */
export const syntaxHidingState = StateField.define<boolean>({
    create: () => true, // Enabled by default
    update(value, tr) {
        for (const e of tr.effects) {
            if (e.is(toggleSyntaxHidingEffect)) {
                return e.value;
            }
        }
        return value;
    },
});

/**
 * Mapping of Lezer syntax node names to their corresponding decoration handlers.
 */
type NodeHandler = (ctx: HandlerContext, node: SyntaxNodeRef) => DecorationItem[];
const NODE_HANDLERS: Record<string, NodeHandler> = {
    'FencedCode': (ctx) => handleFencedCode(ctx),
    'Blockquote': (ctx) => handleBlockquote(ctx),
    'HorizontalRule': (ctx) => handleHorizontalRule(ctx),
    'ListItem': (ctx, node) => handleListItem(ctx, node),
    'Emphasis': (ctx) => handleEmphasis(ctx, false),
    'StrongEmphasis': (ctx) => handleEmphasis(ctx, true),
    'InlineCode': (ctx) => handleInlineCode(ctx),
    'Link': (ctx) => handleLink(ctx),
    'Strikethrough': (ctx) => handleStrikethrough(ctx),
    'Mark': (ctx) => handleMark(ctx),
    'Underline': (ctx) => handleUnderline(ctx),
    'Image': (ctx) => handleImage(ctx),
    'LinkReference': (ctx) => handleLink(ctx),
};

/**
 * Special handler for ATX heading nodes (e.g., ATXHeading1, ATXHeading2).
 */
function handleATXHeading(ctx: HandlerContext, nodeName: string): DecorationItem[] {
    const headerLevel = parseInt(nodeName.slice(-1));
    return handleHeading(ctx, headerLevel);
}

/**
 * Builds visible decorations for hiding markdown syntax.
 */
function buildMarkdownSyntaxHidingDecorations(view: EditorView): DecorationSet {
    const decorations: DecorationItem[] = [];
    const { state } = view;
    const selection = state.selection.main;
    const isHidingEnabled = state.field(syntaxHidingState);

    const processedBlockquotes = new Set<string>();
    const processedDefinitionLines = new Set<number>();
    const seenNodes = new Set<string>();
    const seenLines = new Set<number>();

    for (const visibleRange of view.visibleRanges) {
        const firstLine = state.doc.lineAt(visibleRange.from);
        const lastLine = state.doc.lineAt(visibleRange.to);

        for (let lineNum = firstLine.number; lineNum <= lastLine.number; lineNum++) {
            if (seenLines.has(lineNum)) {
                continue;
            }
            seenLines.add(lineNum);

            const line = state.doc.line(lineNum);
            const lineText = line.text;

            if (/^\[\^([^\]]+)\]:\s*/.test(lineText)) {
                processedDefinitionLines.add(lineNum);
                const ctx: HandlerContext = {
                    state,
                    selection,
                    isHidingEnabled,
                    isSelected: selection.from <= line.to && selection.to >= line.from,
                    start: line.from,
                    end: line.to
                };
                decorations.push(...handleFootnoteDefinition(ctx));
            } else if (/^\[([^\]]+)\]:\s*\S+/.test(lineText)) {
                processedDefinitionLines.add(lineNum);
                const ctx: HandlerContext = {
                    state,
                    selection,
                    isHidingEnabled,
                    isSelected: selection.from <= line.to && selection.to >= line.from,
                    start: line.from,
                    end: line.to
                };
                decorations.push(...handleLinkDefinition(ctx));
            } else {
                const ctx: HandlerContext = {
                    state,
                    selection,
                    isHidingEnabled,
                    isSelected: selection.from <= line.to && selection.to >= line.from,
                    start: line.from,
                    end: line.to
                };
                decorations.push(...handleOrderedListLineMarker(ctx));
            }
        }
    }

    for (const visibleRange of view.visibleRanges) {
        syntaxTree(state).iterate({
            from: visibleRange.from,
            to: visibleRange.to,
            enter: (node) => {
                const nodeKey = `${node.from}:${node.to}:${node.type.name}`;
                if (seenNodes.has(nodeKey)) {
                    return;
                }
                seenNodes.add(nodeKey);

                const start = node.from;
                const end = node.to;
                const isSelected = selection.from <= end && selection.to >= start;

                const startLine = state.doc.lineAt(start);
                if (processedDefinitionLines.has(startLine.number)) {
                    return false;
                }

                const ctx: HandlerContext = { state, selection, isHidingEnabled, isSelected, start, end };

                if (node.type.name.startsWith('ATXHeading')) {
                    decorations.push(...handleATXHeading(ctx, node.type.name));
                    return;
                }

                if (node.type.name === 'Blockquote') {
                    const key = `${start}-${end}`;
                    if (!processedBlockquotes.has(key)) {
                        processedBlockquotes.add(key);
                        decorations.push(...handleBlockquote(ctx));
                    }
                    return;
                }

                const handler = NODE_HANDLERS[node.type.name];
                if (handler) {
                    decorations.push(...handler(ctx, node));
                }
            },
        });
    }

    decorations.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        if (a.to !== b.to) return a.to - b.to;

        const aStartSide = a.decoration.spec.startSide ?? 0;
        const bStartSide = b.decoration.spec.startSide ?? 0;
        return aStartSide - bStartSide;
    });

    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to, decoration } of decorations) {
        builder.add(from, to, decoration);
    }
    return builder.finish();
}

export const markdownSyntaxHidingField = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildMarkdownSyntaxHidingDecorations(view);
        }

        update(update: ViewUpdate): void {
            const syntaxHidingChanged =
                update.startState.field(syntaxHidingState) !== update.state.field(syntaxHidingState);

            if (update.docChanged || update.viewportChanged || update.selectionSet || syntaxHidingChanged) {
                this.decorations = buildMarkdownSyntaxHidingDecorations(update.view);
            }
        }
    },
    {
        decorations: (plugin) => plugin.decorations,
    }
);
