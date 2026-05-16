import { syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { createHighlightStyle } from './theme-highlight-style';
import { buildEditorStyles } from './theme-editor-styles';
import {
    darkThemeColors,
    lightThemeColors,
    type ThemeColors,
} from './theme-palette';

// --- Base Theme Structure ---
const createEditorTheme = (colors: ThemeColors, isDark: boolean) => {
    const animationName = isDark ? 'colorChangeDark' : 'colorChangeLight';
    const visibleMarkdownColor = isDark
        ? 'hsl(var(--color-primary-light-hsl) / 0.6)'
        : 'hsl(var(--color-primary-hsl) / 0.5)';

    return EditorView.theme(
        buildEditorStyles({
            colors,
            isDark,
            animationName,
            visibleMarkdownColor,
        }),
        { dark: isDark }
    );
}

// --- Export Light Theme ---
export const editorLightTheme = createEditorTheme(lightThemeColors, false);
export const lightHighlightStyle = createHighlightStyle(lightThemeColors);
export const lightTheme = [
    editorLightTheme,
    syntaxHighlighting(lightHighlightStyle)
];

// --- Export Dark Theme ---
export const editorDarkTheme = createEditorTheme(darkThemeColors, true);
export const darkHighlightStyle = createHighlightStyle(darkThemeColors);
export const darkTheme = [
    editorDarkTheme,
    syntaxHighlighting(darkHighlightStyle)
];
