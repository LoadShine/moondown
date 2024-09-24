import {EditorView} from "@codemirror/view";

export function updateLists(view: EditorView) {
    const { state } = view;
    const doc = state.doc;
    const lines = doc.toString().split('\n');
    let changes = [];

    let orderedListLevels: { indent: string; number: number }[] = [];
    let prevIndentLevel = -1;

    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];
        const lineStart = doc.line(lineNumber + 1).from;
        const orderedMatch = line.match(/^(\s*)(\d+)\.\s/);
        const unorderedMatch = line.match(/^(\s*)([-*])\s/);

        if (orderedMatch) {
            const indentation = orderedMatch[1];
            const currentNumber = parseInt(orderedMatch[2]);
            const indentLevel = indentation.length;

            if (indentLevel > prevIndentLevel) {
                // Starting a new sub-level, reset numbering
                orderedListLevels = orderedListLevels.filter(l => l.indent.length < indentLevel);
                orderedListLevels.push({ indent: indentation, number: 1 });
            } else if (indentLevel < prevIndentLevel) {
                // Returning to a previous level, remove deeper levels
                orderedListLevels = orderedListLevels.filter(l => l.indent.length <= indentLevel);
            }

            const level = orderedListLevels[orderedListLevels.length - 1];
            if (currentNumber !== level.number) {
                const numberStart = lineStart + indentation.length;
                const numberEnd = numberStart + orderedMatch[2].length;
                changes.push({
                    from: numberStart,
                    to: numberEnd,
                    insert: level.number.toString(),
                });
            }

            level.number++;
            prevIndentLevel = indentLevel;
        } else if (unorderedMatch) {
            // For unordered lists, we don't need to change anything
            prevIndentLevel = unorderedMatch[1].length;
        } else if (line.trim().length === 0) {
            // Empty line, do nothing
        } else {
            // Non-list content, reset numbering for the next list
            orderedListLevels = [];
            prevIndentLevel = -1;
        }
    }

    if (changes.length > 0) {
        view.dispatch({ changes });
    }
}