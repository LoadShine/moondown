import buildPipeTable from './build-pipe.ts';
import computeCSS from './compute-css.ts';
import type { ColAlignment, TableEditorOptions } from './types.ts';
import { md2html } from './markdown-to-html.ts';
import { TABLE_CSS_CLASSES, TABLE_SIZING } from './constants';
import { TableEditorActionsPopover } from './table-editor-actions-popover';
import { TableEditorEdgeButtons } from './table-editor-edge-buttons';
import { TableEditorModel } from './table-editor-model.ts';
import {
    moveToNextCell,
    moveToNextRow,
    moveToPreviousCell,
    moveToPreviousRow,
} from './table-editor-navigation.ts';
import { resolveTableEditorContainer } from './table-editor-container.ts';
import {
    rebuildEditableTableDom,
    selectEditableCell,
    type TableSelection,
} from './table-editor-dom.ts';

const BLUR_DELAY_MS = 50;

export default class TableEditor {
    private _rowIndex = 0;
    private _cellIndex = 0;
    private _eventLock = false;
    private _isClean = true;
    private _lastSeenTable: string;
    private _lastMousemoveEvent: MouseEvent | undefined;
    private _pendingBlur: number | null = null;

    private readonly _options: TableEditorOptions;
    private readonly _containerElement: HTMLElement;
    private readonly _elem: HTMLTableElement;
    private readonly _model: TableEditorModel;
    private readonly _edgeButtons: TableEditorEdgeButtons;
    private readonly _actionsPopover: TableEditorActionsPopover;
    private readonly _edgeButtonSize: number;

    constructor(ast: string[][], alignments: ColAlignment[], options: TableEditorOptions = {}) {
        this._options = options;
        this._model = new TableEditorModel(ast, alignments);
        this._lastSeenTable = this._model.getSnapshot();
        this._edgeButtonSize = TABLE_SIZING.EDGE_BUTTON_SIZE;

        this._containerElement = resolveTableEditorContainer(options);

        this._elem = document.createElement('table');
        this._elem.classList.add(TABLE_CSS_CLASSES.HELPER);

        this._edgeButtons = new TableEditorEdgeButtons(this._edgeButtonSize);
        this._actionsPopover = new TableEditorActionsPopover({
            rowAnchor: this._edgeButtons.addLeftButton,
            columnAnchor: this._edgeButtons.addTopButton,
            handlers: {
                prependRow: () => this.prependRow(),
                appendRow: () => this.appendRow(),
                pluckRow: () => this.pluckRow(),
                prependCol: () => this.prependCol(),
                appendCol: () => this.appendCol(),
                pluckCol: () => this.pluckCol(),
                changeColAlignment: (alignment) => this.changeColAlignment(alignment),
            },
            onCommit: () => {
                this._options.saveIntent?.(this);
            },
        });

        this._rebuildDOMElement();
        if (!this._options.readOnly) {
            this._bindContainerEvents();
            this._bindEdgeButtonEvents();
        }
        this._injectCSS();
    }

    private _bindContainerEvents(): void {
        this._containerElement.addEventListener('mouseover', (event) => {
            this._moveHelper(event);
            this._lastMousemoveEvent = event;
        });

        this._containerElement.addEventListener('mousedown', (event) => {
            this._clickHelper(event);
            this._lastMousemoveEvent = event;
        });

        this._containerElement.addEventListener('mouseover', (event) => {
            if (this._lastMousemoveEvent !== event) {
                this._hideAllButtons();
            }
        });
    }

