import {EditorView} from "@codemirror/view";
import {EditorState} from "@codemirror/state";
import type {AIStreamHandler} from "../../core";

/**
 * Defines the structure for a top-level item in the bubble menu.
 */
export interface BubbleMenuItem {
    name: string;
    icon: string;
    action?: (view: EditorView) => boolean | void | Promise<boolean | void>;
    isActive?: (state: EditorState) => boolean;
    subItems?: BubbleMenuSubItem[];
    type?: 'dropdown' | 'button';
}

/**
 * Defines the structure for an item within a dropdown in the bubble menu.
 */
export interface BubbleMenuSubItem {
    name: string;
    icon?: string;
    action: (view: EditorView) => Promise<boolean | void> | boolean | void;
    isActive?: (state: EditorState) => boolean;
}

/**
 * Runtime options resolved from editor state for AI polish behavior.
 */
export interface BubbleAIPolishOptions {
    onAIStream?: AIStreamHandler | null;
    locale?: string;
}
