import { EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection, EditorState, type EditorState as CodeMirrorEditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import errorImageGeneric from "./error-image-generic.png";
import { imageLoadedEffect, updateImagePlaceholder } from "./types";
import { CSS_CLASSES, CUSTOM_EVENTS } from "../../core/constants";
import { parseMarkdownImage } from "../../core/utils/string-utils";
import {
    applyDraggingVisual,
    buildImageMoveChanges,
    createImageWidgetElements,
    resetDraggingVisual,
} from './image-widget-helpers';

interface ImageSourceRange {
    from: number;
    to: number;
}

interface ParsedImage {
    alt: string;
    src: string;
}

function parseImageNode(state: CodeMirrorEditorState, from: number, to: number): ParsedImage | null {
    if (from < 0 || to > state.doc.length || from >= to) {
        return null;
    }

    return parseMarkdownImage(state.sliceDoc(from, to));
}

function findImageRangeAt(state: CodeMirrorEditorState, from: number, to: number): ImageSourceRange | null {
    if (from < 0 || to > state.doc.length || from >= to) {
        return null;
    }

    let matchedRange: ImageSourceRange | null = null;
    syntaxTree(state).iterate({
        from: Math.max(0, from - 1),
        to: Math.min(state.doc.length, to + 1),
        enter: (node) => {
            if (node.type.name !== 'Image' || node.from !== from || node.to !== to) {
                return;
            }

            if (parseImageNode(state, node.from, node.to)) {
                matchedRange = {
                    from: node.from,
                    to: node.to,
                };
            }
        },
    });

    return matchedRange;
}

function resolveImageSourceRange(
    state: CodeMirrorEditorState,
    fallbackFrom: number,
    fallbackTo: number,
    alt: string,
    src: string
): ImageSourceRange {
    const directMatch = findImageRangeAt(state, fallbackFrom, fallbackTo);
    if (directMatch) {
        return directMatch;
    }

    const nearestRangeRef: {
        current: (ImageSourceRange & { distance: number; matchesSignature: boolean }) | null;
    } = { current: null };
    syntaxTree(state).iterate({
        from: 0,
        to: state.doc.length,
        enter: (node) => {
            if (node.type.name !== 'Image') {
                return;
            }

            const parsed = parseImageNode(state, node.from, node.to);
            if (!parsed) {
                return;
            }

            const distance = Math.abs(node.from - fallbackFrom);
            const matchesSignature = parsed.alt === alt && parsed.src === src;
            if (
                !nearestRangeRef.current ||
                (matchesSignature && !nearestRangeRef.current.matchesSignature) ||
                (matchesSignature === nearestRangeRef.current.matchesSignature && distance < nearestRangeRef.current.distance)
            ) {
                nearestRangeRef.current = {
                    from: node.from,
                    to: node.to,
                    distance,
                    matchesSignature,
                };
            }
        },
    });

    if (nearestRangeRef.current) {
        return {
            from: nearestRangeRef.current.from,
            to: nearestRangeRef.current.to,
        };
    }

    const safeFrom = Math.max(0, Math.min(fallbackFrom, state.doc.length));
    const safeTo = Math.max(safeFrom, Math.min(fallbackTo, state.doc.length));
    return {
        from: safeFrom,
        to: safeTo,
    };
}

/**
 * A CodeMirror Widget for rendering and managing images within the editor.
 * It handles image loading, error states, and drag-and-drop functionality for repositioning.
 */
export class ImageWidget extends WidgetType {
    private loaded = false;
    private errorSrc: string | null = null;
    private isError = false;
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private isMouseDownOnImage = false;
    private currentDraggingImg: HTMLImageElement | null = null;
    private static readonly DRAG_THRESHOLD_PX = 4;

    constructor(
        public alt: string,
        public src: string,
        public from: number,
        public to: number,
        private view: EditorView
    ) {
        super();
    }

    toDOM(): HTMLElement {
        const { wrapper, img, altText } = createImageWidgetElements({
            alt: this.alt,
            src: this.src,
            errorSrc: this.errorSrc,
            isError: this.isError,
        });

        this.attachEventListeners(wrapper, img, altText);

        return wrapper;
    }

    /**
     * Attaches event listeners to the widget's elements.
     * @param wrapper The main wrapper element.
     * @param img The `<img>` element.
     * @param altText The alt text element.
     */
    private attachEventListeners(
        wrapper: HTMLElement,
        img: HTMLImageElement,
        altText: HTMLElement
    ): void {
        wrapper.addEventListener('mousedown', this.handleMouseDown);
        wrapper.addEventListener('click', this.handleClick);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        if (!this.loaded) {
            img.addEventListener('load', () => this.handleImageLoad(wrapper));
            img.addEventListener('error', () => this.handleImageError(wrapper, img, altText));
        }
    }

    /**
     * Handles the successful loading of the image. Dispatches an effect to inform
     * the editor of the image's height in lines, allowing the layout to adjust.
     * @param wrapper The main widget wrapper element.
     */
    private handleImageLoad(wrapper: HTMLElement): void {
        this.loaded = true;
        const sourceRange = resolveImageSourceRange(this.view.state, this.from, this.to, this.alt, this.src);
        this.from = sourceRange.from;
        this.to = sourceRange.to;
        const lineHeight = this.view.defaultLineHeight;
        const lines = Math.ceil(wrapper.offsetHeight / lineHeight);

        this.view.dispatch({
            effects: imageLoadedEffect.of({ from: sourceRange.from, to: sourceRange.to, lines })
        });
    }

    /**
     * Handles image loading errors by replacing the src with a fallback image
     * and applying an error style.
     * @param wrapper The main widget wrapper element.
     * @param img The `<img>` element.
     * @param altText The alt text element.
     */
    private handleImageError(
        wrapper: HTMLElement,
        img: HTMLImageElement,
        altText: HTMLElement
    ): void {
        this.isError = true;
        wrapper.classList.add(CSS_CLASSES.IMAGE_ERROR);
        this.errorSrc = errorImageGeneric;
        img.src = this.errorSrc;
        altText.textContent = this.alt;
    }

    /**
     * Handles the mouse down event on the widget.
     * It initiates a timer to distinguish between a click (for selection) and a drag.
     */
    private handleMouseDown = (event: MouseEvent): void => {
        event.preventDefault();
        if (this.isReadOnly()) {
            return;
        }
        this.isMouseDownOnImage = true;
        this.isDragging = false;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.currentDraggingImg = event.target as HTMLImageElement;
    }

    /**
     * Handles the mouse move event during a drag operation.
     */
    private handleMouseMove = (event: MouseEvent): void => {
        if (this.isReadOnly()) {
            return;
        }
        if (!this.isMouseDownOnImage) return;

        if (!this.isDragging) {
            const deltaX = Math.abs(event.clientX - this.dragStartX);
            const deltaY = Math.abs(event.clientY - this.dragStartY);
            if (Math.max(deltaX, deltaY) < ImageWidget.DRAG_THRESHOLD_PX) {
                return;
            }

            this.isDragging = true;
            document.body.style.cursor = 'move';
        }

        this.updatePlaceholder(event);
        this.updateDragVisuals(event);
    }

    private handleClick = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        if (this.isDragging) {
            return;
        }
        this.selectImage(event.target instanceof HTMLElement ? event.target : null);
    }

    /**
     * Updates the position of the drop placeholder decoration in the editor.
     * @param event The MouseEvent.
     */
    private updatePlaceholder(event: MouseEvent): void {
        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });

        if (pos !== null) {
            const line = this.view.state.doc.lineAt(pos);
            this.view.dispatch({
                effects: updateImagePlaceholder.of({ pos: line.to })
            });
        }
    }

    /**
     * Updates the visual style of the image element being dragged.
     * @param event The MouseEvent.
     */
    private updateDragVisuals(event: MouseEvent): void {
        if (!this.currentDraggingImg) return;

        const deltaX = event.clientX - this.dragStartX;
        const deltaY = event.clientY - this.dragStartY;
        applyDraggingVisual(this.currentDraggingImg, deltaX, deltaY);
    }

    /**
     * Handles the mouse up event, completing either a selection or a drag operation.
     */
    private handleMouseUp = (event: MouseEvent): void => {
        if (this.isReadOnly()) {
            this.isMouseDownOnImage = false;
            return;
        }
        if (!this.isDragging && this.isMouseDownOnImage) {
            this.selectImage(event.target instanceof HTMLElement ? event.target : null);
        } else if (this.isDragging) {
            this.completeDrag(event);
        }

        this.isMouseDownOnImage = false;
    }

    /**
     * Selects the underlying markdown text for the image.
     */
    private selectImage(anchorElement: HTMLElement | null): void {
        const sourceRange = resolveImageSourceRange(this.view.state, this.from, this.to, this.alt, this.src);
        this.from = sourceRange.from;
        this.to = sourceRange.to;

        this.view.dispatch({
            selection: EditorSelection.single(sourceRange.from, sourceRange.to),
            scrollIntoView: true
        });

        const target = anchorElement ?? this.view.dom;
        target.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.WIDGET_EDIT_REQUEST, {
            bubbles: true,
            detail: {
                from: sourceRange.from,
                to: sourceRange.to,
            },
        }));
    }

    /**
     * Finalizes the drag operation by moving the image markdown to the new position.
     * @param event The MouseEvent.
     */
    private completeDrag(event: MouseEvent): void {
        if (this.isReadOnly()) {
            this.resetDragVisuals();
            return;
        }
        this.isDragging = false;
        document.body.style.cursor = 'default';

        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
            this.moveTo(pos);
        }

        this.view.dispatch({
            effects: updateImagePlaceholder.of(null)
        });

        this.resetDragVisuals();
    }

    /**
     * Resets the visual styles of the dragged image element.
     */
    private resetDragVisuals(): void {
        if (this.currentDraggingImg) {
            resetDraggingVisual(this.currentDraggingImg);
            this.currentDraggingImg = null;
        }
    }

    /**
     * Dispatches a transaction to move the image's markdown text to a new position.
     * @param pos The target position in the document.
     */
    private moveTo(pos: number): void {
        if (this.isReadOnly()) {
            return;
        }
        const sourceRange = resolveImageSourceRange(this.view.state, this.from, this.to, this.alt, this.src);
        this.from = sourceRange.from;
        this.to = sourceRange.to;

        this.view.dispatch({
            changes: buildImageMoveChanges({
                doc: this.view.state.doc,
                pos,
                from: sourceRange.from,
                to: sourceRange.to,
                alt: this.alt,
                src: this.src,
            }),
        });
    }

    /**
     * Updates the widget's internal `from` and `to` positions.
     * This is called by the renderer when the document changes.
     */
    updatePosition(from: number, to: number): void {
        this.from = from;
        this.to = to;
    }

    private isReadOnly(): boolean {
        return this.view.state.facet(EditorState.readOnly);
    }

    ignoreEvent(): boolean {
        return false;
    }

    eq(other: ImageWidget): boolean {
        const isSameImage = other.alt === this.alt && other.src === this.src;
        // CodeMirror may preserve previous widget instance when eq is true.
        // Keep source range updated so interactions don't use stale coordinates.
        this.from = other.from;
        this.to = other.to;
        return isSameImage;
    }

    destroy(): void {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
}
