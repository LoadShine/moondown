import type { ColAlignment } from './types.ts';

function assertAlignment(alignment: ColAlignment): void {
    if (!['left', 'center', 'right'].includes(alignment)) {
        throw new Error(`Wrong column alignment provided! ${alignment}`);
    }
}

export class TableEditorModel {
    private readonly ast: string[][];
    private readonly colAlignments: ColAlignment[];

    constructor(ast: string[][], alignments: ColAlignment[]) {
        this.ast = ast;
        this.colAlignments = alignments;
    }

    get rows(): number {
        return this.ast.length;
    }

    get cols(): number {
        return this.ast[0]?.length ?? 0;
    }

    getSnapshot(): string {
        return JSON.stringify(this.ast);
    }

    getTableData(): string[][] {
        return this.ast;
    }

    getAlignments(): ColAlignment[] {
        return this.colAlignments;
    }

    getRow(rowIndex: number): string[] {
        return this.ast[rowIndex];
    }

    getCell(rowIndex: number, colIndex: number): string {
        return this.ast[rowIndex][colIndex];
    }

    setCell(rowIndex: number, colIndex: number, value: string): void {
        this.ast[rowIndex][colIndex] = value;
    }

    getColumnAlignment(colIndex: number): ColAlignment {
        return this.colAlignments[colIndex];
    }

    prependColumn(colIndex: number): void {
        for (const row of this.ast) {
            row.splice(colIndex, 0, '');
        }
        this.colAlignments.splice(colIndex, 0, 'left');
    }

    appendColumn(colIndex: number): void {
        this.prependColumn(colIndex + 1);
    }

    prependRow(rowIndex: number): void {
        this.ast.splice(rowIndex, 0, this.createEmptyRow());
    }

    appendRow(rowIndex: number): void {
        this.ast.splice(rowIndex + 1, 0, this.createEmptyRow());
    }

    removeRow(rowIndex: number): boolean {
        if (this.rows === 1) {
            return false;
        }
        this.ast.splice(rowIndex, 1);
        return true;
    }

    removeColumn(colIndex: number): boolean {
        if (this.cols === 1) {
            return false;
        }

        for (const row of this.ast) {
            row.splice(colIndex, 1);
        }

        this.colAlignments.splice(colIndex, 1);
        return true;
    }

    updateColumnAlignment(colIndex: number, alignment: ColAlignment): void {
        assertAlignment(alignment);

        if (colIndex >= this.cols || colIndex < 0) {
            throw new Error(`Could not align column - Index out of bounds: ${colIndex}`);
        }

        this.colAlignments[colIndex] = alignment;
    }

    private createEmptyRow(): string[] {
        return new Array(this.cols).fill('');
    }
}
