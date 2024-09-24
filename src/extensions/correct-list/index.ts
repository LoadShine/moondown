import {Extension} from "@codemirror/state";
import {keymap} from "@codemirror/view";
import {listKeymap} from "@/extensions/correct-list/list-keymap.ts";
import {bulletListPlugin, updateListPlugin} from "@/extensions/correct-list/list-plugins.ts";

export const correctList: Extension = [
    keymap.of(listKeymap),
    updateListPlugin,
    bulletListPlugin,
];
