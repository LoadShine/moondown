import { codeFont, type ThemeColors } from './theme-palette';
import { EditorView } from '@codemirror/view';

interface BuildEditorStylesOptions {
    colors: ThemeColors;
    isDark: boolean;
    animationName: string;
    visibleMarkdownColor: string;
}

type EditorThemeSpec = Parameters<typeof EditorView.theme>[0];

function accentAlpha(isDark: boolean, alpha: number): string {
    return `hsl(var(${isDark ? '--color-primary-light-hsl' : '--color-primary-hsl'}) / ${alpha})`;
}

function buildBlockquoteLevelStyles(): EditorThemeSpec {
    const styles: Record<string, unknown> = {};
    const MAX_UNIQUE_COLORS = 3;
    for (let i = 1; i <= 10; i++) {
        const gradients = [];
        const positions = [];
        for (let j = 1; j <= i; j++) {
            const colorVar = j <= MAX_UNIQUE_COLORS ? `var(--bq-color-${j})` : 'var(--bq-color-deep)';
            gradients.push(`linear-gradient(${colorVar}, ${colorVar})`);

            const position = j === 1
                ? 'var(--bq-padding-base) 0'
                : `calc(var(--bq-padding-base) + (${j - 1}) * (var(--bq-bar-width) + var(--bq-bar-gap))) 0`;
            positions.push(position);
        }
        styles[`.cm-blockquote-line[data-bq-level='${i}']`] = {
            '--data-bq-level': i,
            backgroundImage: gradients.join(', '),
            backgroundSize: Array(i).fill('var(--bq-bar-width) 100%').join(', '),
            backgroundPosition: positions.join(', '),
        };
    }
    return styles as EditorThemeSpec;
}

