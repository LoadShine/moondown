export interface ThemeColors {
    rose: string;
    lightBlue: string;
    purple: string;
    green: string;
    orange: string;
    red: string;
    yellow: string;
    primaryText: string;
    secondaryText: string;
    background: string;
    lineHighlight: string;
    selection: string;
    pink: string;
    teal: string;
    indigo: string;
    marker: string;
    codeBackground: string;
    codeText: string;
    codeSecondaryText: string;
    codeKeyword: string;
    codeString: string;
    codeNumber: string;
    codeComment: string;
    codeFunction: string;
    codeVariable: string;
    codeOperator: string;
    codeTag: string;
    codeAttribute: string;
    codeType: string;
    inlineCodeBg: string;
    inlineCodeColor: string;
    inlineCodeBorder: string;
    highlightBg: string;
    highlightColor: string;
    slashCommandBg: string;
    slashCommandBorder: string;
    slashCommandHoverBg: string;
    slashCommandSelectedBg: string;
    slashCommandText: string;
    slashCommandIcon: string;
}

export const lightThemeColors: ThemeColors = {
    rose: '#ff2d55',
    lightBlue: 'hsl(var(--color-primary-hsl))',
    purple: '#af52de',
    green: '#34c759',
    orange: '#ff9500',
    red: '#ff3b30',
    yellow: '#ffcc00',
    primaryText: '#1d1d1f',
    secondaryText: '#6e6e73',
    background: '#ffffff',
    lineHighlight: '#f5f5f7',
    selection: 'hsl(var(--color-primary-hsl) / 0.22)',
    pink: '#ff375f',
    teal: '#30b0c7',
    indigo: '#5856d6',
    marker: '#8e8e93',
    codeBackground: '#f5f5f7',
    codeText: '#1d1d1f',
    codeSecondaryText: '#6e6e73',

    // Code syntax highlighting colors
    codeKeyword: '#0057d9',
    codeString: '#248a3d',
    codeNumber: '#c2410c',
    codeComment: '#8e8e93',
    codeFunction: '#9b59b6',
    codeVariable: '#1d1d1f',
    codeOperator: '#424245',
    codeTag: '#d70015',
    codeAttribute: '#0f7f94',
    codeType: '#9a6700',

    // --- Styles aligned with table formatting ---
    inlineCodeBg: '#f2f2f7',
    inlineCodeColor: '#d70015',
    inlineCodeBorder: '#d1d1d6',
    highlightBg: '#fff2b2',
    highlightColor: '#5f4b00',

    slashCommandBg: 'rgba(255, 255, 255, 0.92)',
    slashCommandBorder: 'rgba(0, 0, 0, 0.12)',
    slashCommandHoverBg: '#f5f5f7',
    slashCommandSelectedBg: 'hsl(var(--color-primary-hsl) / 0.12)',
    slashCommandText: '#1d1d1f',
    slashCommandIcon: '#6e6e73',
};

export const darkThemeColors: ThemeColors = {
    rose: '#ff6482',
    lightBlue: 'hsl(var(--color-primary-light-hsl))',
    purple: '#bf5af2',
    green: '#30d158',
    orange: '#ff9f0a',
    red: '#ff453a',
    yellow: '#ffd60a',
    primaryText: '#f5f5f7',
    secondaryText: '#a1a1a6',
    background: '#1c1c1e',
    lineHighlight: '#2c2c2e',
    selection: 'hsl(var(--color-primary-light-hsl) / 0.24)',
    pink: '#ff375f',
    teal: '#40c8e0',
    indigo: '#5e5ce6',
    marker: '#8e8e93',
    codeBackground: '#2c2c2e',
    codeText: '#f5f5f7',
    codeSecondaryText: '#a1a1a6',

    // Code syntax highlighting colors (Dark theme)
    codeKeyword: '#64d2ff',
    codeString: '#63e6a1',
    codeNumber: '#ffb340',
    codeComment: '#8e8e93',
    codeFunction: '#d9a6ff',
    codeVariable: '#f5f5f7',
    codeOperator: '#d1d1d6',
    codeTag: '#ff6961',
    codeAttribute: '#5ac8fa',
    codeType: '#ffd60a',

    // --- Styles aligned with table formatting ---
    inlineCodeBg: '#2c2c2e',
    inlineCodeColor: '#ff6482',
    inlineCodeBorder: '#3a3a3c',
    highlightBg: '#5f4b00',
    highlightColor: '#fff2b2',

    slashCommandBg: 'rgba(28, 28, 30, 0.92)',
    slashCommandBorder: 'rgba(255, 255, 255, 0.16)',
    slashCommandHoverBg: '#2c2c2e',
    slashCommandSelectedBg: 'hsl(var(--color-primary-light-hsl) / 0.18)',
    slashCommandText: '#f5f5f7',
    slashCommandIcon: '#a1a1a6',
};

export const codeFont = "'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace";
