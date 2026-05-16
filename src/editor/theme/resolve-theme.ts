import type { Extension } from '@codemirror/state';
import type { Theme } from '../../core';
import { darkTheme, lightTheme } from '../../theme/base-theme';

const themeExtensionMap: Record<Theme, Extension> = {
    light: lightTheme,
    dark: darkTheme,
};

export function resolveThemeExtension(theme: Theme): Extension {
    return themeExtensionMap[theme];
}
