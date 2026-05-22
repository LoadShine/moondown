import type { SyntaxNodeRef } from '@lezer/common';
import { Decoration } from '@codemirror/view';
import { CSS_CLASSES } from '../../core';
import type { DecorationItem, HandlerContext } from './types';

/**
 * Decoration types with explicit startSide values.
 */
const hiddenMarkdown = Decoration.replace({});
const visibleMarkdown = Decoration.mark({ class: CSS_CLASSES.VISIBLE_MARKDOWN });
const orderedListMarker = Decoration.mark({ class: 'cm-ordered-list-marker' });

// Line decorations with explicit startSide to avoid conflicts.
const hrLine = Decoration.line({ class: 'cm-hr-line' });
const hrLineSelected = Decoration.line({ class: 'cm-hr-line-selected' });

export function handleOrderedListLineMarker(ctx: HandlerContext): DecorationItem[] {
    const { state, start } = ctx;
    const line = state.doc.lineAt(start);
    const markerMatch = line.text.match(/^(\s*)(\d+(?:\.\d+)+\.)\s/);

    if (!markerMatch) {
        return [];
    }

    const markerFrom = line.from + markerMatch[1].length;
    const markerTo = markerFrom + markerMatch[2].length;

    return [{
        from: markerFrom,
        to: markerTo,
        decoration: orderedListMarker,
    }];
}

/**
 * Handles FencedCode nodes.
 */
export function handleFencedCode(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, isHidingEnabled, start, end } = ctx;

    if (isSelected || !isHidingEnabled) {
        return [];
    }

    const decorations: DecorationItem[] = [];
    const fencedCodeStart = state.doc.lineAt(start);
    const fencedCodeEnd = state.doc.lineAt(end);

    if (fencedCodeStart.number === fencedCodeEnd.number) {
        return [];
    }

    const openingMatch = fencedCodeStart.text.match(/^(\s*(?:>\s*)?)(```+)(\w*)/);
    if (openingMatch) {
        const prefix = openingMatch[1] || '';
        const backticks = openingMatch[2];
        const language = openingMatch[3];

        const replaceStart = fencedCodeStart.from + prefix.length;
        const replaceEnd = replaceStart + backticks.length + language.length;

        decorations.push({
            from: replaceStart,
            to: replaceEnd,
            decoration: Decoration.replace({}),
        });
    }

    const closingMatch = fencedCodeEnd.text.match(/^(\s*(?:>\s*)?)(```+)/);
    if (closingMatch) {
        const prefix = closingMatch[1] || '';
        const backticks = closingMatch[2];

        const replaceStart = fencedCodeEnd.from + prefix.length;
        const replaceEnd = replaceStart + backticks.length;

        decorations.push({
            from: replaceStart,
            to: replaceEnd,
            decoration: Decoration.replace({}),
        });
    }

    return decorations;
}

/**
 * Handles Blockquote nodes.
 */
export function handleBlockquote(ctx: HandlerContext): DecorationItem[] {
    const { state, start, end } = ctx;
    const decorations: DecorationItem[] = [];

    const blockquoteStartLine = state.doc.lineAt(start);
    const blockquoteEndLine = state.doc.lineAt(end);

    for (let lineNum = blockquoteStartLine.number; lineNum <= blockquoteEndLine.number; lineNum++) {
        const line = state.doc.line(lineNum);
        const lineText = line.text;

        const prefixMatch = lineText.match(/^(\s*(?:>\s*)+)/);
        if (!prefixMatch) continue;

        const prefix = prefixMatch[0];
        const level = (prefix.match(/>/g) || []).length;

        let lineClasses = 'cm-blockquote-line';
        if (lineNum === blockquoteStartLine.number) {
            lineClasses += ' cm-blockquote-first-line';
        }
        if (lineNum === blockquoteEndLine.number) {
            lineClasses += ' cm-blockquote-last-line';
        }

        decorations.push({
            from: line.from,
            to: line.from,
            decoration: Decoration.line({
                attributes: {
                    class: lineClasses,
                    'data-bq-level': String(level),
                },
            }),
        });

        for (let i = 0; i < prefix.length; i++) {
            if (prefix[i] === '>') {
                const markerPos = line.from + i;
                decorations.push({
                    from: markerPos,
                    to: markerPos + 1,
                    decoration: Decoration.replace({}),
                });
            }
        }
    }

    return decorations;
}

/**
 * Handles HorizontalRule nodes.
 */
export function handleHorizontalRule(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, isHidingEnabled, start, end } = ctx;
    const line = state.doc.lineAt(start);

    if (isSelected || !isHidingEnabled) {
        return [
            { from: line.from, to: line.from, decoration: hrLineSelected },
            { from: start, to: end, decoration: visibleMarkdown },
        ];
    }

    return [
        { from: line.from, to: line.from, decoration: hrLine },
        { from: start, to: end, decoration: hiddenMarkdown },
    ];
}

/**
 * Handles ListItem nodes.
 */
export function handleListItem(ctx: HandlerContext, node: SyntaxNodeRef): DecorationItem[] {
    const { state } = ctx;
    const listMarkNode = node.node.getChild('ListMark');

    if (listMarkNode) {
        const line = state.doc.lineAt(listMarkNode.from);
        const lineOffset = Math.max(0, listMarkNode.from - line.from);
        const markerMatch = line.text.slice(lineOffset).match(/^(\d+(?:\.\d+)*)\./);
        const markerFrom = listMarkNode.from;
        const markerTo = markerMatch ? markerFrom + markerMatch[0].length : listMarkNode.to;
        const markText = state.doc.sliceString(markerFrom, markerTo);

        if (/\d/.test(markText)) {
            return [
                {
                    from: markerFrom,
                    to: markerTo,
                    decoration: orderedListMarker,
                },
            ];
        }
    }

    return [];
}

/**
 * Handles ATXHeading nodes.
 */
export function handleHeading(ctx: HandlerContext, headerLevel: number): DecorationItem[] {
    const { isSelected, isHidingEnabled, start } = ctx;
    const decorationType = isSelected || !isHidingEnabled ? visibleMarkdown : hiddenMarkdown;

    return [
        {
            from: start,
            to: start + headerLevel + 1,
            decoration: decorationType,
        },
    ];
}
