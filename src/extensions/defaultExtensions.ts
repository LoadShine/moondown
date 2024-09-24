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
import {highlightStyles} from "@/lib/highlightStyles.ts";
import {correctList} from "@/extensions/correctList.ts";
import {blockQuoteKeymap} from "@/extensions/blockQuoteKeymap.ts";
import {markdownSyntaxHiding} from "@/extensions/markdownSyntaxHiding.ts";
import {GFM} from "@lezer/markdown";
import finalNewLine from "@/extensions/finalNewLine.ts";

export const defaultExtensions: Extension[] = [
    // tablePositions,
    // tableExtension,
    syntaxHighlighting(highlightStyles),
    history(),
    drawSelection(),
    rectangularSelection(),
    indentOnInput(),
    correctList,
    blockQuoteKeymap,
    keymap.of([indentWithTab, ...defaultKeymap, ...completionKeymap, ...historyKeymap, ...closeBracketsKeymap]),
    EditorView.lineWrapping,
    markdownSyntaxHiding(),
    markdown({
        codeLanguages: languages,
        extensions: [GFM],
        addKeymap: false,
    }),
    finalNewLine
];