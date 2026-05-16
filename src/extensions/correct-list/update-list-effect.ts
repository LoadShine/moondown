import { StateEffect } from "@codemirror/state";

/**
 * A CodeMirror StateEffect used to explicitly trigger an update of list numbering.
 * This is useful after operations like indentation where the change needs to be
 * processed before the list can be correctly re-numbered.
 */
export const updateListEffect = StateEffect.define<{ from: number; to: number }>({});