import type { Extension } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';

export interface EditorLifecycleCallbacks {
    onChange?: (update: ViewUpdate) => void;
    onFocus?: () => void;
    onBlur?: () => void;
}

export function createEditorLifecycleListener(callbacks: EditorLifecycleCallbacks): Extension {
    return EditorView.updateListener.of((update: ViewUpdate) => {
        callbacks.onChange?.(update);

        if (!update.focusChanged) {
            return;
        }

        if (update.view.hasFocus) {
            callbacks.onFocus?.();
            return;
        }

        callbacks.onBlur?.();
    });
}
