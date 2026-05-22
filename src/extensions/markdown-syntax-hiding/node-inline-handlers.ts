import { Decoration } from '@codemirror/view';
import { CSS_CLASSES } from '../../core';
import { LinkWidget } from './link-widget';
import { InlineCodeWidget, StrikethroughWidget, HighlightWidget, UnderlineWidget } from './widgets';
import { handleFootnote } from './reference-handlers';
import type { DecorationItem, HandlerContext } from './types';

/**
 * Decoration types with explicit startSide values.
 */
const hiddenMarkdown = Decoration.replace({});
const visibleMarkdown = Decoration.mark({ class: CSS_CLASSES.VISIBLE_MARKDOWN });

/**
 * Determines decoration type based on selection and hiding state.
 */
function getDecorationType(isSelected: boolean, isHidingEnabled: boolean): Decoration {
    return isSelected || !isHidingEnabled ? visibleMarkdown : hiddenMarkdown;
}

/**
 * Handles Emphasis and StrongEmphasis nodes.
 */
export function handleEmphasis(ctx: HandlerContext, isStrong: boolean): DecorationItem[] {
    const { isSelected, isHidingEnabled, start, end } = ctx;
    const decorationType = getDecorationType(isSelected, isHidingEnabled);
    const markerLength = isStrong ? 2 : 1;

    return [
        { from: start, to: start + markerLength, decoration: decorationType },
        { from: end - markerLength, to: end, decoration: decorationType },
    ];
}

/**
 * Handles InlineCode nodes.
 */
export function handleInlineCode(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;

    if (!isSelected) {
        const inlineCodeContent = state.doc.sliceString(start, end);
        const content = inlineCodeContent.slice(1, -1);

        return [
            {
                from: start,
                to: end,
                decoration: Decoration.replace({
                    widget: new InlineCodeWidget(content, inlineCodeContent, start),
                    inclusive: true,
                }),
            },
        ];
    }

    return [
        { from: start, to: start + 1, decoration: visibleMarkdown },
        { from: end - 1, to: end, decoration: visibleMarkdown },
    ];
}

/**
 * Handles Link nodes.
 */
export function handleLink(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const linkText = state.doc.sliceString(start, end);

    // Check if this is a footnote reference first.
    const footnoteMatch = linkText.match(/^\[\^([^\]]+)\]$/);
    if (footnoteMatch) {
        return handleFootnote(ctx);
    }

    // Try inline link first: [text](url).
    const inlineMatch = linkText.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (inlineMatch) {
        const decorationType = getDecorationType(isSelected, true);
        const displayText = inlineMatch[1] || inlineMatch[2];

        if (!isSelected) {
            return [
                {
                    from: start,
                    to: end,
                    decoration: Decoration.replace({
                        widget: new LinkWidget(displayText, linkText, start),
                        inclusive: true,
                    }),
                },
            ];
        }

        const linkStart = start + linkText.indexOf('[');
        const linkEnd = start + linkText.indexOf(']') + 1;
        const urlStart = start + linkText.indexOf('(');
        const urlEnd = start + linkText.indexOf(')') + 1;

        return [
            { from: linkStart, to: linkEnd, decoration: decorationType },
            { from: urlStart, to: urlEnd, decoration: decorationType },
        ];
    }

    // Try reference-style link: [text][ref-id].
    const refMatch = linkText.match(/\[([^\]]+)\]\[([^\]]+)\]/);
    if (refMatch) {
        const displayText = refMatch[1];
        const refId = refMatch[2];
        const decorationType = getDecorationType(isSelected, true);

        if (!isSelected) {
            return [
                {
                    from: start,
                    to: end,
                    decoration: Decoration.replace({
                        widget: new LinkWidget(displayText, linkText, start, refId),
                        inclusive: true,
                    }),
                },
            ];
        }

        const textStart = start;
        const textEnd = start + refMatch[1].length + 2; // [text]
        const refStart = textEnd;
        const refEnd = end;

        return [
            { from: textStart, to: textEnd, decoration: decorationType },
            { from: refStart, to: refEnd, decoration: decorationType },
        ];
    }

    return [];
}

/**
 * Handles Strikethrough nodes.
 */
export function handleStrikethrough(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const fullText = state.doc.sliceString(start, end);

    if (fullText.length < 4) return [];

    const content = fullText.slice(2, -2);

    if (!isSelected) {
        return [
            {
                from: start,
                to: end,
                decoration: Decoration.replace({
                    widget: new StrikethroughWidget(content, fullText, start),
                    inclusive: true,
                }),
            },
        ];
    }

    return [
        { from: start, to: start + 2, decoration: visibleMarkdown },
        { from: end - 2, to: end, decoration: visibleMarkdown },
    ];
}

/**
 * Handles Mark (highlight) nodes.
 */
export function handleMark(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const fullText = state.doc.sliceString(start, end);

    if (fullText.length < 4) return [];

    const content = fullText.slice(2, -2);

    if (!isSelected) {
        return [
            {
                from: start,
                to: end,
                decoration: Decoration.replace({
                    widget: new HighlightWidget(content, fullText, start),
                    inclusive: true,
                }),
            },
        ];
    }

    return [
        { from: start, to: start + 2, decoration: visibleMarkdown },
        { from: end - 2, to: end, decoration: visibleMarkdown },
    ];
}

/**
 * Handles Underline nodes.
 */
export function handleUnderline(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, start, end } = ctx;
    const fullText = state.doc.sliceString(start, end);

    if (fullText.length < 2) return [];

    const content = fullText.slice(1, -1);

    if (!isSelected) {
        return [
            {
                from: start,
                to: end,
                decoration: Decoration.replace({
                    widget: new UnderlineWidget(content, fullText, start),
                    inclusive: true,
                }),
            },
        ];
    }

    return [
        { from: start, to: start + 1, decoration: visibleMarkdown },
        { from: end - 1, to: end, decoration: visibleMarkdown },
    ];
}

/**
 * Handles Image nodes.
 */
export function handleImage(ctx: HandlerContext): DecorationItem[] {
    const { state, isSelected, isHidingEnabled, start, end } = ctx;
    const imageText = state.doc.sliceString(start, end);
    const imageMatch = imageText.match(/!\[([^\]]*)\]\(([^)]+)\)/);

    if (!imageMatch) return [];

    const decorationType = getDecorationType(isSelected, isHidingEnabled);
    const alt = imageMatch[1];

    return [
        { from: start, to: start + 2, decoration: decorationType },
        { from: start + 2 + alt.length, to: end, decoration: decorationType },
    ];
}
