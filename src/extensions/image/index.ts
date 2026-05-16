import {EditorSelection, type Extension} from "@codemirror/state";
import {syntaxTree} from "@codemirror/language";
import {EditorView, ViewUpdate, keymap} from "@codemirror/view";
import {imageSizeField, placeholderField} from "./fields.ts";
import {imageWidgetPlugin} from "./image-renderer.ts";
import {imageDragAndDropPlugin} from "./image-drag-n-drop.ts";
import { parseMarkdownImage } from "../../core/utils/string-utils";

/**
 * Checks if the position is at the boundary of an image markdown
 */
function getImageAtPosition(view: EditorView, pos: number): {from: number, to: number} | null {
    const doc = view.state.doc;
    const line = doc.lineAt(pos);
    let imageRange: {from: number, to: number} | null = null;

    syntaxTree(view.state).iterate({
        from: line.from,
        to: line.to,
        enter: (node) => {
            if (node.type.name !== 'Image') {
                return;
            }
            if (pos !== node.from && pos !== node.to) {
                return;
            }
            if (parseMarkdownImage(view.state.sliceDoc(node.from, node.to))) {
                imageRange = {from: node.from, to: node.to};
            }
        },
    });

    return imageRange;
}

/**
 * Handles backspace key to select image before deleting
 */
function handleBackspace(view: EditorView): boolean {
    const {from, to} = view.state.selection.main;

    // If there's a selection, let default behavior handle it
    if (from !== to) {
        return false;
    }

    // Check if cursor is at the end of an image markdown
    const imageRange = getImageAtPosition(view, from);
    if (imageRange && from === imageRange.to) {
        // Select the entire image
        view.dispatch({
            selection: EditorSelection.single(imageRange.from, imageRange.to),
            scrollIntoView: true
        });
        return true;
    }

    return false;
}

/**
 * Handles delete key to select image before deleting
 */
function handleDelete(view: EditorView): boolean {
    const {from, to} = view.state.selection.main;

    // If there's a selection, let default behavior handle it
    if (from !== to) {
        return false;
    }

    // Check if cursor is at the start of an image markdown
    const imageRange = getImageAtPosition(view, from);
    if (imageRange && from === imageRange.from) {
        // Select the entire image
        view.dispatch({
            selection: EditorSelection.single(imageRange.from, imageRange.to),
            scrollIntoView: true
        });
        return true;
    }

    return false;
}

/**
 * Keymap for image-specific keyboard shortcuts
 * This needs to be loaded BEFORE default keymaps to take precedence
 */
export const imageKeymap = keymap.of([
    {
        key: "Backspace",
        run: handleBackspace
    },
    {
        key: "Delete",
        run: handleDelete
    }
]);

/**
 * Returns a CodeMirror extension that provides comprehensive image handling.
 * This includes rendering markdown images as interactive widgets, handling
 * drag-and-drop/paste of image files, and managing selection styles.
 */
export function imageExtension(): Extension {
    return [
        imageSizeField,
        placeholderField,
        imageWidgetPlugin,
        imageDragAndDropPlugin,
        // Update listener to add a 'selected' class to image widgets when they are part of the selection.
        EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.selectionSet || update.viewportChanged) {
                const {from, to} = update.state.selection.main
                update.view.dom.querySelectorAll(".cm-image-widget").forEach((el: Element) => {
                    const pos = update.view.posAtDOM(el as HTMLElement)
                    if (pos !== null && pos >= from && pos < to) {
                        el.classList.add("selected")
                    } else {
                        el.classList.remove("selected")
                    }
                })
            }
        }),
        // Input handler to allow typing on a new line *before* an image widget.
        EditorView.inputHandler.of((view, from, _to, text) => {
            const doc = view.state.doc;
            const line = doc.lineAt(from);
            const lineContent = line.text;
            let isImageLine = false;

            if (parseMarkdownImage(lineContent.trim())) {
                isImageLine = true;
            }

            // If typing at the very beginning of a line that only contains an image.
            if (from === line.from && isImageLine) {
                // Insert a new line before the image.
                view.dispatch({
                    changes: [{from: line.from, insert: '\n'}],
                    selection: EditorSelection.cursor(line.from),
                    scrollIntoView: true
                });

                // Then, insert the typed text on the newly created line.
                view.dispatch({
                    changes: [{from: line.from, insert: text}],
                    selection: EditorSelection.cursor(line.from + text.length),
                    scrollIntoView: true
                });

                return true; // Indicate we have handled this input.
            }

            return false; // Let CodeMirror handle other cases.
        })
    ]
}
