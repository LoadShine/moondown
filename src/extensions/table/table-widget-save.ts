import type { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type TableEditor from './table-editor.ts';
import { selectEditableCell } from './table-editor-dom.ts';
import { tablePositions, updateTablePosition } from './table-position.ts';
import {
    collectTableRanges,
    findTableRangeByDom,
    isDocumentRangeInside,
    isTableRangeValid,
    type TableRange,
} from './table-widget-position.ts';
import type { TableCellPosition } from './types.ts';

interface TableWidgetSaveContext {
    widgetId: number;
    originalRange: TableRange;
    tableDom: HTMLElement | null;
    restoreFocus?: boolean;
}

export class TableWidgetSaveController {
    private saveInProgress = false;

    save(view: EditorView, editor: TableEditor, context: TableWidgetSaveContext): void {
        if (this.saveInProgress || view.state.facet(EditorState.readOnly)) {
            return;
        }

        this.saveInProgress = true;

        try {
            const content = editor.getMarkdownTable();
            const focusTarget = context.restoreFocus ? editor.getActiveCellPosition() : null;
            const range = this.resolveRange(view, context);
            if (!range) {
                return;
            }

            view.dispatch({
                changes: {
                    from: range.from,
                    to: range.to,
                    insert: content,
                },
                effects: updateTablePosition.of({
                    id: context.widgetId,
                    from: range.from,
                    to: range.from + content.length,
                }),
            });

            editor.markClean();

            if (focusTarget) {
                this.restoreCellFocus(view, range.from, focusTarget);
            }
        } catch (error) {
            console.error('Error saving table content:', error);
        } finally {
            this.saveInProgress = false;
        }
    }

    private restoreCellFocus(view: EditorView, tableFrom: number, target: TableCellPosition): void {
        const focus = () => {
            const table =
                view.scrollDOM.querySelector<HTMLTableElement>(`table.table-helper[data-original-from="${tableFrom}"]`) ??
                view.scrollDOM.querySelector<HTMLTableElement>('table.table-helper');

            if (!table || table.rows.length === 0) {
                return;
            }

            const rowIndex = Math.min(target.rowIndex, table.rows.length - 1);
            const cellCount = table.rows[rowIndex]?.cells.length ?? 0;
            if (cellCount === 0) {
                return;
            }

            selectEditableCell({
                table,
                rowIndex,
                cellIndex: Math.min(target.cellIndex, cellCount - 1),
                where: 'start',
                forceFocus: true,
            });
        };

        requestAnimationFrame(focus);
        window.setTimeout(focus, 0);
    }

    private resolveRange(view: EditorView, context: TableWidgetSaveContext): TableRange | null {
        const rangeFromState = this.readRangeFromState(view, context.widgetId) ?? context.originalRange;
        if (isTableRangeValid(view.state, rangeFromState)) {
            return rangeFromState;
        }

        if (!context.tableDom) {
            if (!this.documentStillContainsTables(view)) {
                return null;
            }
            console.error('Cannot resolve table position without DOM element.', { widgetId: context.widgetId });
            return null;
        }

        const fallbackRange = findTableRangeByDom(view, context.tableDom);
        if (!fallbackRange) {
            if (!this.documentStillContainsTables(view)) {
                return null;
            }
            console.error('Cannot find table position from DOM fallback.', { widgetId: context.widgetId });
            return null;
        }

        if (!isDocumentRangeInside(view.state, fallbackRange)) {
            console.error('Resolved table range is outside document bounds.', {
                widgetId: context.widgetId,
                range: fallbackRange,
                docLength: view.state.doc.length,
            });
            return null;
        }

        return fallbackRange;
    }

    private readRangeFromState(view: EditorView, widgetId: number): TableRange | null {
        const positions = view.state.field(tablePositions, false);
        if (!positions) {
            return null;
        }

        const position = positions.get(widgetId);
        if (!position) {
            return null;
        }

        return {
            from: position.from,
            to: position.to,
        };
    }

    private documentStillContainsTables(view: EditorView): boolean {
        return collectTableRanges(view.state).length > 0;
    }
}
