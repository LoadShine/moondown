import {StateEffect, StateField} from "@codemirror/state";
import {type BubbleMenuItem} from "./types.ts";

/**
 * A StateEffect used to signal that the bubble menu should be shown.
 * It carries the position and item configuration for the menu.
 */
export const showBubbleMenu = StateEffect.define<{ pos: number, items: BubbleMenuItem[] }>()

/**
 * A StateField that holds the state for the bubble menu.
 * It tracks the menu's position and item configuration, or null if the menu should be hidden.
 */
export const bubbleMenuField = StateField.define<{ pos: number, items: BubbleMenuItem[] } | null>({
    create: () => null,
    update(value, tr) {
        // If a `showBubbleMenu` effect is present, update the state with its value.
        for (const effect of tr.effects) {
            if (effect.is(showBubbleMenu)) {
                return effect.value
            }
        }
        // If the selection changes, hide the menu by returning null.
        if (tr.selection) {
            return null
        }
        // Otherwise, keep the current state.
        return value
    }
})