import type { ChangeSpec, EditorState } from '@codemirror/state';
import { CSS_CLASSES } from '../../core/constants';
import { createElement } from '../../core/utils/dom-utils';

interface CreateImageWidgetElementsOptions {
    alt: string;
    src: string;
    errorSrc: string | null;
    isError: boolean;
}

interface ImageWidgetElements {
    wrapper: HTMLElement;
    img: HTMLImageElement;
    altText: HTMLElement;
}

export function createImageWidgetElements(options: CreateImageWidgetElementsOptions): ImageWidgetElements {
    const { alt, src, errorSrc, isError } = options;
    const className = isError
        ? `${CSS_CLASSES.IMAGE_WIDGET} ${CSS_CLASSES.IMAGE_ERROR}`
        : CSS_CLASSES.IMAGE_WIDGET;
    const wrapper = createElement('div', className);
    const imageWrapper = createElement('div', 'cm-image-wrapper');
    const img = document.createElement('img');
    const overlay = createElement('div', 'cm-image-overlay');
    const altText = createElement('div', 'cm-image-alt');

    img.src = errorSrc || src;
    img.alt = alt;
    img.style.transform = 'scale(0.9)';
    altText.textContent = alt;

    imageWrapper.appendChild(img);
    imageWrapper.appendChild(overlay);
    wrapper.appendChild(imageWrapper);
    wrapper.appendChild(altText);

    return { wrapper, img, altText };
}

export function applyDraggingVisual(img: HTMLImageElement, deltaX: number, deltaY: number): void {
    img.style.transform = `scale(0.8) translate(${deltaX}px, ${deltaY}px)`;
    img.style.opacity = '0.7';
}

export function resetDraggingVisual(img: HTMLImageElement): void {
    img.style.transform = '';
    img.style.opacity = '1';
}

interface BuildImageMoveChangesOptions {
    doc: EditorState['doc'];
    pos: number;
    from: number;
    to: number;
    alt: string;
    src: string;
}

export function buildImageMoveChanges(options: BuildImageMoveChangesOptions): ChangeSpec[] {
    const { doc, pos, from, to, alt, src } = options;
    const line = doc.lineAt(pos);
    let insertFrom = line.to;
    let insert = `\n![${alt}](${src})`;

    if (line.length === 0) {
        insertFrom = line.from;
        insert = insert.slice(1);
    }

    return [
        { from, to, insert: '' },
        { from: insertFrom, insert },
    ];
}
