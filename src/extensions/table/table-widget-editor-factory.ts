import type { SyntaxNode } from '@lezer/common';
import TableEditor from './table-editor.ts';
import { parseMarkdownTable, parseNode } from './table-functions.ts';
import type { TableEditorOptions } from './types.ts';

export function createTableEditorFromSyntaxNode(
    tableNode: SyntaxNode,
    markdown: string,
    options: TableEditorOptions = {}
): TableEditor {
    const parsed = parseNode(tableNode, markdown);
    if (!parsed) {
        throw new Error('Could not parse table node');
    }

    return new TableEditor(parsed.ast, parsed.colAlignments, options);
}

export function createTableEditorFromMarkdown(
    tableMarkdown: string,
    options: TableEditorOptions = {}
): TableEditor {
    const parsed = parseMarkdownTable(tableMarkdown);
    if (!parsed) {
        throw new Error('Could not parse table markdown');
    }

    return new TableEditor(parsed.ast, parsed.colAlignments, options);
}