    private _bindEdgeButtonEvents(): void {
        this._edgeButtons.addTopButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            this._actionsPopover.showColumnActions();
        });

        this._edgeButtons.addLeftButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            this._actionsPopover.showRowActions();
        });
    }

    _moveHelper(event: MouseEvent): void {
        if (
            this._edgeButtons.shouldDisplayForMouseEvent({
                event,
                table: this._elem,
                edgeButtonSize: this._edgeButtonSize,
            })
        ) {
            this._recalculateEdgeButtonPositions();
            return;
        }

        if (this._hasFocusedCell()) {
            this._showEdgeButtons();
            return;
        }

        this._hideAllButtons();
    }

    _clickHelper(event: MouseEvent): void {
        if (
            this._edgeButtons.shouldDisplayForMouseEvent({
                event,
                table: this._elem,
                edgeButtonSize: this._edgeButtonSize,
            })
        ) {
            this._showEdgeButtons();
            this._recalculateEdgeButtonPositions();
            return;
        }

        this._hideAllButtons();
    }

    _rebuildDOMElement(): void {
        this._eventLock = true;
        rebuildEditableTableDom({
            table: this._elem,
            model: this._model,
            readOnly: this._options.readOnly,
            onCellFocus: (cell) => this._onCellFocus(cell),
            onCellBlur: (cell) => this._onCellBlur(cell),
            onCellKeyDown: (event, cell) => this._onCellKeyDown(event, cell),
        });
        this._eventLock = false;

        this.selectCell('start');
    }

    _onCellBlur(cell: HTMLTableCellElement): void {
        if (this._eventLock || this._options.readOnly) {
            return;
        }

        if (this._pendingBlur !== null) {
            clearTimeout(this._pendingBlur);
            this._pendingBlur = null;
        }

        const col = cell.cellIndex;
        const row = (cell.parentElement as HTMLTableRowElement).rowIndex;

        const newContent = cell.textContent ?? '';
        this._model.setCell(row, col, newContent);
        cell.innerHTML = md2html(newContent);

        this._signalContentChange();

        this._pendingBlur = window.setTimeout(() => {
            this._pendingBlur = null;
            const activeElement = document.activeElement;
            const isInCurrentTable = activeElement && this._elem.contains(activeElement);

            if (!isInCurrentTable && !this._isClean) {
                this._options.onBlur?.(this);
            }
            if (!isInCurrentTable) {
                this._hideAllButtons();
            }
        }, BLUR_DELAY_MS);
    }

    _onCellFocus(cell: HTMLTableCellElement): void {
        if (this._eventLock || this._options.readOnly) {
            return;
        }

        if (this._pendingBlur !== null) {
            clearTimeout(this._pendingBlur);
            this._pendingBlur = null;
        }

        const col = cell.cellIndex;
        const row = (cell.parentElement as HTMLTableRowElement).rowIndex;

        cell.innerHTML = this._model.getCell(row, col);

        this._rowIndex = row;
        this._cellIndex = col;

        this._showEdgeButtons();
    }

    _onCellKeyDown(event: KeyboardEvent, cell: HTMLTableCellElement): void {
        if (this._options.readOnly) {
            return;
        }

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            selectEditableCell({
                table: this._elem,
                rowIndex: (cell.parentElement as HTMLTableRowElement).rowIndex,
                cellIndex: cell.cellIndex,
                where: {
                    from: 0,
                    to: cell.textContent?.length ?? 0,
                },
            });
            return;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            if (event.shiftKey) {
                this.previousCell();
            } else {
                this.nextCell();
            }
            return;
        }

        if (event.key === 'Enter' && !event.altKey && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            if (event.shiftKey) {
                this.previousRow();
            } else {
                this.nextRow();
            }
        }
    }

    _recalculateEdgeButtonPositions(): void {
        this._edgeButtons.reposition({
            table: this._elem,
            rowIndex: this._rowIndex,
            cellIndex: this._cellIndex,
            container: this._containerElement,
        });
    }

    _showEdgeButtons(): void {
        if (this._options.readOnly) {
            return;
        }
        this._edgeButtons.show();
        this._recalculateEdgeButtonPositions();
    }

    _hideAllButtons(): void {
        this._actionsPopover.destroy();
        this._edgeButtons.hide();
    }

    private _hasFocusedCell(): boolean {
        const activeElement = document.activeElement;
        return !!activeElement && this._elem.contains(activeElement);
    }

    get _edgeButtonsVisible(): boolean {
        return this._edgeButtons.visible;
    }

    get domElement(): HTMLTableElement {
        return this._elem;
    }

    _signalContentChange(): void {
        const currentTable = this._model.getSnapshot();
        if (currentTable === this._lastSeenTable && this._isClean) {
            return;
        }

        this._lastSeenTable = currentTable;
        this._isClean = false;

        this._options.onChange?.(this);
    }

    getMarkdownTable(): string {
        return buildPipeTable(this._model.getTableData(), this._model.getAlignments());
    }

    markClean(): void {
        this._isClean = true;
    }

    previousCell(): void {
        if (this._options.readOnly) {
            return;
        }
        const previous = moveToPreviousCell(
            {
                rowIndex: this._rowIndex,
                colIndex: this._cellIndex,
            },
            this._model.cols
        );

        if (!previous) {
            return;
        }

        this._rowIndex = previous.rowIndex;
        this._cellIndex = previous.colIndex;

        this.selectCell('end');
        this._options.onCellChange?.(this);
    }

    nextCell(automaticallyAddRows = true): void {
        if (this._options.readOnly) {
            return;
        }
        const next = moveToNextCell(
            {
                rowIndex: this._rowIndex,
                colIndex: this._cellIndex,
            },
            this._model.cols
        );

        if (next.rowIndex === this._model.rows) {
            if (automaticallyAddRows) {
                this.appendRow();
            } else {
                return;
            }
        }

        this._rowIndex = next.rowIndex;
        this._cellIndex = next.colIndex;

        this.selectCell('end');
        this._options.onCellChange?.(this);
    }

    previousRow(): void {
        if (this._options.readOnly) {
            return;
        }
        const previous = moveToPreviousRow({
            rowIndex: this._rowIndex,
            colIndex: this._cellIndex,
        });

        if (!previous) {
            return;
        }

        this._rowIndex = previous.rowIndex;
        this.selectCell('end');
        this._options.onCellChange?.(this);
    }

    nextRow(automaticallyAddRows = true): void {
        if (this._options.readOnly) {
            return;
        }
        const next = moveToNextRow({
            rowIndex: this._rowIndex,
            colIndex: this._cellIndex,
        });

        if (next.rowIndex === this._model.rows) {
            if (automaticallyAddRows) {
                this.appendRow();
            } else {
                return;
            }
        }

        this._rowIndex = next.rowIndex;
        this.selectCell('end');
        this._options.onCellChange?.(this);
    }

    prependCol(): void {
        if (this._options.readOnly) {
            return;
        }
        this._model.prependColumn(this._cellIndex);
        this._rebuildDOMElement();
        this._signalContentChange();
    }

    appendCol(): void {
        if (this._options.readOnly) {
            return;
        }
        this._model.appendColumn(this._cellIndex);
        this._rebuildDOMElement();

        this.nextCell();
        this._signalContentChange();
    }

    prependRow(): void {
        if (this._options.readOnly) {
            return;
        }
        this._model.prependRow(this._rowIndex);
        this._rebuildDOMElement();
        this._signalContentChange();
    }

    appendRow(): void {
        if (this._options.readOnly) {
            return;
        }
        this._model.appendRow(this._rowIndex);
        this._rebuildDOMElement();

        this.nextRow();
        this._recalculateEdgeButtonPositions();
        this._signalContentChange();
    }

    pluckRow(): void {
        if (this._options.readOnly) {
            return;
        }
        const rowToRemove = this._rowIndex;
        const firstRow = rowToRemove === 0;

        if (!this._model.removeRow(rowToRemove)) {
            return;
        }

        if (firstRow) {
            this._rowIndex += 1;
        } else {
            this._rowIndex -= 1;
        }

        this.selectCell('start');
        this._rebuildDOMElement();

        if (firstRow) {
            this._rowIndex = 0;
            this.selectCell('start');
        }

        this._signalContentChange();
        this._options.onCellChange?.(this);
    }

    pluckCol(): void {
        if (this._options.readOnly) {
            return;
        }
        const colToRemove = this._cellIndex;
        const firstCol = colToRemove === 0;

        if (!this._model.removeColumn(colToRemove)) {
            return;
        }

        if (firstCol) {
            this._cellIndex = 1;
        } else {
            this._cellIndex -= 1;
        }

        this.selectCell('start');
        this._rebuildDOMElement();

        if (firstCol) {
            this._cellIndex = 0;
            this.selectCell('start');
        }

        this._signalContentChange();
        this._options.onCellChange?.(this);
    }

    changeColAlignment(alignment: ColAlignment, col: number = this._cellIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._model.updateColumnAlignment(col, alignment);

        for (let row = 0; row < this._model.rows; row += 1) {
            this._elem.rows[row].cells[col].style.textAlign = alignment;
        }

        this._signalContentChange();
        this._options.onCellChange?.(this);
    }

    selectCell(where: TableSelection = 'end'): void {
        if (
            !selectEditableCell({
                table: this._elem,
                rowIndex: this._rowIndex,
                cellIndex: this._cellIndex,
                where,
            })
        ) {
            return;
        }

        this._recalculateEdgeButtonPositions();
    }

    _injectCSS(): void {
        if (document.getElementById('tableHelperCSS') !== null) {
            return;
        }

        const styleElement = computeCSS(this._edgeButtonSize);
        document.head.prepend(styleElement);
    }
}
