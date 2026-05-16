import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { VirtualElement } from '@popperjs/core';
import { isMarkdownImage } from '../../core';

export function isImageSelection(state: EditorState, from: number, to: number): boolean {
    return isMarkdownImage(state.sliceDoc(from, to));
}

export function createSelectionVirtualElement(
    view: EditorView,
    from: number,
    to: number
): VirtualElement | null {
    const startPos = view.coordsAtPos(from);
    const endPos = view.coordsAtPos(to);
    if (!startPos || !endPos) {
        return null;
    }

    return {
        getBoundingClientRect: (): DOMRect =>
            new DOMRect(
                startPos.left,
                startPos.top,
                endPos.left - startPos.left,
                startPos.bottom - startPos.top
            ),
    };
}

export function positionAIPolishPanel(menuDom: HTMLElement, panelDom: HTMLElement): void {
    const menuRect = menuDom.getBoundingClientRect();
    panelDom.style.top = `${menuRect.bottom + 12}px`;
    panelDom.style.left = `${menuRect.left}px`;
}
