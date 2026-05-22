import { EditorState as CodeMirrorState } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { EditorView, WidgetType } from '@codemirror/view';
import TableEditor from './table-editor.ts';
import { renderBlockWidgets } from './table-widget-rendering.ts';
import { TableWidgetSaveController } from './table-widget-save.ts';
import { createTableEditorFromMarkdown } from './table-widget-editor-factory.ts';

class TableWidget extends WidgetType {
    private static nextId = 0;

    private readonly widgetId: number;
    private domElement: HTMLElement | null = null;
    private editor: TableEditor | null = null;
    private readonly saveController = new TableWidgetSaveController();

    constructor(
        readonly table: string,
        readonly readOnly: boolean,
        readonly originalFrom: number,
        readonly originalTo: number
    ) {
        super();
        this.widgetId = TableWidget.nextId++;
    }

    eq(other: TableWidget): boolean {
        return this.table === other.table && this.readOnly === other.readOnly;
    }

    toDOM(view: EditorView): HTMLElement {
        try {
            const editor = createTableEditorFromMarkdown(this.table, {
                readOnly: this.readOnly,
                onBlur: (instance) => {
                    this.saveContent(view, instance, false);
                },
                saveIntent: (instance) => {
                    this.saveContent(view, instance, true);
                },
                container: view.scrollDOM,
            });

            this.editor = editor;
            this.domElement = editor.domElement;
            this.domElement.dataset.widgetId = String(this.widgetId);
            this.domElement.dataset.originalFrom = String(this.originalFrom);
            this.domElement.dataset.originalTo = String(this.originalTo);

            return this.domElement;
        } catch (error) {
            console.error('Error in TableWidget.toDOM:', error);
            return document.createElement('div');
        }
    }

    ignoreEvent(event: Event): boolean {
        if (event.type === 'keydown') {
            const key = (event as KeyboardEvent).key;
            if (key === 'Backspace' || key === 'Delete') {
                const nativeSel = window.getSelection();
                if (nativeSel && !nativeSel.isCollapsed && nativeSel.rangeCount > 0) {
                    const range = nativeSel.getRangeAt(0);
                    if (this.domElement && (!this.domElement.contains(range.startContainer) || !this.domElement.contains(range.endContainer))) {
                        return false; // Let CM handle cross-boundary delete
                    }
                }
            }
        }
        return true;
    }

    destroy(): void {
        this.editor?.destroy();
        this.editor = null;
        this.domElement = null;
    }

    private saveContent(view: EditorView, editor: TableEditor, restoreFocus: boolean): void {
        this.saveController.save(view, editor, {
            widgetId: this.widgetId,
            originalRange: {
                from: this.originalFrom,
                to: this.originalTo,
            },
            tableDom: this.domElement,
            restoreFocus,
        });
    }
}

function shouldHandleNode(node: SyntaxNodeRef): boolean {
    return node.name === 'Table';
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

function createWidget(state: CodeMirrorState, node: SyntaxNodeRef): TableWidget | undefined {
    const table = state.sliceDoc(node.from, node.to);
    try {
        return new TableWidget(table, state.facet(CodeMirrorState.readOnly), node.from, node.to);
    } catch (error: unknown) {
        console.error(`Could not instantiate TableEditor widget: ${getErrorMessage(error)}`);
        return undefined;
    }
}

export const renderTables = renderBlockWidgets(shouldHandleNode, createWidget);
