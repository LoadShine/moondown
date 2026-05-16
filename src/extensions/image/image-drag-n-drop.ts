import {EditorState} from '@codemirror/state';
import {EditorView, ViewPlugin, type PluginValue, ViewUpdate} from '@codemirror/view';

/**
 * A ViewPlugin that handles pasting and dragging-and-dropping images into the editor.
 * It reads the image file, converts it to a Base64 data URL, and inserts it as markdown.
 */
class ImagePastePlugin implements PluginValue {
    private view: EditorView;

    constructor(view: EditorView) {
        this.view = view;
        this.setupListeners();
    }

    private setupListeners() {
        this.view.dom.addEventListener('dragover', this.handleDragOver);
        this.view.dom.addEventListener('drop', this.handleDrop);
        this.view.dom.addEventListener('paste', this.handlePaste);
    }

    update(_update: ViewUpdate) {
        // No action needed on editor updates for this plugin.
    }

    destroy() {
        this.view.dom.removeEventListener('dragover', this.handleDragOver);
        this.view.dom.removeEventListener('drop', this.handleDrop);
        this.view.dom.removeEventListener('paste', this.handlePaste);
    }

    private handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
        }
    };

    private handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (this.isReadOnly()) {
            return;
        }
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (this.isImageFile(file)) {
                    let pos = this.view.posAtCoords({x: e.clientX, y: e.clientY});
                    if (pos === null) {
                        pos = this.view.state.selection.main.head;
                    }
                    this.processImage(file, pos);
                }
            }
        }
    };

    private handlePaste = (e: ClipboardEvent) => {
        if (this.isReadOnly()) {
            return;
        }
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        this.processImage(file, this.view.state.selection.main.head);
                    }
                }
            }
        }
    };

    private isImageFile(file: File): boolean {
        return file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name);
    }

    private isReadOnly(): boolean {
        return this.view.state.facet(EditorState.readOnly);
    }

    /**
     * Reads an image file, converts it to Base64, and inserts it into the editor at the given position.
     * @param file The image file to process.
     * @param pos The position in the document to insert the image markdown.
     */
    private processImage(file: File, pos: number | null) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target?.result as string;
            if (pos !== null) {
                const markdownImage = `![${this.getFileNameWithoutExtension(file.name)}](${base64Data})`;
                const transaction = this.view.state.update({
                    changes: {from: pos, to: pos, insert: markdownImage},
                    selection: {anchor: pos + markdownImage.length},
                });
                this.view.dispatch(transaction);
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Extracts the file name from a full file path, without the extension.
     * @param fileName The full name of the file (e.g., "my-image.png").
     * @returns The file name without the extension (e.g., "my-image").
     */
    private getFileNameWithoutExtension(fileName: string): string {
        return fileName.replace(/\.[^/.]+$/, "");
    }
}

export const imageDragAndDropPlugin = ViewPlugin.fromClass(ImagePastePlugin);
