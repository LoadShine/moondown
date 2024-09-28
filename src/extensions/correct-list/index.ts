import {Extension} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {listKeymap} from "./list-keymap.ts";
import {bulletListPlugin, updateListPlugin} from "./list-plugins.ts";

export const correctList: Extension = [
    keymap.of(listKeymap),
    updateListPlugin,
    bulletListPlugin,
];
