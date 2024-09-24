import {EditorView} from "@codemirror/view";

export const editorBaseTheme = EditorView.baseTheme({
    '.cm-hidden-markdown': {display: 'none'},
    '.cm-visible-markdown': {color: 'darkgray'},
    '.cm-blockquote-widget, .cm-blockcode-widget': {
        display: 'block',
        width: '100%',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '4px 8px',
        margin: '4px 0',
        lineHeight: '1.2',
        whiteSpace: 'pre-wrap',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        fontSize: 'inherit',
    },
    '.cm-blockquote-widget': {
        background: '#f9f9f9',
    },
    '.cm-blockcode-widget': {
        fontFamily: 'monospace',
        background: '#282c34',
        color: '#abb2bf', // 设置默认文本颜色
    },
    '.cm-blockcode-widget pre': {
        margin: 0,
        padding: 0,
    },
    '.cm-blockcode-widget code': {
        display: 'block',
        padding: '1em',
        overflow: 'auto',
    },
    '.cm-blockcode-widget .hljs': {
        display: 'block',
        'overflow-x': 'auto',
        padding: '1em',
    },
    '.cm-blockcode-widget .hljs-comment, .cm-blockcode-widget .hljs-quote': {
        color: '#5c6370',
        fontStyle: 'italic',
    },
    '.cm-blockcode-widget .hljs-doctag, .cm-blockcode-widget .hljs-keyword, .cm-blockcode-widget .hljs-formula': {
        color: '#c678dd',
    },
    '.cm-blockcode-widget .hljs-section, .cm-blockcode-widget .hljs-name, .cm-blockcode-widget .hljs-selector-tag, .cm-blockcode-widget .hljs-deletion, .cm-blockcode-widget .hljs-subst': {
        color: '#e06c75',
    },
    '.cm-blockcode-widget .hljs-literal': {
        color: '#56b6c2',
    },
    '.cm-blockcode-widget .hljs-string, .cm-blockcode-widget .hljs-regexp, .cm-blockcode-widget .hljs-addition, .cm-blockcode-widget .hljs-attribute, .cm-blockcode-widget .hljs-meta-string': {
        color: '#98c379',
    },
    '.cm-blockcode-widget .hljs-built_in, .cm-blockcode-widget .hljs-class .cm-blockcode-widget .hljs-title': {
        color: '#e6c07b',
    },
    '.cm-inline-code-widget': {
        fontFamily: 'monospace',
        background: '#f0f0f0',
        padding: '2px 4px',
        borderRadius: '3px',
        display: 'inline-block',
    },
    '.cm-link-widget': {
        textDecoration: 'underline',
        color: 'lightblue',
    },
    '.cm-widgetBuffer': {
        display: 'none !important',
    },
    '.cm-image-widget': {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '100%',
        margin: '4px 0',
    },
    '.cm-image-widget img': {
        maxWidth: '100%',
        height: 'auto',
    },
    '.cm-image-caption': {
        textAlign: 'center',
        color: '#777',
        fontSize: '0.9em',
        marginTop: '4px',
    },
    '.cm-strikethrough-widget': {
        textDecoration: 'line-through',
    },
    '.cm-highlight-widget': {
        backgroundColor: 'yellow',
    },
})