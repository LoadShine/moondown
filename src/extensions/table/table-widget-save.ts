import type { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type TableEditor from './table-editor.ts';
import { tablePositions, updateTablePosition } from './table-position.ts';
import {
    findTableRangeByDom,
    isDocumentRangeInside,
    isTableRangeValid,
    type TableRange,
} from './table-widget-position.ts';

interface TableWidgetSaveContext {
    widgetId: number;
    originalRange: TableRange;
    tableDom: HTMLElement | null;
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
        } catch (error) {
            console.error('Error saving table content:', error);
        } finally {
            this.saveInProgress = false;
        }
    }

    private resolveRange(view: EditorView, context: TableWidgetSaveContext): TableRange | null {
        const rangeFromState = this.readRangeFromState(view, context.widgetId) ?? context.originalRange;
        if (isTableRangeValid(view.state, rangeFromState)) {
            return rangeFromState;
        }

        if (!context.tableDom) {
            console.error('Cannot resolve table position without DOM element.', { widgetId: context.widgetId });
            return null;
        }

        const fallbackRange = findTableRangeByDom(view, context.tableDom);
        if (!fallbackRange) {
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
}
