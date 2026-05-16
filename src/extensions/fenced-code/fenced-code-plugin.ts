import {Decoration, EditorView, ViewPlugin, type ViewUpdate} from "@codemirror/view"
import {RangeSetBuilder} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {fencedCodeDecoration} from "./decorations.ts";

/**
 * Builds visible line decorations for fenced code blocks.
 */
function buildFencedCodeDecorations(view: EditorView) {
    const state = view.state
    const ranges: { from: number, to: number, decoration: Decoration }[] = []
    const seenNodes = new Set<string>()

    for (const visibleRange of view.visibleRanges) {
        syntaxTree(state).iterate({
            from: visibleRange.from,
            to: visibleRange.to,
            enter: (node) => {
                if (node.type.name !== "FencedCode") {
                    return
                }
                const nodeKey = `${node.from}:${node.to}`
                if (seenNodes.has(nodeKey)) {
                    return
                }
                seenNodes.add(nodeKey)

                const start = node.from
                const end = node.to

                const startLine = state.doc.lineAt(start)
                const endLine = state.doc.lineAt(end)

                let pos = startLine.from
                while (pos <= endLine.from) {
                    const line = state.doc.lineAt(pos)
                    ranges.push({
                        from: line.from,
                        to: line.from,
                        decoration: fencedCodeDecoration
                    })
                    pos = line.to + 1
                }
            },
        })
    }

    ranges.sort((a, b) => a.from - b.from)

    const builder = new RangeSetBuilder<Decoration>()
    for (const {from, to, decoration} of ranges) {
        builder.add(from, to, decoration)
    }

    return builder.finish()
}

export const fencedCodeBackgroundPlugin = ViewPlugin.fromClass(
    class {
        decorations = Decoration.none

        constructor(view: EditorView) {
            this.decorations = buildFencedCodeDecorations(view)
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildFencedCodeDecorations(update.view)
            }
        }
    },
    {
        decorations: (plugin) => plugin.decorations,
    }
)

/**
 * An input handler that automatically creates a complete code block
 * when the user types three backticks (```).
 */
export const codeBlockInputHandler = EditorView.inputHandler.of((view, _from, _to, text) => {
    if (text === "`") {
        const state = view.state
        const selection = state.selection.main
        const beforeCursor = state.doc.sliceString(Math.max(0, selection.from - 2), selection.from)

        // Check if previous two characters are also backticks, forming three backticks
        if (beforeCursor === "``") {
            // Insert a newline, empty line and closing ```
            const insertText = "\n\n```"
            // Calculate new cursor position, after first ```
            const cursorPos = selection.from + 1

            // Execute replacement
            view.dispatch({
                changes: {from: selection.from - 2, to: selection.from, insert: "```" + insertText},
                selection: {anchor: cursorPos}
            })

            // Prevent default input handling
            return true
        }
    }

    // Use default input handler
    return false
})
