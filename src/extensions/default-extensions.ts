import { Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap, rectangularSelection } from '@codemirror/view';
import { indentOnInput } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from "@codemirror/commands";
import { closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { languages } from "@codemirror/language-data";
import { search, searchKeymap } from "@codemirror/search";
import { GFM } from "@lezer/markdown";

// Import custom extensions
import { correctList } from "./correct-list";
import { Mark } from "./mark-parser";
import { Underline } from "./underline-parser";
import { Strikethrough } from "./strikethrough-parser";
import { finalNewLine } from "./final-new-line";
import { slashCommand } from "./slash-command";
import { imageKeymap } from "./image";
import { fencedCode } from "./fenced-code";
import { blockquote } from "./blockquote";
import { bubbleMenu } from "./bubble-menu";
import { widgetEditBubble } from './widget-edit-bubble';
import { crossBoundaryDeleteKeymap } from './cross-boundary-delete';
import { openVisibleSearchPanel, searchPanelInputSync } from './search-panel-visibility';
import { lightTheme } from "../theme/base-theme";
import {
    localeState,
    onAIStreamState,
    placeholderCompartment,
    pluginSlashCommandsState,
    readOnlyCompartment,
    setLocale,
    setOnAIStream,
    setPluginSlashCommands,
    setTranslations,
    themeCompartment,
    translationsState,
    wysiwygCompartment,
} from './runtime/editor-runtime-state';
import { wysiwygExtensions } from './runtime/wysiwyg-extensions';

function openReplacePanel(view: EditorView): boolean {
    const opened = openVisibleSearchPanel(view);
    requestAnimationFrame(() => {
        const replaceField = view.dom.querySelector<HTMLInputElement>('.cm-search input[name="replace"]');
        replaceField?.focus();
        replaceField?.select();
    });
    return opened;
}

export function createDefaultExtensions(): Extension[] {
    return [
        history({ minDepth: 200 }),
        Prec.highest(keymap.of([
            { key: 'Mod-z', run: undo, preventDefault: true },
            { key: 'Ctrl-z', run: undo, preventDefault: true },
            { key: 'Mod-Shift-z', run: redo, preventDefault: true },
            { key: 'Ctrl-Shift-z', run: redo, preventDefault: true },
            { key: 'Ctrl-y', run: redo, preventDefault: true },
            { key: 'Mod-f', run: openVisibleSearchPanel, preventDefault: true },
            { key: 'Mod-r', run: openReplacePanel, preventDefault: true },
        ])),
        rectangularSelection(),
        indentOnInput(),
        search({ top: true }),
        searchPanelInputSync,

        slashCommand(),
        correctList(),
        fencedCode(),
        blockquote(),
        bubbleMenu(),
        widgetEditBubble(),

        onAIStreamState,
        translationsState,
        localeState,
        pluginSlashCommandsState,
        imageKeymap,
        crossBoundaryDeleteKeymap,

        keymap.of([
            indentWithTab,
            ...defaultKeymap,
            ...searchKeymap,
            ...completionKeymap,
            ...historyKeymap,
            ...closeBracketsKeymap,
        ]),

        EditorView.lineWrapping,
        wysiwygCompartment.of(wysiwygExtensions),

        markdown({
            codeLanguages: languages,
            extensions: [GFM, Mark, Underline, Strikethrough],
            addKeymap: false,
        }),

        finalNewLine,
        themeCompartment.of(lightTheme),
    ];
}

export const defaultExtensions: Extension[] = createDefaultExtensions();

export {
    localeState,
    onAIStreamState,
    placeholderCompartment,
    pluginSlashCommandsState,
    readOnlyCompartment,
    setLocale,
    setOnAIStream,
    setPluginSlashCommands,
    setTranslations,
    themeCompartment,
    translationsState,
    wysiwygCompartment,
    wysiwygExtensions,
};
