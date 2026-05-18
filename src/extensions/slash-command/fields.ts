import {StateEffect, StateField} from "@codemirror/state";

export const SLASH_COMMAND_FILTER_REGEX = /^\/([^\s/]*)$/u;

/**
 * A StateEffect used to explicitly toggle the visibility of the slash command menu.
 */
export const toggleSlashCommand = StateEffect.define<boolean>()

/**
 * A StateEffect to update the index of the currently selected item in the slash command menu.
 */
export const updateSelectedIndex = StateEffect.define<number>()

/**
 * A StateField that holds the state for the slash command feature.
 * It tracks whether the menu is active, the text used for filtering commands,
 * the position where the command was triggered, and the currently selected item index.
 */
export const slashCommandState = StateField.define<{
    active: boolean,
    filterText: string,
    pos: number,
    selectedIndex: number
}>({
    create: () => ({active: false, filterText: "", pos: 0, selectedIndex: 0}),
    update(value, tr) {
        // Handle explicit state changes via effects (e.g., closing the menu).
        for (let e of tr.effects) {
            if (e.is(toggleSlashCommand)) {
                return {active: e.value, filterText: "", pos: tr.selection?.main.from ?? 0, selectedIndex: 0}
            }
            if (e.is(updateSelectedIndex)) {
                return {...value, selectedIndex: e.value}
            }
        }

        // Automatically detect slash command activation based on text input and selection.
        if (tr.selection) {
            const line = tr.state.doc.lineAt(tr.selection.main.from)
            const lineText = line.text.slice(0, tr.selection.main.from - line.from)
            const match = SLASH_COMMAND_FILTER_REGEX.exec(lineText)
            const cursorPos = tr.selection.main.from - line.from

            if (match && cursorPos === lineText.length) {
                return {
                    active: true,
                    filterText: match[1],
                    pos: tr.selection.main.from - match[0].length,
                    selectedIndex: value.selectedIndex // Preserve selection while filtering
                }
            } else {
                return {active: false, filterText: "", pos: 0, selectedIndex: 0}
            }
        }
        return value
    },
})
