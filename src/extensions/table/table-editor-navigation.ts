export interface TableCursor {
    rowIndex: number;
    colIndex: number;
}

export function moveToPreviousCell(cursor: TableCursor, colCount: number): TableCursor | null {
    if (cursor.colIndex === 0 && cursor.rowIndex === 0) {
        return null;
    }

    const previousCol = cursor.colIndex - 1;
    if (previousCol >= 0) {
        return {
            rowIndex: cursor.rowIndex,
            colIndex: previousCol,
        };
    }

    return {
        rowIndex: cursor.rowIndex - 1,
        colIndex: colCount - 1,
    };
}

export function moveToNextCell(cursor: TableCursor, colCount: number): TableCursor {
    const nextCol = cursor.colIndex + 1;
    if (nextCol < colCount) {
        return {
            rowIndex: cursor.rowIndex,
            colIndex: nextCol,
        };
    }

    return {
        rowIndex: cursor.rowIndex + 1,
        colIndex: 0,
    };
}

export function moveToPreviousRow(cursor: TableCursor): TableCursor | null {
    if (cursor.rowIndex === 0) {
        return null;
    }
    return {
        rowIndex: cursor.rowIndex - 1,
        colIndex: cursor.colIndex,
    };
}

export function moveToNextRow(cursor: TableCursor): TableCursor {
    return {
        rowIndex: cursor.rowIndex + 1,
        colIndex: cursor.colIndex,
    };
}
