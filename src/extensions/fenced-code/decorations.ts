import {Decoration} from "@codemirror/view";

/**
 * A line decoration to apply a background and styling to fenced code block lines.
 */
export const fencedCodeDecoration = Decoration.line({
    attributes: {class: "cm-fenced-code"}
})

/**
 * A line decoration used to hide lines, such as the opening and closing
 * backtick lines of a fenced code block in WYSIWYG mode.
 * Note: This specific implementation might be superseded by Decoration.replace,
 * but is kept for potential alternative styling.
 */
export const hideLineDecoration = Decoration.line({
    attributes: {class: "cm-hide-line"}
})