/**
 * Language identifier autocompletion for fenced code blocks.
 *
 * This module provides autocompletion for programming language
 * identifiers in markdown fenced code blocks (e.g., ```javascript).
 */

import {autocompletion, CompletionContext} from "@codemirror/autocomplete";

/**
 * A list of common programming languages for syntax highlighting suggestions.
 */
const languageNames = [
    {label: "javascript", type: "keyword"},
    {label: "python", type: "keyword"},
    {label: "java", type: "keyword"},
    {label: "csharp", type: "keyword"},
    {label: "cpp", type: "keyword"},
    {label: "ruby", type: "keyword"},
    {label: "go", type: "keyword"},
    {label: "typescript", type: "keyword"},
    {label: "html", type: "keyword"},
    {label: "css", type: "keyword"},
    {label: "json", type: "keyword"},
    {label: "yaml", type: "keyword"},
    {label: "markdown", type: "keyword"},
    {label: "sql", type: "keyword"},
    {label: "shell", type: "keyword"},
    {label: "bash", type: "keyword"},
    {label: "rust", type: "keyword"},
    {label: "c", type: "keyword"},
    {label: "cpp", type: "keyword"}
]

/**
 * The completion source function for language identifiers.
 * It activates when the cursor is right after ``` and provides language suggestions.
 * @param context - The completion context provided by CodeMirror.
 * @returns A completion result with language options, or null if not applicable.
 */
function languageIdentifierCompletion(context: CompletionContext) {
    const {state, pos} = context
    const line = state.doc.lineAt(pos)
    const lineStart = line.from
    const beforeCursor = state.doc.sliceString(lineStart, pos)

    // Match if the line starts with ``` followed by zero or more non-space characters.
    const tripleBacktickMatch = /^```([^\s`]*)$/.exec(beforeCursor)
    if (tripleBacktickMatch) {
        const word = tripleBacktickMatch[1]

        return {
            from: lineStart + 3, // Start replacing after the ```
            to: pos,
            options: languageNames.filter(lang => lang.label.startsWith(word)),
            validFor: /^([^\s`]*)$/ // Keep the completion active as the user types the identifier
        }
    }

    return null
}

/**
 * The CodeMirror extension that enables language identifier autocompletion.
 */
export const languageIdentifierAutocomplete = autocompletion({
    override: [languageIdentifierCompletion]
})