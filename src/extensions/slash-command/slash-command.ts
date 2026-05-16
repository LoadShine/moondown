import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { createIcons, icons } from 'lucide';
import { SLASH_COMMAND_FILTER_REGEX, slashCommandState, toggleSlashCommand, updateSelectedIndex } from "./fields";
import {
    getSlashCommandTitle,
    normalizeSelectedSlashCommandIndex,
    resolveFilteredSlashCommands,
    type SlashCommandOption,
} from "./commands";
import { CSS_CLASSES, ICON_SIZES, TIMING } from "../../core/constants";
import { createElement, createIconElement, debounce, scrollIntoView as scrollElementIntoView } from "../../core/utils/dom-utils";
import { pluginSlashCommandsState, translationsState } from '../runtime/editor-runtime-state';
import {MoondownTranslations} from "../../core";

/**
 * A CodeMirror ViewPlugin that manages the rendering and interaction of the slash command menu.
 */
export const slashCommandPlugin = ViewPlugin.fromClass(class {
    editorDom: HTMLElement;
    menu: HTMLElement;
    currentAbortController: AbortController | null;
    debouncedUpdate: (update: ViewUpdate) => void;
    handleEditorClick: () => void;
    handleDocumentClick: (event: MouseEvent) => void;
    destroyed: boolean;

    constructor(view: EditorView) {
        this.editorDom = view.dom;
        this.menu = createElement('div', CSS_CLASSES.SLASH_COMMAND_MENU);
        view.dom.appendChild(this.menu);
        this.currentAbortController = null;
        this.destroyed = false;
        this.debouncedUpdate = debounce(
            (update: ViewUpdate) => this.updateMenu(update),
            TIMING.DEBOUNCE_DELAY
        );
        this.handleEditorClick = () => {
            this.abortAIContinuation();
        };
        this.handleDocumentClick = (e: MouseEvent) => {
            if (this.destroyed) {
                return;
            }
            if (!this.menu.contains(e.target as Node) && !view.dom.contains(e.target as Node)) {
                view.dispatch({
                    effects: toggleSlashCommand.of(false)
                });
                this.abortAIContinuation();
            }
        };

        view.dom.addEventListener('click', this.handleEditorClick);
        document.addEventListener('click', this.handleDocumentClick);
    }

    update(update: ViewUpdate): void {
        if (this.destroyed) {
            return;
        }
        this.debouncedUpdate(update);
    }

    updateMenu(update: ViewUpdate): void {
        if (this.destroyed) {
            return;
        }

        const state = update.state.field(slashCommandState);
        const translations = update.state.field(translationsState);
        const pluginCommands = update.state.field(pluginSlashCommandsState);

        if (!state.active) {
            this.hide();
            return;
        }

        this.show();

        requestAnimationFrame(() => {
            if (this.destroyed || !this.menu.isConnected) {
                return;
            }

            const pos = update.view.coordsAtPos(state.pos);
            if (pos) {
                const editorRect = update.view.dom.getBoundingClientRect();
                const menuRect = this.menu.getBoundingClientRect();

                if (pos.top + menuRect.height > editorRect.bottom) {
                    this.menu.style.top = `${pos.top - editorRect.top - menuRect.height}px`;
                } else {
                    this.menu.style.top = `${pos.top - editorRect.top + 20}px`;
                }

                this.menu.style.left = `${pos.left - editorRect.left}px`;
            }
        });

        const filteredCommands = resolveFilteredSlashCommands(pluginCommands, state.filterText, translations);
        const selectedIndex = normalizeSelectedSlashCommandIndex(filteredCommands, state.selectedIndex);

        if (selectedIndex !== state.selectedIndex) {
            update.view.dispatch({
                effects: updateSelectedIndex.of(selectedIndex),
            });
        }

        this.renderCommands(filteredCommands, selectedIndex, update.view, translations);
    }

    renderCommands(
        commands: SlashCommandOption[],
        selectedIndex: number,
        view: EditorView,
        translations: MoondownTranslations
    ): void {
        requestAnimationFrame(() => {
            if (this.destroyed || !this.menu.isConnected) {
                return;
            }

            const fragment = document.createDocumentFragment();

            commands.forEach((cmd, index) => {
                if (cmd.isDivider) {
                    const divider = createElement("hr", CSS_CLASSES.SLASH_COMMAND_DIVIDER);
                    fragment.appendChild(divider);
                    return;
                }

                const isSelected = index === selectedIndex;
                const itemClass = `${CSS_CLASSES.SLASH_COMMAND_ITEM} ${
                    isSelected ? CSS_CLASSES.SLASH_COMMAND_SELECTED : ''
                }`;
                const item = createElement("div", itemClass);
                const titleText = getSlashCommandTitle(cmd, translations);

                const icon = createIconElement(cmd.icon, "cm-slash-command-icon");
                const title = createElement("span", "cm-slash-command-title");
                title.textContent = titleText;

                item.appendChild(icon);
                item.appendChild(title);

                item.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.executeCommand(view, cmd);
                });

                fragment.appendChild(item);
            });

            this.menu.innerHTML = '';
            this.menu.appendChild(fragment);

            createIcons({
                icons,
                attrs: ICON_SIZES.MEDIUM,
            });

            this.scrollSelectedIntoView();
        });
    }

    scrollSelectedIntoView(): void {
        const selectedItem = this.menu.querySelector(
            `.${CSS_CLASSES.SLASH_COMMAND_ITEM}.${CSS_CLASSES.SLASH_COMMAND_SELECTED}`
        ) as HTMLElement;

        if (selectedItem) {
            scrollElementIntoView(selectedItem, this.menu);
        }
    }

    executeCommand(view: EditorView, cmd: SlashCommandOption): void {
        if (view.state.facet(EditorState.readOnly)) {
            view.dispatch({
                effects: toggleSlashCommand.of(false)
            });
            view.focus();
            return;
        }

        const state = view.state;
        const currentPos = state.selection.main.from;
        const line = state.doc.lineAt(currentPos);
        const lineStart = line.from;
        const lineText = line.text;
        const cursorInLine = currentPos - lineStart;

        const beforeCursor = lineText.slice(0, cursorInLine);
        const slashMatch = beforeCursor.match(SLASH_COMMAND_FILTER_REGEX);

        if (slashMatch) {
            const slashStart = lineStart + beforeCursor.lastIndexOf(slashMatch[0]);
            const slashEnd = currentPos;

            view.dispatch({
                changes: { from: slashStart, to: slashEnd, insert: "" },
                effects: toggleSlashCommand.of(false)
            });
        } else {
            view.dispatch({
                effects: toggleSlashCommand.of(false)
            });
        }

        const result = cmd.execute(view);
        if (result instanceof Promise) {
            result
                .then(controller => {
                    if (controller instanceof AbortController) {
                        this.currentAbortController = controller;
                    }
                })
                .catch((error) => {
                    console.error('[MoondownSlashCommand] command execution failed', error);
                });
        }

        view.focus();
    }

    show(): void {
        this.menu.style.display = "block";
    }

    hide(): void {
        this.menu.style.display = "none";
    }

    setCurrentAbortController(controller: AbortController): void {
        this.currentAbortController = controller;
    }

    clearCurrentAbortController(): void {
        this.currentAbortController = null;
    }

    abortAIContinuation(): void {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }

    destroy(): void {
        this.destroyed = true;
        this.editorDom.removeEventListener('click', this.handleEditorClick);
        document.removeEventListener('click', this.handleDocumentClick);
        this.menu.remove();
        this.abortAIContinuation();
    }
});
