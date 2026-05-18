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
const FLOATING_CONTROL_SYNC_DELAY_MS = 30;

interface RebuildOptions {
    select?: TableSelection;
    forceFocus?: boolean;
}

interface SelectCellOptions {
    forceFocus?: boolean;
}

export default class TableEditor {
    private _rowIndex = 0;
    private _cellIndex = 0;
    private _eventLock = false;
    private _isClean = true;
    private _lastSeenTable: string;
    private _lastMousemoveEvent: MouseEvent | undefined;
    private _pendingBlur: number | null = null;
    private _floatingControlSyncTimer: number | null = null;
    private _resizeObserver: ResizeObserver | null = null;
    private readonly _lifecycle = new AbortController();

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
                prependRow: (rowIndex) => this.prependRow(rowIndex),
                appendRow: (rowIndex) => this.appendRow(rowIndex),
                pluckRow: (rowIndex) => this.pluckRow(rowIndex),
                prependCol: (colIndex) => this.prependCol(colIndex),
                appendCol: (colIndex) => this.appendCol(colIndex),
                pluckCol: (colIndex) => this.pluckCol(colIndex),
                changeColAlignment: (alignment, colIndex) => this.changeColAlignment(alignment, colIndex),
            },
            onCommit: () => {
                this._options.saveIntent?.(this);
            },
        });

        this._rebuildDOMElement();
        if (!this._options.readOnly) {
            this._bindContainerEvents();
            this._bindEdgeButtonEvents();
            this._bindGeometryEvents();
        }
        this._injectCSS();
    }

    private _bindContainerEvents(): void {
        this._containerElement.addEventListener('mouseover', (event) => {
            this._moveHelper(event);
            this._lastMousemoveEvent = event;
        }, { signal: this._lifecycle.signal });

        this._containerElement.addEventListener('mousedown', (event) => {
            this._captureCellFromPointerEvent(event);
            this._clickHelper(event);
            this._lastMousemoveEvent = event;
        }, { signal: this._lifecycle.signal });

        this._containerElement.addEventListener('mouseover', (event) => {
            if (this._lastMousemoveEvent !== event) {
                this._hideAllButtons();
            }
        }, { signal: this._lifecycle.signal });
    }

    private _bindEdgeButtonEvents(): void {
        this._edgeButtons.addTopButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            this._actionsPopover.showColumnActions(this._cellIndex);
        }, { signal: this._lifecycle.signal });

        this._edgeButtons.addLeftButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            this._actionsPopover.showRowActions(this._rowIndex);
        }, { signal: this._lifecycle.signal });
    }

    private _bindGeometryEvents(): void {
        const sync = () => this._scheduleFloatingControlSync();

        window.addEventListener('resize', sync, { signal: this._lifecycle.signal });
        window.visualViewport?.addEventListener('resize', sync, { signal: this._lifecycle.signal });
        window.visualViewport?.addEventListener('scroll', sync, { signal: this._lifecycle.signal });
        this._containerElement.addEventListener('scroll', sync, { passive: true, signal: this._lifecycle.signal });

        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(sync);
            this._resizeObserver.observe(this._containerElement);
            this._resizeObserver.observe(this._elem);
        }
    }

    private _scheduleFloatingControlSync(): void {
        if (this._floatingControlSyncTimer !== null) {
            window.clearTimeout(this._floatingControlSyncTimer);
        }

        this._floatingControlSyncTimer = window.setTimeout(() => {
            this._floatingControlSyncTimer = null;
            this._syncFloatingControls();
        }, FLOATING_CONTROL_SYNC_DELAY_MS);
        requestAnimationFrame(() => this._syncFloatingControls());
    }

    private _syncFloatingControls(): void {
        if (this._options.readOnly || (!this._edgeButtons.visible && !this._hasFocusedCell())) {
            return;
        }

        this._showEdgeButtons();
        this._actionsPopover.updatePosition();
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

    private _captureCellFromPointerEvent(event: MouseEvent): void {
        const target = event.target instanceof Element ? event.target : null;
        const cell = target?.closest<HTMLTableCellElement>('td');
        if (!cell || !this._elem.contains(cell)) {
            return;
        }

        this._rowIndex = (cell.parentElement as HTMLTableRowElement).rowIndex;
        this._cellIndex = cell.cellIndex;
    }

    _rebuildDOMElement(options: RebuildOptions = {}): void {
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

        if (options.select) {
            this.selectCell(options.select, { forceFocus: options.forceFocus });
        }
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

    prependCol(colIndex: number = this._cellIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._cellIndex = colIndex;
        this._model.prependColumn(this._cellIndex);
        this._rebuildDOMElement({ select: 'start', forceFocus: true });
        this._signalContentChange();
    }

    appendCol(colIndex: number = this._cellIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._cellIndex = colIndex;
        this._model.appendColumn(this._cellIndex);
        this._cellIndex += 1;
        this._rebuildDOMElement({ select: 'start', forceFocus: true });
        this._signalContentChange();
    }

    prependRow(rowIndex: number = this._rowIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._rowIndex = rowIndex;
        this._model.prependRow(this._rowIndex);
        this._rebuildDOMElement({ select: 'start', forceFocus: true });
        this._signalContentChange();
    }

    appendRow(rowIndex: number = this._rowIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._rowIndex = rowIndex;
        this._model.appendRow(this._rowIndex);
        this._rowIndex += 1;
        this._rebuildDOMElement({ select: 'start', forceFocus: true });
        this._recalculateEdgeButtonPositions();
        this._signalContentChange();
    }

    pluckRow(rowIndex: number = this._rowIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._rowIndex = rowIndex;
        const rowToRemove = this._rowIndex;
        const firstRow = rowToRemove === 0;

        if (!this._model.removeRow(rowToRemove)) {
            return;
        }

        this._rowIndex = firstRow ? 0 : Math.max(0, this._rowIndex - 1);
        this._rebuildDOMElement({ select: 'start', forceFocus: true });

        this._signalContentChange();
        this._options.onCellChange?.(this);
    }

    pluckCol(colIndex: number = this._cellIndex): void {
        if (this._options.readOnly) {
            return;
        }
        this._cellIndex = colIndex;
        const colToRemove = this._cellIndex;
        const firstCol = colToRemove === 0;

        if (!this._model.removeColumn(colToRemove)) {
            return;
        }

        this._cellIndex = firstCol ? 0 : Math.max(0, this._cellIndex - 1);
        this._rebuildDOMElement({ select: 'start', forceFocus: true });

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

    selectCell(where: TableSelection = 'end', options: SelectCellOptions = {}): void {
        if (
            !selectEditableCell({
                table: this._elem,
                rowIndex: this._rowIndex,
                cellIndex: this._cellIndex,
                where,
                forceFocus: options.forceFocus,
            })
        ) {
            return;
        }

        this._recalculateEdgeButtonPositions();
    }

    destroy(): void {
        this._lifecycle.abort();
        if (this._pendingBlur !== null) {
            window.clearTimeout(this._pendingBlur);
            this._pendingBlur = null;
        }
        if (this._floatingControlSyncTimer !== null) {
            window.clearTimeout(this._floatingControlSyncTimer);
            this._floatingControlSyncTimer = null;
        }
        this._resizeObserver?.disconnect();
        this._actionsPopover.destroy();
        this._edgeButtons.hide();
    }

    _injectCSS(): void {
        if (document.getElementById('tableHelperCSS') !== null) {
            return;
        }

        const styleElement = computeCSS(this._edgeButtonSize);
        document.head.prepend(styleElement);
    }
}
