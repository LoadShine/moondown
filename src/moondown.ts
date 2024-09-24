import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {defaultExtensions} from "./extensions/default-extensions.ts";

class Moondown {
    private view: EditorView;

    constructor(element: HTMLElement, initialDoc: string = '') {
        const state = EditorState.create({
            doc: initialDoc,
            extensions: [...defaultExtensions]
        });

        this.view = new EditorView({
            state,
            parent: element,
        });
    }

    getValue(): string {
        return this.view.state.doc.toString();
    }

    setValue(value: string): void {
        this.view.dispatch({
            changes: {from: 0, to: this.view.state.doc.length, insert: value},
        });
    }

    destroy(): void {
        this.view.destroy();
    }
}

export default Moondown;