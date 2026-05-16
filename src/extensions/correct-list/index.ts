import type {Extension} from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { listKeymap } from "./list-keymap.ts";
import { bulletListPlugin, updateListPlugin } from "./list-plugins";

/**
 * Returns a CodeMirror extension for enhanced list editing.
 * This includes keymaps for indentation and automatic numbering,
 * and view plugins for list updates and custom bullet rendering.
 */
export function correctList(): Extension {
    return [
        keymap.of(listKeymap),
        updateListPlugin,
        bulletListPlugin,
    ];
}