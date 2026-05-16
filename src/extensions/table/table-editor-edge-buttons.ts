import { TABLE_CSS_CLASSES, TABLE_SYMBOLS } from './constants';

interface TableBoundsOptions {
    event: MouseEvent;
    table: HTMLTableElement;
    edgeButtonSize: number;
}

interface ButtonPositionContext {
    table: HTMLTableElement;
    rowIndex: number;
    cellIndex: number;
    container: HTMLElement;
}

const OFFSCREEN_POSITION = '-1000px';
const BUTTON_OFFSET_SCALE = 0.6;
const CENTER_SCALE = 1.2;
const EDGE_BUTTON_SPACING = 5;
const VISIBLE_CLASS = 'is-visible';

function isPointInsideExpandedRect({ event, table, edgeButtonSize }: TableBoundsOptions): boolean {
    const rect = table.getBoundingClientRect();
    const minX = rect.left - edgeButtonSize;
    const minY = rect.top - edgeButtonSize;
    const maxX = minX + rect.width + edgeButtonSize * 2;
    const maxY = minY + rect.height + edgeButtonSize * 2;

    return (
        event.clientX >= minX &&
        event.clientX <= maxX &&
        event.clientY >= minY &&
        event.clientY <= maxY
    );
}

function createEdgeButton(className: string, symbol: string): HTMLDivElement {
    const button = document.createElement('div');
    button.classList.add(TABLE_CSS_CLASSES.OPERATE_BUTTON, className);
    button.innerHTML = symbol;
    return button;
}

export class TableEditorEdgeButtons {
    readonly addTopButton: HTMLDivElement;
    readonly addLeftButton: HTMLDivElement;

    constructor(private readonly edgeButtonSize: number) {
        this.addTopButton = createEdgeButton(TABLE_CSS_CLASSES.TOP_BUTTON, TABLE_SYMBOLS.HORIZONTAL_ELLIPSIS);
        this.addLeftButton = createEdgeButton(TABLE_CSS_CLASSES.LEFT_BUTTON, TABLE_SYMBOLS.VERTICAL_ELLIPSIS);
    }

    get visible(): boolean {
        return this.addTopButton.parentElement !== null && this.addLeftButton.parentElement !== null;
    }

    show(): void {
        if (this.visible) {
            this.addTopButton.classList.add(VISIBLE_CLASS);
            this.addLeftButton.classList.add(VISIBLE_CLASS);
            return;
        }
        document.body.appendChild(this.addTopButton);
        document.body.appendChild(this.addLeftButton);
        this.addTopButton.classList.add(VISIBLE_CLASS);
        this.addLeftButton.classList.add(VISIBLE_CLASS);
    }

    hide(): void {
        this.addTopButton.classList.remove(VISIBLE_CLASS);
        this.addLeftButton.classList.remove(VISIBLE_CLASS);
        this.addTopButton.parentElement?.removeChild(this.addTopButton);
        this.addLeftButton.parentElement?.removeChild(this.addLeftButton);
    }

    hideOffscreen(): void {
        this.addTopButton.classList.remove(VISIBLE_CLASS);
        this.addLeftButton.classList.remove(VISIBLE_CLASS);
        this.addTopButton.style.top = OFFSCREEN_POSITION;
        this.addLeftButton.style.top = OFFSCREEN_POSITION;
    }

    shouldDisplayForMouseEvent(options: TableBoundsOptions): boolean {
        return isPointInsideExpandedRect(options);
    }

    reposition({ table, rowIndex, cellIndex, container }: ButtonPositionContext): void {
        const currentCell = table.rows[rowIndex]?.cells[cellIndex];
        if (!currentCell) {
            this.hide();
            return;
        }

        const currentRow = table.rows[rowIndex];
        const currentColumn = Array.from(table.rows).map((row) => row.cells[cellIndex]);

        const cellRect = currentCell.getBoundingClientRect();
        const rowRect = currentRow.getBoundingClientRect();
        const columnTop = Math.min(...currentColumn.map((cell) => cell.getBoundingClientRect().top));
        const containerRect = container.getBoundingClientRect();

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        const cellIsOnScreen = cellRect.top > containerRect.top && cellRect.bottom < containerRect.bottom;

        if (!cellIsOnScreen) {
            this.hideOffscreen();
            return;
        }

        const topButtonTop = scrollTop + columnTop - this.edgeButtonSize * BUTTON_OFFSET_SCALE - EDGE_BUTTON_SPACING;
        const topButtonLeft =
            scrollLeft + cellRect.left + cellRect.width / 2 - (this.edgeButtonSize * CENTER_SCALE) / 2;
        this.addTopButton.style.top = `${topButtonTop}px`;
        this.addTopButton.style.left = `${topButtonLeft}px`;

        const leftButtonTop =
            scrollTop + rowRect.top + rowRect.height / 2 - (this.edgeButtonSize * CENTER_SCALE) / 2;
        const leftButtonLeft =
            scrollLeft + rowRect.left - this.edgeButtonSize * BUTTON_OFFSET_SCALE - EDGE_BUTTON_SPACING;
        this.addLeftButton.style.top = `${leftButtonTop}px`;
        this.addLeftButton.style.left = `${leftButtonLeft}px`;
    }
}
