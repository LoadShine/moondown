import {type Extension} from "@codemirror/state";
import {codeBlockInputHandler, fencedCodeBackgroundPlugin} from "./fenced-code-plugin.ts";
import {languageIdentifierAutocomplete} from "./language-autocomplete.ts";

/**
 * Returns a CodeMirror extension for enhanced fenced code block functionality.
 * This includes background styling, language autocompletion, and an input helper
 * for creating code blocks.
 */
export function fencedCode(): Extension{
    return [
        fencedCodeBackgroundPlugin,
        languageIdentifierAutocomplete,
        codeBlockInputHandler
    ]
}