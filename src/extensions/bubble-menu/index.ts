import {ViewPlugin} from "@codemirror/view";
import { bubbleMenuField } from './fields';
import { BubbleMenu } from './bubble-menu';

/**
 * The main ViewPlugin that brings the BubbleMenu functionality to the editor.
 */
const bubbleMenuPlugin = ViewPlugin.fromClass(BubbleMenu);

/**
 * Returns the CodeMirror extension for the bubble menu.
 * This includes the StateField for managing menu state and the ViewPlugin for rendering.
 */
export function bubbleMenu() {
    return [bubbleMenuField, bubbleMenuPlugin];
}
