import {type Extension} from '@codemirror/state';
import {drawSelection, EditorView, keymap, rectangularSelection} from '@codemirror/view';
import {
    indentOnInput,
    syntaxHighlighting
} from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import {defaultKeymap, history, historyKeymap, indentWithTab} from "@codemirror/commands";
import { closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import {languages} from "@codemirror/language-data";
import {highlightStyles} from "@/lib/highlight-styles.ts";
import {correctList} from "@/extensions/correct-list";
import {markdownSyntaxHiding} from "@/extensions/markdown-syntax-hiding";
import {GFM} from "@lezer/markdown";
import {Mark} from "@/extensions/mark-parser";
import {blockquoteKeymap} from "@/extensions/blockquote-keymap";
import {finalNewLine} from "@/extensions/final-new-line";
import {editorBaseTheme} from "@/theme/base-theme-style.ts";
import {tableExtension} from "@/extensions/table";

export const defaultExtensions: Extension[] = [
    tableExtension,
    syntaxHighlighting(highlightStyles),
    history(),
    drawSelection(),
    rectangularSelection(),
    indentOnInput(),
    correctList,
    blockquoteKeymap,
    keymap.of([indentWithTab, ...defaultKeymap, ...completionKeymap, ...historyKeymap, ...closeBracketsKeymap]),
    EditorView.lineWrapping,
    markdownSyntaxHiding(),
    markdown({
        codeLanguages: languages,
        extensions: [GFM, Mark],
        addKeymap: false,
    }),
    finalNewLine,
    editorBaseTheme
];