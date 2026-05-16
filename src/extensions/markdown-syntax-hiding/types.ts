import type { EditorState, SelectionRange } from '@codemirror/state';
import type { Decoration } from '@codemirror/view';

export interface DecorationItem {
    from: number;
    to: number;
    decoration: Decoration;
}

export interface HandlerContext {
    state: EditorState;
    selection: SelectionRange;
    isHidingEnabled: boolean;
    isSelected: boolean;
    start: number;
    end: number;
}
