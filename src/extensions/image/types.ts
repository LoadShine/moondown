import {StateEffect} from "@codemirror/state";
import {ImageWidget} from "./image-widgets.ts";

/**
 * Type definitions for the image handling extension.
 */

/** Defines the payload for the effect dispatched when an image has loaded. */
export interface ImageLoadedEffect {
    from: number;
    to: number;
    lines: number;
}

/** Defines the payload for the effect to update the drag-and-drop placeholder. */
export interface ImagePlaceholderEffect {
    pos: number;
}

/** A map from an image's start position to its height in editor lines. */
export interface ImageSizes {
    [key: number]: number;
}

/** StateEffect to signal that an image has loaded and its size is known. */
export const imageLoadedEffect = StateEffect.define<ImageLoadedEffect>()
/** StateEffect to show, move, or hide the drag-and-drop placeholder. */
export const updateImagePlaceholder = StateEffect.define<ImagePlaceholderEffect | null>()

/** A global cache for ImageWidget instances to improve performance by avoiding re-creation. */
export const imageWidgetCache = new Map<string, ImageWidget>()