export function buildEditorStyles(options: BuildEditorStylesOptions): EditorThemeSpec {
    const { colors, isDark, animationName, visibleMarkdownColor } = options;

    return {
        '&': {
            color: colors.primaryText,
            backgroundColor: colors.background,
            height: '100%',
            '--bq-bar-width': '3px',
            '--bq-bar-gap': '12px',
            '--bq-padding-base': '16px',
            '--bq-text-gap': '16px',
            '--bq-border-radius': '6px',
            '--bq-color-1': accentAlpha(isDark, 0.55),
            '--bq-color-2': accentAlpha(isDark, 0.7),
            '--bq-color-3': accentAlpha(isDark, 0.85),
            '--bq-color-deep': isDark ? 'hsl(var(--color-primary-hsl))' : 'hsl(var(--color-primary-dark-hsl))',
            '-webkit-font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale',
        },
        '.cm-scroller': {
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
            fontSize: '15.5px',
            lineHeight: '1.7',
            overflow: 'auto !important',
        },
        '&.cm-focused': {
            outline: 'none',
        },
        '.cm-content': {
            minHeight: '100%',
            padding: '40px 28px 64px',
            maxWidth: '780px',
            margin: '0 auto',
        },
        '.cm-content.cm-focused': {
            outline: 'none',
        },
        '.cm-line': {
            padding: '0 4px',
        },
        '.cm-cursor': {
            borderLeftColor: colors.lightBlue,
            borderLeftWidth: '2px',
        },
        '.cm-selectionBackground': {
            backgroundColor: colors.selection,
        },
        '.cm-gutters': {
            backgroundColor: colors.background,
            color: colors.secondaryText,
            border: 'none',
            borderRight: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        },
        '.cm-gutterElement': {
            padding: '0 8px 0 16px',
            fontSize: '12px',
            fontFamily: codeFont,
        },
        '.cm-foldGutter': {
            color: colors.secondaryText,
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: colors.primaryText,
        },
        '.cm-activeLine': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
            borderRadius: '4px',
        },
        '.cm-searchMatch': {
            backgroundColor: colors.yellow,
            outline: `1px solid ${colors.orange}`,
        },
        '.cm-selectionMatch': {
            backgroundColor: colors.selection,
        },
        '.cm-matchingBracket, .cm-nonmatchingBracket': {
            backgroundColor: accentAlpha(isDark, 0.16),
            outline: `1px solid ${colors.lightBlue}`,
        },

        // Syntax hiding
        '.cm-hidden-markdown': {},
        '.cm-visible-markdown, .cm-meta': {
            color: visibleMarkdownColor,
            opacity: '1',
        },

        '.cm-link-definition-widget': {
            color: colors.secondaryText,
            fontFamily: codeFont,
            fontSize: '0.9em',
            padding: '2px 7px',
            borderRadius: '6px',
            background: colors.inlineCodeBg,
            border: `1px solid ${colors.inlineCodeBorder}`,
            cursor: 'pointer',
            transition: 'background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease',
            '&:hover': {
                background: accentAlpha(isDark, 0.12),
                color: colors.lightBlue,
            },
        },

        // Footnote styles
        '.cm-footnote-widget': {
            color: colors.lightBlue,
            fontSize: '0.8em',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '1px 2px',
            borderRadius: '2px',
            transition: 'all 0.2s ease',
            '&:hover': {
                background: accentAlpha(isDark, 0.12),
            },
        },

        '.cm-footnote-definition-widget': {
            color: colors.secondaryText,
            fontFamily: codeFont,
            fontSize: '0.9em',
            padding: '2px 7px',
            borderRadius: '6px',
            background: colors.inlineCodeBg,
            border: `1px solid ${colors.inlineCodeBorder}`,
            cursor: 'pointer',
            transition: 'background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease',
            '&:hover': {
                background: accentAlpha(isDark, 0.12),
                color: colors.lightBlue,
            },
        },

        '.cm-footnote-definition-line': {
            paddingLeft: '8px',
        },

        '.cm-footnote-definition-content': {
            color: colors.primaryText,
        },

        '.cm-reference-highlight': {
            animation: `${isDark ? 'referenceHighlightDark' : 'referenceHighlightLight'} 2s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
            borderRadius: '6px',
            padding: '2px 0',
        },

        '@keyframes referenceHighlightLight': {
            '0%': {
                backgroundColor: `${colors.yellow}80`,
                boxShadow: `0 0 0 3px ${colors.yellow}50`,
                transform: 'scale(1.02)',
            },
            '50%': {
                backgroundColor: `${colors.yellow}60`,
                boxShadow: `0 0 0 2px ${colors.yellow}30`,
            },
            '100%': {
                backgroundColor: 'transparent',
                boxShadow: '0 0 0 0 transparent',
                transform: 'scale(1)',
            },
        },

        '@keyframes referenceHighlightDark': {
            '0%': {
                backgroundColor: `${colors.yellow}60`,
                boxShadow: `0 0 0 3px ${colors.yellow}40`,
                transform: 'scale(1.02)',
            },
            '50%': {
                backgroundColor: `${colors.yellow}40`,
                boxShadow: `0 0 0 2px ${colors.yellow}20`,
            },
            '100%': {
                backgroundColor: 'transparent',
                boxShadow: '0 0 0 0 transparent',
                transform: 'scale(1)',
            },
        },

        // Horizontal Rule Styling
        '.cm-hr-line': {
            position: 'relative',
            margin: '1.5em 0',
            height: '2px',
            '&::after': {
                content: '""',
                position: 'absolute',
                left: '8px',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '1px',
                backgroundColor: colors.secondaryText,
                opacity: 0.22,
                borderRadius: '1px',
            },
        },
        '.cm-hr-line-selected .cm-visible-markdown': { color: colors.secondaryText },

        '.cm-blockquote-line': {
            backgroundRepeat: 'no-repeat',
            position: 'relative',
        },

        '.cm-blockquote-first-line::before, .cm-blockquote-last-line::after': {
            content: 'none',
            display: 'none',
        },

        '.cm-blockquote-line[data-bq-level]': {
            paddingLeft: 'calc(var(--bq-padding-base) + (var(--data-bq-level, 1) - 1) * (var(--bq-bar-width) + var(--bq-bar-gap)) + var(--bq-bar-width) + var(--bq-text-gap))',
        },
        ...buildBlockquoteLevelStyles(),

        // Code block styling
        '.cm-line.cm-fenced-code': {
            backgroundColor: 'transparent',
            position: 'relative',
            color: colors.codeText,
            fontFamily: codeFont,
            padding: '4px 16px',
            boxSizing: 'border-box',
            fontSize: '13px',
            lineHeight: '1.7',
        },
        '.cm-line.cm-fenced-code::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.codeBackground,
            borderRadius: 0,
            zIndex: -1,
        },
        '.cm-line.cm-fenced-code:has(.cm-mermaid-widget)::before, .cm-line.cm-fenced-code:has(.cm-latex-widget)::before': {
            content: 'none',
            display: 'none',
        },

        '.cm-blockquote-line[data-bq-level].cm-fenced-code': {
            paddingLeft: 'calc(var(--bq-padding-base) + (var(--data-bq-level, 1) - 1) * (var(--bq-bar-width) + var(--bq-bar-gap)) + var(--bq-bar-width) + var(--bq-text-gap) + 16px)',
            paddingRight: '16px',
        },

        '.cm-blockquote-line[data-bq-level].cm-fenced-code::before': {
            left: 'calc(var(--bq-padding-base) + (var(--data-bq-level, 1) - 1) * (var(--bq-bar-width) + var(--bq-bar-gap)) + var(--bq-bar-width) + var(--bq-text-gap))',
            right: '8px',
            top: 0,
            bottom: 0,
        },

        // List styling
        '.cm-bullet-list': { color: visibleMarkdownColor, fontWeight: 'bold' },
        '.cm-ordered-list-marker, .cm-ordered-list-marker > span': {
            color: `${colors.lightBlue} !important`,
            fontFamily: 'inherit !important',
        },

        // Widget styles
        '.cm-inline-code-widget': {
            fontFamily: codeFont,
            background: colors.inlineCodeBg,
            color: colors.inlineCodeColor,
            padding: '2px 6px',
            borderRadius: '6px',
            border: `0.5px solid ${colors.inlineCodeBorder}`,
            fontSize: '0.92em',
        },
        '.cm-link-widget': {
            textDecoration: 'none',
            color: colors.lightBlue,
            borderBottom: `1px solid ${accentAlpha(isDark, 0.4)}`,
            cursor: 'pointer',
            transition: 'border-color 160ms ease, color 160ms ease',
        },
        '.cm-link-widget:hover': {
            borderBottomColor: colors.lightBlue,
        },
        '.cm-image-widget': {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '1.6em 0',
            position: 'relative',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
        },
        '.cm-image-widget img': {
            width: 'auto',
            height: 'auto',
            maxWidth: 'min(100%, 720px)',
            objectFit: 'contain',
            borderRadius: '12px',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
            boxShadow: isDark ? '0 20px 42px rgba(0, 0, 0, 0.42)' : '0 20px 42px rgba(0, 0, 0, 0.10)',
            margin: '0.5em',
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        },
        '.cm-image-widget .cm-image-alt': {
            marginTop: '0.85em',
            color: colors.secondaryText,
            fontSize: '0.78em',
            fontWeight: '500',
            letterSpacing: '0.005em',
        },
        '.cm-image-widget.selected': {
            outline: `3px solid ${accentAlpha(isDark, 0.26)}`,
            outlineOffset: '3px',
            borderRadius: '14px',
        },
        '.cm-image-placeholder': {
            background: colors.lineHighlight,
            border: `1px dashed ${colors.secondaryText}`,
            borderRadius: '12px',
            color: colors.secondaryText,
        },
        '.cm-image-error': {
            padding: '0.75em',
            color: colors.red,
            fontSize: '0.9em',
            background: `${colors.red}20`,
            border: `0.5px solid ${colors.red}33`,
            borderRadius: '8px',
            marginTop: '0.5em',
        },
        '.cm-mermaid-widget': {
            margin: '1.5em 0',
            border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: '12px',
            background: isDark ? '#1f1f21' : '#fbfbfd',
            boxShadow: isDark ? '0 18px 36px rgba(0, 0, 0, 0.28)' : '0 18px 36px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
            cursor: 'pointer',
        },
        '.cm-mermaid-canvas': {
            padding: '16px',
            minHeight: '72px',
        },
        '.cm-mermaid-canvas > svg': {
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            margin: '0 auto',
        },
        '.cm-mermaid-hint': {
            color: colors.secondaryText,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'}`,
            fontSize: '11px',
            fontWeight: '600',
            padding: '7px 12px',
            background: colors.background,
        },
        '.cm-mermaid-loading': {
            color: colors.secondaryText,
            fontFamily: codeFont,
            fontSize: '12px',
            padding: '8px 0',
        },
        '.cm-mermaid-error': {
            color: colors.red,
            fontFamily: codeFont,
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: `${colors.red}14`,
            border: `1px solid ${colors.red}33`,
            borderRadius: '8px',
            padding: '8px 10px',
        },
        '.cm-latex-widget': {
            margin: '1.35em 0',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
            borderRadius: '10px',
            background: isDark ? '#1f1f21' : '#fbfbfd',
            boxShadow: isDark ? '0 14px 30px rgba(0, 0, 0, 0.24)' : '0 14px 30px rgba(0, 0, 0, 0.06)',
            overflow: 'visible',
            cursor: 'pointer',
        },
        '.cm-latex-canvas': {
            padding: '16px',
            minHeight: '56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflow: 'visible',
        },
        '.cm-latex-line': {
            maxWidth: '100%',
            overflow: 'visible',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
        },
        '.cm-latex-line math': {
            display: 'block',
            maxWidth: '100%',
            overflow: 'visible',
        },
        '.cm-latex-hint': {
            color: colors.secondaryText,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'}`,
            fontSize: '11px',
            fontWeight: '600',
            padding: '7px 12px',
            background: colors.background,
        },
        '.cm-latex-loading': {
            color: colors.secondaryText,
            fontFamily: codeFont,
            fontSize: '12px',
            padding: '8px 0',
        },
        '.cm-latex-error': {
            color: colors.red,
            fontFamily: codeFont,
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: `${colors.red}14`,
            border: `1px solid ${colors.red}33`,
            borderRadius: '8px',
            padding: '8px 10px',
        },
        '.cm-strikethrough-widget': {
            textDecoration: 'line-through',
            opacity: '0.6',
        },
        '.cm-highlight-widget': {
            background: colors.highlightBg,
            color: colors.highlightColor,
            padding: '2px 5px',
            borderRadius: '6px',
        },
        '.cm-underline-widget': {
            textDecoration: 'underline',
            textDecorationColor: isDark ? 'hsl(var(--color-primary-light-hsl))' : 'hsl(var(--color-primary-hsl))',
            textDecorationThickness: '2px',
            textUnderlineOffset: '2px',
        },

        // Slash Command
        '.cm-slash-command-menu': {
            position: 'absolute',
            zIndex: 100,
            backgroundColor: colors.slashCommandBg,
            border: `0.5px solid ${colors.slashCommandBorder}`,
            borderRadius: '14px',
            boxShadow: isDark ? '0 28px 64px rgba(0, 0, 0, 0.56)' : '0 28px 64px rgba(0, 0, 0, 0.14)',
            padding: '5px',
            maxHeight: '320px',
            overflow: 'hidden auto',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif",
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            '&::-webkit-scrollbar': { display: 'none' },
        },
        '.cm-slash-command-item': {
            minHeight: '36px',
            padding: '7px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'background-color 0.14s ease, color 0.14s ease',
            '&:hover': { backgroundColor: colors.slashCommandHoverBg },
            '&.selected': { backgroundColor: colors.slashCommandSelectedBg },
        },
        '.cm-slash-command-icon': {
            marginRight: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            '& svg': { width: '16px', height: '16px', color: colors.slashCommandIcon },
        },
        '.cm-slash-command-title': { fontSize: '13.5px', fontWeight: '500', color: colors.slashCommandText, letterSpacing: '-0.005em' },
        '.cm-slash-command-divider': { margin: '5px 6px', border: 'none', borderTop: `0.5px solid ${colors.slashCommandBorder}` },

        // AI Ghost Writer
        '.cm-new-text': { animation: `${animationName} 2s forwards` },
        '.cm-loading-widget': {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 7px',
            backgroundColor: colors.lineHighlight,
            borderRadius: '999px',
            fontSize: '12px',
            color: colors.secondaryText,
        },
        '.cm-loading-spinner': {
            display: 'inline-block',
            width: '12px',
            height: '12px',
            marginRight: '5px',
            border: `2px solid ${colors.secondaryText}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        },

        [`@keyframes ${animationName}`]: {
            '0%, 99%': { color: colors.rose, opacity: 0.7 },
            '100%': { color: colors.primaryText, opacity: 1 },
        },
        '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
        },
    };
}
