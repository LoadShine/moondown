import { md2html } from './markdown-to-html';
import { selectElementContents } from './select-in-element';
import type { TableEditorModel } from './table-editor-model';

export type TableSelection = 'start' | 'end' | { from: number; to: number };

interface RebuildEditableTableDomOptions {
    table: HTMLTableElement;
    model: TableEditorModel;
    readOnly?: boolean;
    onCellFocus: (cell: HTMLTableCellElement) => void;
    onCellBlur: (cell: HTMLTableCellElement) => void;
    onCellKeyDown?: (event: KeyboardEvent, cell: HTMLTableCellElement) => void;
}

export function rebuildEditableTableDom(options: RebuildEditableTableDomOptions): void {
    const { table, model, readOnly = false, onCellFocus, onCellBlur, onCellKeyDown } = options;
    table.innerHTML = '';
    const tbody = table.createTBody();

    for (let rowIndex = 0; rowIndex < model.rows; rowIndex += 1) {
        const row = tbody.insertRow(-1);
        row.style.width = '100%';

        const rowData = model.getRow(rowIndex);
        for (let colIndex = 0; colIndex < rowData.length; colIndex += 1) {
            const cell = row.insertCell(-1);
            cell.innerHTML = md2html(rowData[colIndex]);
            cell.style.textAlign = model.getColumnAlignment(colIndex);
            cell.setAttribute('contenteditable', readOnly ? 'false' : 'true');
            if (readOnly) {
                cell.setAttribute('aria-readonly', 'true');
            }

            cell.addEventListener('focus', () => {
                onCellFocus(cell);
            });

            cell.addEventListener('blur', () => {
                onCellBlur(cell);
            });

            cell.addEventListener('keydown', (event) => {
                onCellKeyDown?.(event, cell);
            });
        }
    }
}

interface SelectEditableCellOptions {
    table: HTMLTableElement;
    rowIndex: number;
    cellIndex: number;
    where: TableSelection;
    forceFocus?: boolean;
}

export function selectEditableCell(options: SelectEditableCellOptions): boolean {
    const { table, rowIndex, cellIndex, where, forceFocus = false } = options;

    if (!forceFocus && !table.contains(document.activeElement)) {
        return false;
    }

    const currentRow = table.rows[rowIndex];
    const currentCell = currentRow?.cells[cellIndex];
    if (!currentCell) {
        return false;
    }

    currentCell.focus();
    const textLength = currentCell.textContent?.length ?? 0;

    if (where === 'start') {
        selectElementContents(currentCell);
    } else if (where === 'end') {
        selectElementContents(currentCell, textLength, textLength);
    } else {
        selectElementContents(currentCell, where.from, where.to);
    }

    setTimeout(() => currentCell.focus(), 10);
    return true;
}
