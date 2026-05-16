import type { TableEditorOptions } from './types.ts';

export function resolveTableEditorContainer(options: TableEditorOptions): HTMLElement {
    if (options.container instanceof HTMLElement) {
        return options.container;
    }

    if (typeof options.container === 'string') {
        const target = document.querySelector(options.container);
        if (target === null) {
            throw new Error(`Could not find element using selector ${options.container}`);
        }
        return target as HTMLElement;
    }

    return document.body;
}
