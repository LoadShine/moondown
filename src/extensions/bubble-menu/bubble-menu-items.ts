import type { EditorView } from '@codemirror/view';
import { MARKDOWN_MARKERS } from '../../core';
import {
    isHeaderActive,
    isInlineStyleActive,
    isListActive,
    setHeader,
    toggleInlineStyle,
    toggleList,
} from './content-functions';
import type { BubbleMenuItem } from './types';

interface BubbleMenuItemFactoryOptions {
    onAIPolish: (view: EditorView) => boolean;
}

export function createBubbleMenuItems({ onAIPolish }: BubbleMenuItemFactoryOptions): BubbleMenuItem[] {
    return [
        {
            name: 'Heading',
            icon: 'Heading',
            type: 'dropdown',
            subItems: [
                {
                    name: 'H1',
                    icon: 'Heading1',
                    action: (view) => setHeader(view, 1),
                    isActive: (state) => isHeaderActive(state, 1),
                },
                {
                    name: 'H2',
                    icon: 'Heading2',
                    action: (view) => setHeader(view, 2),
                    isActive: (state) => isHeaderActive(state, 2),
                },
                {
                    name: 'H3',
                    icon: 'Heading3',
                    action: (view) => setHeader(view, 3),
                    isActive: (state) => isHeaderActive(state, 3),
                },
            ],
        },
        {
            name: 'List',
            icon: 'List',
            type: 'dropdown',
            subItems: [
                {
                    name: 'Ordered List',
                    icon: 'list-ordered',
                    action: (view) => toggleList(view, true),
                    isActive: (state) => isListActive(state, true),
                },
                {
                    name: 'Unordered List',
                    icon: 'List',
                    action: (view) => toggleList(view, false),
                    isActive: (state) => isListActive(state, false),
                },
            ],
        },
        {
            name: 'bold',
            icon: 'Bold',
            type: 'button',
            action: (view) => toggleInlineStyle(view, MARKDOWN_MARKERS.BOLD),
            isActive: (state) => isInlineStyleActive(state, MARKDOWN_MARKERS.BOLD),
        },
        {
            name: 'italic',
            icon: 'Italic',
            type: 'button',
            action: (view) => toggleInlineStyle(view, MARKDOWN_MARKERS.ITALIC),
            isActive: (state) => isInlineStyleActive(state, MARKDOWN_MARKERS.ITALIC),
        },
        {
            name: 'Decoration',
            icon: 'Paintbrush',
            type: 'dropdown',
            subItems: [
                {
                    name: 'highlight',
                    icon: 'Highlighter',
                    action: (view) => toggleInlineStyle(view, MARKDOWN_MARKERS.HIGHLIGHT),
                    isActive: (state) => isInlineStyleActive(state, MARKDOWN_MARKERS.HIGHLIGHT),
                },
                {
                    name: 'Strikethrough',
                    icon: 'Strikethrough',
                    action: (view) => toggleInlineStyle(view, MARKDOWN_MARKERS.STRIKETHROUGH),
                    isActive: (state) => isInlineStyleActive(state, MARKDOWN_MARKERS.STRIKETHROUGH),
                },
                {
                    name: 'Underline',
                    icon: 'Underline',
                    action: (view) => toggleInlineStyle(view, MARKDOWN_MARKERS.UNDERLINE),
                    isActive: (state) => isInlineStyleActive(state, MARKDOWN_MARKERS.UNDERLINE),
                },
                {
                    name: 'Inline Code',
                    icon: 'Code',
                    action: (view) => toggleInlineStyle(view, MARKDOWN_MARKERS.INLINE_CODE),
                    isActive: (state) => isInlineStyleActive(state, MARKDOWN_MARKERS.INLINE_CODE),
                },
            ],
        },
        {
            name: 'AI Polish',
            icon: 'Sparkles',
            type: 'button',
            action: onAIPolish,
        },
    ];
}
