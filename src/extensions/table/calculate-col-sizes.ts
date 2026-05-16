/**
 * Calculates the optimal width for each column in a table based on its content.
 * It handles both single-line and multi-line cells.
 */

/**
 * Calculates the maximum width required for each column in a table AST.
 * @param ast A 2D string array representing the table structure.
 * @returns An array of numbers, where each number is the required width for that column.
 */
export default function calculateColSizes (ast: string[][]): number[] {
    const sizes: number[] = [];

    for (let col = 0; col < ast[0].length; col++) {
        let colSize = 0;
        for (let row = 0; row < ast.length; row++) {
            const cell = ast[row][col] || '';
            let cellLength = cell.length;
            if (cell.includes('\n')) {
                // For multi-line cells, the width is determined by the longest line.
                cellLength = Math.max(...cell.split('\n').map(x => x.length));
            }

            if (cellLength > colSize) {
                colSize = cellLength;
            }
        }
        sizes.push(colSize);
    }
    return sizes;
}