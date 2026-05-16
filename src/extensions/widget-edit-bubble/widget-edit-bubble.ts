import { EditorSelection, EditorState } from '@codemirror/state';
import type { PluginValue, ViewUpdate } from '@codemirror/view';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { createPopper, type Instance as PopperInstance } from '@popperjs/core';
import { CSS_CLASSES, CUSTOM_EVENTS, POPPER_CONFIG } from '../../core/constants';
import { createElement } from '../../core/utils/dom-utils';
import { createSelectionVirtualElement } from '../bubble-menu/bubble-menu-positioning';
import { resolveWidgetEditTarget, type WidgetEditTarget } from './selection-target';

function isSameTarget(
    previous: WidgetEditTarget | null,
    next: WidgetEditTarget | null
): boolean {
    if (!previous || !next) {
        return false;
    }

    return (
        previous.kind === next.kind &&
        previous.from === next.from &&
        previous.to === next.to &&
        previous.originalMarkdown === next.originalMarkdown
    );
}

export class WidgetEditBubble implements PluginValue {
    private readonly view: EditorView;
    private readonly dom: HTMLElement;
    private readonly title: HTMLElement;
    private readonly textarea: HTMLTextAreaElement;
    private readonly cancelButton: HTMLButtonElement;
    private readonly applyButton: HTMLButtonElement;
    private readonly actions: HTMLElement;
    private popper: PopperInstance | null = null;
    private activeTarget: WidgetEditTarget | null = null;
    private anchorElement: Element | null = null;
    private textareaHadUserInput = false;
    private readonly boundHandleDocumentMouseDown: (event: MouseEvent) => void;
    private readonly boundHandleWidgetEditRequest: (event: Event) => void;
    private readonly boundHandleTextareaKeyDown: (event: KeyboardEvent) => void;

