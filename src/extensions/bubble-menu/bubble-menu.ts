import { type PluginValue, EditorView, type ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { createPopper, type Instance as PopperInstance } from '@popperjs/core';
import { CSS_CLASSES, POPPER_CONFIG } from '../../core';
import { createElement } from '../../core';
import { AIPolishPanel } from './ai-polish-panel';
import { bubbleMenuField, showBubbleMenu } from './fields';
import type { BubbleMenuItem } from './types';
import {
    localeState,
    onAIStreamState,
    translationsState,
} from '../runtime/editor-runtime-state';
import { createBubbleMenuItems } from './bubble-menu-items';
import {
    renderBubbleMenuDom,
    updateBubbleMenuActiveStates,
} from './bubble-menu-dom';
import {
    createSelectionVirtualElement,
    isImageSelection,
    positionAIPolishPanel,
} from './bubble-menu-positioning';
import { isWidgetEditableSelection } from '../widget-edit-bubble';

export class BubbleMenu implements PluginValue {
    private readonly dom: HTMLElement;
    private readonly items: BubbleMenuItem[];
    private readonly view: EditorView;
    private popper: PopperInstance | null;
    private readonly boundHandleMouseUp: (event: MouseEvent) => void;
    private aiPolishPanel: AIPolishPanel | null = null;
    private aiPolishAnchorFrom: number = 0;
    private aiPolishAnchorTo: number = 0;
    /** The original text that was selected when AI Polish was triggered. */
    private aiPolishOriginalText: string = '';

    constructor(view: EditorView) {
        this.view = view;
        this.dom = createElement('div', CSS_CLASSES.BUBBLE_MENU);
        this.items = createBubbleMenuItems({
            onAIPolish: (targetView) => this.handleAIPolish(targetView),
        });

        this.buildMenu();
        document.body.appendChild(this.dom);

        this.popper = null;
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        document.addEventListener('mouseup', this.boundHandleMouseUp);
    }

    update(update: ViewUpdate): void {
        // Orphaned AI Polish panel detection.
        // If any document change touches the original anchor range, destroy the panel.
        if (this.aiPolishPanel && update.docChanged) {
            let touches = false;
            update.changes.iterChangedRanges((fromA, toA) => {
                if (toA >= this.aiPolishAnchorFrom && fromA <= this.aiPolishAnchorTo) {
                    touches = true;
                }
            });
            if (touches) {
                this.destroyAIPolishPanel();
            }
        }

        const menu = update.state.field(bubbleMenuField);
        if (!menu || update.state.facet(EditorState.readOnly)) {
            this.hide();
            if (update.state.facet(EditorState.readOnly)) {
                this.destroyAIPolishPanel();
            }
            return;
        }

        const { from, to } = update.state.selection.main;
        if (
            from === to ||
            isImageSelection(update.state, from, to) ||
            isWidgetEditableSelection(update.state, from, to)
        ) {
            this.hide();
            return;
        }

        this.show(from, to);
    }

    destroy(): void {
        this.destroyPopper();
        this.destroyAIPolishPanel();
        this.dom.remove();
        document.removeEventListener('mouseup', this.boundHandleMouseUp);
    }

    private hide(): void {
        this.dom.style.display = 'none';
        this.destroyPopper();
    }

    private destroyPopper(): void {
        if (this.popper) {
            this.popper.destroy();
            this.popper = null;
        }
    }

    private show(from: number, to: number): void {
        requestAnimationFrame(() => {
            this.dom.style.display = 'flex';

            const virtualElement = createSelectionVirtualElement(this.view, from, to);
            if (!virtualElement) {
                return;
            }

            this.destroyPopper();

            this.popper = createPopper(virtualElement, this.dom, {
                placement: POPPER_CONFIG.PLACEMENT,
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: POPPER_CONFIG.OFFSET,
                        },
                    },
                ],
            });

            updateBubbleMenuActiveStates(this.dom, this.items, this.view.state);
            this.popper.update();
        });
    }

    private handleMouseUp(_event: MouseEvent): void {
        const { state } = this.view;
        const { from, to } = state.selection.main;

        if (state.facet(EditorState.readOnly)) {
            this.hide();
            this.destroyAIPolishPanel();
            return;
        }

        if (
            from !== to &&
            !isImageSelection(state, from, to) &&
            !isWidgetEditableSelection(state, from, to)
        ) {
            this.view.dispatch({
                effects: showBubbleMenu.of({
                    pos: Math.max(from, to),
                    items: this.items,
                }),
            });
            return;
        }

        this.hide();
    }

    private clearSelectionAndFocus(): void {
        requestAnimationFrame(() => {
            const currentPos = this.view.state.selection.main.head;
            this.view.dispatch({
                selection: { anchor: currentPos, head: currentPos },
            });
            this.view.focus();
        });
    }

    private buildMenu(): void {
        renderBubbleMenuDom({
            dom: this.dom,
            items: this.items,
            view: this.view,
            onActionFinished: () => {
                this.hide();
                this.clearSelectionAndFocus();
            },
        });
    }

    private handleAIPolish(view: EditorView): boolean {
        if (view.state.facet(EditorState.readOnly)) {
            return false;
        }

        const { from, to } = view.state.selection.main;
        const selectedText = view.state.sliceDoc(from, to);

        if (!selectedText.trim()) {
            return false;
        }

        const onAIStream = view.state.field(onAIStreamState, false);
        if (!onAIStream) {
            alert('AI stream handler is not configured. Please provide config.onAIStream when creating Moondown.');
            return false;
        }

        const translations = view.state.field(translationsState);
        const locale = view.state.field(localeState);

        this.destroyAIPolishPanel();

        this.aiPolishPanel = new AIPolishPanel({
            selectedText,
            from,
            to,
            view,
            onClose: () => {
                this.destroyAIPolishPanel();
            },
            onInsert: (polishedText: string) => {
                if (view.state.facet(EditorState.readOnly)) {
                    return;
                }
                view.dispatch({
                    changes: { from, to, insert: polishedText },
                    selection: { anchor: from + polishedText.length },
                });
                view.focus();
            },
            onAIStream,
            locale,
            translations,
        });

        // Record anchor range and original text for orphan detection
        this.aiPolishAnchorFrom = from;
        this.aiPolishAnchorTo = to;
        this.aiPolishOriginalText = selectedText;

        this.positionAIPolishPanel();
        document.body.appendChild(this.aiPolishPanel.getDOM());
        return true;
    }

    private positionAIPolishPanel(): void {
        if (!this.aiPolishPanel) {
            return;
        }

        requestAnimationFrame(() => {
            positionAIPolishPanel(this.dom, this.aiPolishPanel!.getDOM());
        });
    }

    private destroyAIPolishPanel(): void {
        if (this.aiPolishPanel) {
            this.aiPolishPanel.destroy();
            this.aiPolishPanel = null;
        }
    }
}
