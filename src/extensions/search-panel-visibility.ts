import { getSearchQuery, openSearchPanel, SearchQuery, setSearchQuery } from '@codemirror/search';
import { EditorView, ViewPlugin } from '@codemirror/view';

function readSearchPanelQuery(view: EditorView): SearchQuery | null {
    const panel = view.dom.querySelector<HTMLElement>('.cm-search');
    const searchField = panel?.querySelector<HTMLInputElement>('input[name="search"]');
    if (!panel || !searchField) {
        return null;
    }

    const replaceField = panel.querySelector<HTMLInputElement>('input[name="replace"]');
    const caseField = panel.querySelector<HTMLInputElement>('input[name="case"]');
    const regexpField = panel.querySelector<HTMLInputElement>('input[name="re"]');
    const wordField = panel.querySelector<HTMLInputElement>('input[name="word"]');

    return new SearchQuery({
        search: searchField.value,
        replace: replaceField?.value ?? '',
        caseSensitive: caseField?.checked ?? false,
        regexp: regexpField?.checked ?? false,
        wholeWord: wordField?.checked ?? false,
    });
}

export const searchPanelInputSync = ViewPlugin.fromClass(class {
    private readonly view: EditorView;
    private readonly handleInput: (event: Event) => void;

    constructor(view: EditorView) {
        this.view = view;
        this.handleInput = (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !target.closest('.cm-search')) {
                return;
            }

            const query = readSearchPanelQuery(this.view);
            if (query && !query.eq(getSearchQuery(this.view.state))) {
                this.view.dispatch({ effects: setSearchQuery.of(query) });
            }
        };

        this.view.dom.addEventListener('input', this.handleInput, true);
    }

    destroy(): void {
        this.view.dom.removeEventListener('input', this.handleInput, true);
    }
});

export function revealSearchPanel(view: EditorView): void {
    requestAnimationFrame(() => {
        const searchPanel = view.dom.querySelector<HTMLElement>('.cm-search');
        const panel = searchPanel?.closest<HTMLElement>('.cm-panels-top') ?? searchPanel;
        panel?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
}

export function openVisibleSearchPanel(view: EditorView): boolean {
    const opened = openSearchPanel(view);
    revealSearchPanel(view);
    return opened;
}
