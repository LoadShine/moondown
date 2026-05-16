import {EditorView, type PluginValue, ViewPlugin, ViewUpdate} from "@codemirror/view";
import {Text, Transaction} from "@codemirror/state";

/**
 * A CodeMirror ViewPlugin that ensures the document always ends with a newline.
 * This is a common convention for text files and can prevent issues with some tools.
 */
export class FinalNewLinePlugin implements PluginValue {
    constructor(private readonly view: EditorView) {
        // Ensure a final newline on initialization.
        setTimeout(() => {
            this.ensureFinalNewLine(true);
        }, 0);
    }

    private ensureFinalNewLine(newLine = false) {
        const endLine = this.view.state.doc.line(this.view.state.doc.lines);

        // If the last line is not empty, add a newline.
        if (endLine.length) {
            const hasSelection = this.view.state.selection.ranges.some((range) => range.from !== range.to);

            this.view.dispatch({
                    changes: {
                        from: endLine.to,
                        insert: Text.of(['', '']), // Inserts a newline
                    },
                    annotations: Transaction.addToHistory.of(false),
                    selection: newLine && !hasSelection ? {
                        anchor: endLine.to + 1,
                        head: endLine.to + 1,
                    } : undefined,
                },
            );
        }
    }

    update(update: ViewUpdate) {
        // Re-check when the editor gains focus.
        if (update.focusChanged) {
            setTimeout(() => {
                this.ensureFinalNewLine();
            }, 0);
        }
    }
}

export const finalNewLinePlugin = ViewPlugin.fromClass(FinalNewLinePlugin);
