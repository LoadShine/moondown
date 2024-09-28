import {HighlightStyle, syntaxHighlighting} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {EditorView} from "@codemirror/view";

// Color palette
const rose = "#FF69B4";
const lightBlue = "#4299E1";
const purple = "#9F7AEA";
const green = "#48BB78";
const orange = "#ED8936";
const red = "#F56565";
const yellow = "#ECC94B";
const primaryText = "#2D3748";
const secondaryText = "#718096";
const background = "#FFFFFF";
const lineHighlight = "#EDF2F7";
const selection = "#BEE3F8";
const pink = "#ED64A6";
const teal = "#38B2AC";
const indigo = "#667EEA";

// Dark theme colors for code
const darkBackground = "#1A202C";
const darkPrimaryText = "#E2E8F0";
const darkSecondaryText = "#A0AEC0";

const codeFont = "'Fira Code', 'Roboto Mono', monospace";

export const editorBaseTheme = EditorView.theme({
    "&": {
        color: primaryText,
        backgroundColor: background,
    },
    ".cm-content": {
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: "16px",
        lineHeight: "1.6",
    },
    ".cm-line": {
        padding: "0 8px",
    },
    ".cm-cursor": {
        borderLeftColor: lightBlue,
    },
    ".cm-selectionBackground": {
        backgroundColor: selection,
    },
    ".cm-gutters": {
        backgroundColor: background,
        color: secondaryText,
        border: "none",
        borderRight: `1px solid ${lineHighlight}`,
    },
    ".cm-gutterElement": {
        padding: "0 8px 0 16px",
    },
    ".cm-foldGutter": {
        color: secondaryText,
    },
    ".cm-activeLineGutter": {
        backgroundColor: lineHighlight,
    },
    ".cm-activeLine": {
        backgroundColor: lineHighlight,
    },
    ".cm-searchMatch": {
        backgroundColor: yellow,
        outline: `1px solid ${orange}`,
    },
    ".cm-selectionMatch": {
        backgroundColor: selection,
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: `${lightBlue}33`,
        outline: `1px solid ${lightBlue}`,
    },
    ".cm-hidden-markdown": {display: "none"},
    ".cm-visible-markdown": {color: rose},
    ".cm-blockquote-widget": {
        display: "block",
        width: "100%",
        borderRadius: "4px",
        padding: "8px 12px",
        margin: "8px 0",
        lineHeight: "1.4",
        whiteSpace: "pre-wrap",
        boxSizing: "border-box",
        borderLeft: `4px solid ${rose}`,
        background: "#fff5f7",
        fontStyle: "italic",
        color: "#555",
    },
    ".cm-blockcode-widget": {
        display: "block",
        width: "100%",
        borderRadius: "4px",
        padding: "8px 12px",
        margin: "8px 0",
        lineHeight: "1.4",
        whiteSpace: "pre-wrap",
        boxSizing: "border-box",
        fontFamily: codeFont,
        border: "1px solid #2D3748",
        background: darkBackground,
        color: darkPrimaryText,
    },
    ".cm-blockcode-widget pre": {
        margin: 0,
        padding: 0,
    },
    ".cm-blockcode-widget code": {
        display: "block",
        padding: "1em",
        overflow: "auto",
    },
    ".cm-inline-code-widget": {
        fontFamily: codeFont,
        background: "#EDF2F7",
        color: "#2D3748",
        padding: "0 4px",
        margin: "0 4px",
        borderRadius: "3px",
        display: "inline-block",
    },
    ".cm-link-widget": {
        textDecoration: "none",
        color: lightBlue,
        borderBottom: `1px solid ${lightBlue}`,
    },
    ".cm-image-widget": {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "100%",
        margin: "12px 0",
    },
    ".cm-image-widget img": {
        maxWidth: "100%",
        height: "auto",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
    ".cm-image-caption": {
        textAlign: "center",
        color: secondaryText,
        fontSize: "0.9em",
        marginTop: "8px",
    },
    ".cm-strikethrough-widget": {
        textDecoration: "line-through",
        color: secondaryText,
    },
    ".cm-highlight-widget": {
        backgroundColor: "#FEFCBF",
        padding: "2px 4px",
        borderRadius: "4px",
    },
    ".cm-blockcode-widget .hljs": {
        display: "block",
        "overflow-x": "auto",
        padding: "1em",
        background: darkBackground,
        color: darkPrimaryText,
    },
    ".cm-blockcode-widget .hljs-comment, .cm-blockcode-widget .hljs-quote": {
        color: darkSecondaryText,
        fontStyle: "italic",
    },
    ".cm-blockcode-widget .hljs-keyword, .cm-blockcode-widget .hljs-selector-tag, .cm-blockcode-widget .hljs-built_in, .cm-blockcode-widget .hljs-name, .cm-blockcode-widget .hljs-tag": {
        color: "#81A1C1",
    },
    ".cm-blockcode-widget .hljs-string, .cm-blockcode-widget .hljs-title, .cm-blockcode-widget .hljs-section, .cm-blockcode-widget .hljs-attribute, .cm-blockcode-widget .hljs-literal, .cm-blockcode-widget .hljs-template-tag, .cm-blockcode-widget .hljs-template-variable, .cm-blockcode-widget .hljs-type, .cm-blockcode-widget .hljs-addition": {
        color: "#A3BE8C",
    },
    ".cm-blockcode-widget .hljs-deletion, .cm-blockcode-widget .hljs-selector-attr, .cm-blockcode-widget .hljs-selector-pseudo, .cm-blockcode-widget .hljs-meta": {
        color: "#BF616A",
    },
    ".cm-blockcode-widget .hljs-doctag": {
        color: "#8FBCBB",
    },
    ".cm-blockcode-widget .hljs-attr": {
        color: "#88C0D0",
    },
    ".cm-blockcode-widget .hljs-symbol, .cm-blockcode-widget .hljs-bullet": {
        color: "#B48EAD",
    },
    ".cm-blockcode-widget .hljs-number": {
        color: "#D08770",
    },
    ".cm-blockcode-widget .hljs-link": {
        color: "#5E81AC",
        textDecoration: "underline",
    },
    ".cm-blockcode-widget .hljs-emphasis": {
        fontStyle: "italic",
    },
    ".cm-blockcode-widget .hljs-strong": {
        fontWeight: "bold",
    },
}, {dark: false});

export const highlightStyles = HighlightStyle.define([
    {tag: tags.heading1, fontWeight: "800", fontSize: "2em", color: primaryText},
    {tag: tags.heading2, fontWeight: "700", fontSize: "1.5em", color: primaryText},
    {tag: tags.heading3, fontWeight: "600", fontSize: "1.17em", color: primaryText},
    {tag: tags.heading4, fontWeight: "600", fontSize: "1em", color: primaryText},
    {tag: tags.heading5, fontWeight: "600", fontSize: "0.83em", color: primaryText},
    {tag: tags.heading6, fontWeight: "600", fontSize: "0.67em", color: primaryText},
    {tag: tags.link, color: lightBlue},
    {tag: tags.emphasis, fontStyle: "italic"},
    {tag: tags.strong, fontWeight: "bold"},
    {tag: tags.keyword, color: purple, fontFamily: codeFont},
    {tag: tags.atom, color: pink, fontFamily: codeFont},
    {tag: tags.bool, color: pink, fontFamily: codeFont},
    {tag: tags.url, color: green, fontFamily: codeFont},
    {tag: tags.labelName, color: red, fontFamily: codeFont},
    {tag: tags.inserted, color: green, fontFamily: codeFont},
    {tag: tags.deleted, color: red, fontFamily: codeFont},
    {tag: tags.literal, color: pink, fontFamily: codeFont},
    {tag: tags.string, color: green, fontFamily: codeFont},
    {tag: tags.number, color: pink, fontFamily: codeFont},
    {tag: [tags.regexp, tags.escape, tags.special(tags.string)], color: pink, fontFamily: codeFont},
    {tag: tags.definition(tags.propertyName), color: teal, fontFamily: codeFont},
    {tag: tags.function(tags.variableName), color: indigo, fontFamily: codeFont},
    {tag: tags.typeName, color: yellow, fontFamily: codeFont},
    {tag: tags.className, color: yellow, fontFamily: codeFont},
    {tag: tags.comment, color: secondaryText, fontStyle: "italic", fontFamily: codeFont},
    {tag: tags.meta, color: purple, fontFamily: codeFont},
    {tag: tags.invalid, color: red, fontFamily: codeFont},
    {tag: tags.variableName, color: indigo, fontFamily: codeFont},
    {tag: tags.operator, color: purple, fontFamily: codeFont},
    {tag: tags.punctuation, color: primaryText, fontFamily: codeFont},
    {tag: tags.bracket, color: primaryText, fontFamily: codeFont},
    {tag: tags.tagName, color: red, fontFamily: codeFont},
    {tag: tags.attributeName, color: teal, fontFamily: codeFont},
    {tag: tags.attributeValue, color: green, fontFamily: codeFont},
    {tag: tags.processingInstruction, color: purple, fontFamily: codeFont},
    {tag: tags.documentMeta, color: lightBlue, fontFamily: codeFont},
    {tag: tags.definition(tags.typeName), color: yellow, fontFamily: codeFont},
    {tag: tags.moduleKeyword, color: purple, fontFamily: codeFont},
    {tag: tags.special(tags.brace), color: purple, fontFamily: codeFont},
    {tag: tags.namespace, color: lightBlue, fontFamily: codeFont},
    {tag: tags.macroName, color: purple, fontFamily: codeFont},
    {tag: tags.changed, color: orange, fontFamily: codeFont},
]);

export const baseTheme = [
    syntaxHighlighting(highlightStyles),
    editorBaseTheme
];