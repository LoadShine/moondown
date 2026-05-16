/**
 * Pipe table builder for converting a table AST into a formatted markdown string.
 * It handles column alignment, cell padding, and delimiter row generation.
 */
import calculateColSizes from './calculate-col-sizes.ts'
import type { ColAlignment } from './types.ts'

/**
 * Builds a markdown pipe table string from a 2D array of cell contents.
 * @param ast A 2D string array representing the table (header and rows).
 * @param colAlignment An array specifying the alignment for each column.
 * @returns A formatted markdown table string.
 */
export default function buildPipeTable (ast: string[][], colAlignment: ColAlignment[]): string {
    if (ast.length < 2) {
        throw new Error('Cannot build pipe table: Must have at least two rows.')
    }

    // calculate the column sizes
    const colSizes = calculateColSizes(ast)

    // build the table in a quick MapReduce fashion
    const rows = ast.map(row => {
        const rowContents = row.map((col, idx) => {
            if (colAlignment[idx] === 'right') {
                return col.padStart(colSizes[idx], ' ')
            } else {
                return col.padEnd(colSizes[idx], ' ')
            }
        }).join(' | ')
        return `| ${rowContents} |`
    })

    // insert the required header row at index 2
    const headerRowContents = colSizes.map((size, idx) => {
        if (colAlignment[idx] === 'left') {
            return '-'.repeat(size + 2)
        } else if (colAlignment[idx] === 'center') {
            return ':' + '-'.repeat(size) + ':'
        } else {
            return '-'.repeat(size + 1) + ':'
        }
    }).join('|')

    const headerRow = `|${headerRowContents}|`
    rows.splice(1, 0, headerRow)

    return rows.join('\n')
}