    constructor(view: EditorView) {
        this.view = view;
        this.dom = createElement('div', CSS_CLASSES.WIDGET_EDIT_BUBBLE);
        this.title = createElement('div', CSS_CLASSES.WIDGET_EDIT_BUBBLE_TITLE);
        this.textarea = createElement('textarea', CSS_CLASSES.WIDGET_EDIT_BUBBLE_INPUT);
        this.actions = createElement('div', CSS_CLASSES.WIDGET_EDIT_BUBBLE_ACTIONS);
        this.cancelButton = createElement('button', CSS_CLASSES.WIDGET_EDIT_BUBBLE_BUTTON);
        this.applyButton = createElement(
            'button',
            `${CSS_CLASSES.WIDGET_EDIT_BUBBLE_BUTTON} ${CSS_CLASSES.WIDGET_EDIT_BUBBLE_BUTTON_PRIMARY}`
        );

        this.cancelButton.type = 'button';
        this.cancelButton.textContent = 'Cancel';
        this.applyButton.type = 'button';
        this.applyButton.textContent = 'Apply';

        this.actions.append(this.cancelButton, this.applyButton);
        this.dom.append(this.title, this.textarea, this.actions);
        this.dom.style.display = 'none';

        this.cancelButton.addEventListener('click', () => {
            this.hide(true);
        });
        this.applyButton.addEventListener('click', () => {
            this.applyChanges();
        });
        this.textarea.addEventListener('input', () => {
            this.textareaHadUserInput = true;
        });

        this.boundHandleDocumentMouseDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }
            if (this.dom.contains(target)) {
                return;
            }
            if (this.view.dom.contains(target)) {
                return;
            }
            this.hide(false);
        };
        this.boundHandleWidgetEditRequest = (event: Event) => {
            if (this.isReadOnly()) {
                this.hide(false);
                return;
            }

            const customEvent = event as CustomEvent<{ from?: number; to?: number }>;
            const from = customEvent.detail?.from;
            const to = customEvent.detail?.to;
            if (typeof from !== 'number' || typeof to !== 'number') {
                return;
            }

            const resolvedTarget = resolveWidgetEditTarget(this.view.state, from, to);
            if (!resolvedTarget) {
                this.hide(false);
                return;
            }

            this.activeTarget = resolvedTarget;
            this.anchorElement = event.target instanceof Element ? event.target : null;
            this.applyTargetMeta(resolvedTarget);
            this.show(resolvedTarget);
        };
        this.boundHandleTextareaKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                this.hide(false);
                this.view.focus();
                return;
            }

            if (
                (event.key === 'Backspace' || event.key === 'Delete') &&
                !this.textareaHadUserInput &&
                this.isEntireInputSelected()
            ) {
                event.preventDefault();
                event.stopPropagation();
                this.deleteActiveTarget();
            }
        };
        this.textarea.addEventListener('keydown', this.boundHandleTextareaKeyDown);
        document.addEventListener('mousedown', this.boundHandleDocumentMouseDown);
        this.view.dom.addEventListener(CUSTOM_EVENTS.WIDGET_EDIT_REQUEST, this.boundHandleWidgetEditRequest as EventListener);
        document.body.appendChild(this.dom);
    }

    update(update: ViewUpdate): void {
        if (!this.activeTarget) {
            return;
        }

        const { from, to } = update.state.selection.main;
        const nextTarget = resolveWidgetEditTarget(update.state, from, to);
        if (!nextTarget) {
            this.hide(false);
            return;
        }

        if (isSameTarget(this.activeTarget, nextTarget)) {
            this.updatePosition(nextTarget, this.anchorElement);
            return;
        }

        this.activeTarget = nextTarget;
        this.applyTargetMeta(nextTarget);
        this.show(nextTarget);
    }

    destroy(): void {
        document.removeEventListener('mousedown', this.boundHandleDocumentMouseDown);
        this.view.dom.removeEventListener(CUSTOM_EVENTS.WIDGET_EDIT_REQUEST, this.boundHandleWidgetEditRequest as EventListener);
        this.textarea.removeEventListener('keydown', this.boundHandleTextareaKeyDown);
        this.destroyPopper();
        this.dom.remove();
    }

    private show(target: WidgetEditTarget): void {
        this.dom.style.display = 'flex';
        this.updatePosition(target, this.anchorElement);
        this.textarea.focus({ preventScroll: true });
        this.textarea.select();
        requestAnimationFrame(() => {
            this.textarea.focus({ preventScroll: true });
            this.textarea.select();
        });
    }

    private updatePosition(target: WidgetEditTarget, anchorElement: Element | null): void {
        this.destroyPopper();
        if (anchorElement instanceof HTMLElement && anchorElement.isConnected) {
            this.popper = createPopper(anchorElement, this.dom, {
                placement: POPPER_CONFIG.PLACEMENT,
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 10],
                        },
                    },
                ],
            });
            this.popper.update();
            return;
        }

        const virtualElement = createSelectionVirtualElement(this.view, target.from, target.to);
        if (!virtualElement) {
            this.hide(false);
            return;
        }

        this.popper = createPopper(virtualElement, this.dom, {
            placement: POPPER_CONFIG.PLACEMENT,
            modifiers: [
                {
                    name: 'offset',
                    options: {
                        offset: [0, 10],
                    },
                },
            ],
        });
        this.popper.update();
    }

    private hide(clearSelection: boolean): void {
        if (clearSelection) {
            const currentPos = this.view.state.selection.main.head;
            this.view.dispatch({
                selection: EditorSelection.cursor(currentPos),
            });
            this.view.focus();
        }

        this.activeTarget = null;
        this.anchorElement = null;
        this.dom.style.display = 'none';
        this.destroyPopper();
    }

    private destroyPopper(): void {
        if (this.popper) {
            this.popper.destroy();
            this.popper = null;
        }
    }

    private applyChanges(): void {
        if (!this.activeTarget || this.isReadOnly()) {
            return;
        }

        const rawValue = this.textarea.value;
        const nextValue = this.activeTarget.kind === 'image' ? rawValue.trim() : rawValue;
        if (nextValue.length === 0) {
            return;
        }

        const updatedMarkdown = this.activeTarget.buildUpdatedMarkdown(nextValue);
        const { from, to } = this.activeTarget;
        this.view.dispatch({
            changes: {
                from,
                to,
                insert: updatedMarkdown,
            },
            selection: EditorSelection.cursor(from + updatedMarkdown.length),
            scrollIntoView: true,
        });

        this.hide(false);
        this.view.focus();
    }

    private applyTargetMeta(target: WidgetEditTarget): void {
        this.title.textContent = target.title;
        this.textarea.value = target.value;
        this.textareaHadUserInput = false;
        this.textarea.placeholder = target.placeholder;
        this.textarea.rows = target.multiline ? 8 : 1;

        if (target.multiline) {
            this.dom.classList.add(CSS_CLASSES.WIDGET_EDIT_BUBBLE_MULTILINE);
        } else {
            this.dom.classList.remove(CSS_CLASSES.WIDGET_EDIT_BUBBLE_MULTILINE);
        }

        this.applyButton.textContent = target.applyLabel;
    }

    private deleteActiveTarget(): void {
        if (!this.activeTarget || this.isReadOnly()) {
            return;
        }

        const { from, to } = this.activeTarget;
        this.view.dispatch({
            changes: { from, to, insert: '' },
            selection: EditorSelection.cursor(from),
            scrollIntoView: true,
        });
        this.hide(false);
        this.view.focus();
    }

    private isEntireInputSelected(): boolean {
        return (
            this.textarea.selectionStart === 0 &&
            this.textarea.selectionEnd === this.textarea.value.length
        );
    }

    private isReadOnly(): boolean {
        return this.view.state.facet(EditorState.readOnly);
    }
}

export const widgetEditBubblePlugin = ViewPlugin.fromClass(WidgetEditBubble);
