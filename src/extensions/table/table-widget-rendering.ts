import type { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import {
    EditorState,
    StateField,
    type Transaction,
    type Range as StateRange,
} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    type WidgetType,
} from '@codemirror/view';

type WidgetBuilder = (state: EditorState, node: SyntaxNodeRef) => WidgetType | undefined;
type NodePredicate = (node: SyntaxNodeRef) => boolean;

interface RenderRange {
    from: number;
    to: number;
}

function renderWidgets(
    state: EditorState,
    ranges: ReadonlyArray<RenderRange>,
    shouldHandleNode: NodePredicate,
    createWidget: WidgetBuilder
): DecorationSet {
    const widgets: StateRange<Decoration>[] = [];
    const seenNodes = new Set<string>();
    const renderRanges = ranges.length > 0 ? ranges : [{ from: 0, to: state.doc.length }];

    for (const { from, to } of renderRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter: (node) => {
                if (!shouldHandleNode(node)) {
                    return;
                }

                const nodeKey = `${node.from}:${node.to}`;
                if (seenNodes.has(nodeKey)) {
                    return;
                }
                seenNodes.add(nodeKey);

                const widget = createWidget(state, node);
                if (!widget) {
                    return;
                }

                const replacement = Decoration.replace({
                    widget,
                    inclusive: false,
                });
                widgets.push(replacement.range(node.from, node.to));
            },
        });
    }

    return Decoration.set(widgets, true);
}

function expandToLineRanges(state: EditorState, ranges: ReadonlyArray<RenderRange>): RenderRange[] {
    const expanded: RenderRange[] = [];
    for (const range of ranges) {
        const from = Math.max(0, Math.min(range.from, state.doc.length));
        const to = Math.max(from, Math.min(range.to, state.doc.length));
        const fromLine = state.doc.lineAt(from);
        const toLine = state.doc.lineAt(to);
        expanded.push({ from: fromLine.from, to: toLine.to });
    }
    return expanded;
}

function rangesContainHandledNode(
    state: EditorState,
    ranges: ReadonlyArray<RenderRange>,
    shouldHandleNode: NodePredicate
): boolean {
    for (const range of ranges) {
        let found = false;
        syntaxTree(state).iterate({
            from: range.from,
            to: range.to,
            enter: (node) => {
                if (shouldHandleNode(node)) {
                    found = true;
                    return false;
                }
                return undefined;
            },
        });
        if (found) {
            return true;
        }
    }
    return false;
}

function transactionTouchesHandledNode(
    transaction: Transaction,
    shouldHandleNode: NodePredicate
): boolean {
    const oldRanges: RenderRange[] = [];
    const newRanges: RenderRange[] = [];

    transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        oldRanges.push({ from: fromA, to: toA });
        newRanges.push({ from: fromB, to: toB });
    });

    return (
        rangesContainHandledNode(transaction.startState, expandToLineRanges(transaction.startState, oldRanges), shouldHandleNode) ||
        rangesContainHandledNode(transaction.state, expandToLineRanges(transaction.state, newRanges), shouldHandleNode)
    );
}

export function renderBlockWidgets(
    shouldHandleNode: NodePredicate,
    createWidget: WidgetBuilder
): StateField<DecorationSet> {
    return StateField.define<DecorationSet>({
        create: (state) => renderWidgets(state, [], shouldHandleNode, createWidget),
        update: (decorations, transaction) => {
            const readOnlyChanged =
                transaction.startState.facet(EditorState.readOnly) !== transaction.state.facet(EditorState.readOnly);
            const mappedDecorations = decorations.map(transaction.changes);

            if (!transaction.docChanged && !readOnlyChanged) {
                return mappedDecorations;
            }

            if (transaction.docChanged && !readOnlyChanged && !transactionTouchesHandledNode(transaction, shouldHandleNode)) {
                return mappedDecorations;
            }

            return renderWidgets(transaction.state, [], shouldHandleNode, createWidget);
        },
        provide: (field) => EditorView.decorations.from(field),
    });
}
