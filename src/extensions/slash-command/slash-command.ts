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
    view: EditorView;
    editorDom: HTMLElement;
    menu: HTMLElement;
    currentAbortController: AbortController | null;
    debouncedUpdate: (update: ViewUpdate) => void;
    handleEditorPointerDown: (event: MouseEvent) => void;
    handleDocumentClick: (event: MouseEvent) => void;
    handleViewportChange: () => void;
    destroyed: boolean;

    constructor(view: EditorView) {
        this.view = view;
        this.editorDom = view.dom;
        this.menu = createElement('div', CSS_CLASSES.SLASH_COMMAND_MENU);
        this.menu.style.visibility = 'hidden';
        view.dom.appendChild(this.menu);
        this.currentAbortController = null;
        this.destroyed = false;
        this.debouncedUpdate = debounce(
            (update: ViewUpdate) => this.updateMenu(update),
            TIMING.DEBOUNCE_DELAY
        );
        this.handleEditorPointerDown = (event: MouseEvent) => {
            if (this.destroyed) {
                return;
            }

            const target = event.target as Node | null;
            if (target && this.menu.contains(target)) {
                return;
            }

            const state = this.view.state.field(slashCommandState);
            if (state.active) {
                this.view.dispatch({
                    effects: toggleSlashCommand.of(false),
                });
            }
            this.hide();
            this.abortAIContinuation();
        };
        this.handleViewportChange = () => {
            if (this.destroyed) {
                return;
            }
            const state = this.view.state.field(slashCommandState);
            if (!state.active) {
                return;
            }
            requestAnimationFrame(() => {
                if (this.destroyed) {
                    return;
                }
                this.positionMenu(this.view, this.view.state.selection.main.from);
            });
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

        view.dom.addEventListener('mousedown', this.handleEditorPointerDown, true);
        document.addEventListener('click', this.handleDocumentClick);
        window.addEventListener('resize', this.handleViewportChange);
        window.visualViewport?.addEventListener('resize', this.handleViewportChange);
        window.visualViewport?.addEventListener('scroll', this.handleViewportChange);
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

        requestAnimationFrame(() => this.positionMenu(update.view, update.state.selection.main.from));

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
                root: this.menu,
            });

            this.positionMenu(view, view.state.selection.main.from);
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
        this.menu.style.visibility = 'hidden';
    }

    positionMenu(view: EditorView, position: number): void {
        if (this.destroyed || !this.menu.isConnected) {
            return;
        }

        const coords = view.coordsAtPos(position) ?? view.coordsAtPos(Math.max(0, position - 1));
        if (!coords) {
            return;
        }

        const maxMenuHeight = 320;
        const minMenuHeight = 96;
        this.menu.style.maxHeight = `${maxMenuHeight}px`;

        const editorRect = view.dom.getBoundingClientRect();
        const scrollRect = view.scrollDOM.getBoundingClientRect();
        const menuRect = this.menu.getBoundingClientRect();
        const gap = 6;
        const margin = 8;

        const minLeft = scrollRect.left + margin;
        const maxLeft = Math.max(minLeft, scrollRect.right - menuRect.width - margin);
        const viewportLeft = Math.min(maxLeft, Math.max(minLeft, coords.left));

        const spaceBelow = Math.max(0, scrollRect.bottom - coords.bottom - gap - margin);
        const spaceAbove = Math.max(0, coords.top - scrollRect.top - gap - margin);
        const openAbove = spaceBelow < menuRect.height && spaceAbove > spaceBelow;
        const availableHeight = openAbove ? spaceAbove : spaceBelow;
        const constrainedHeight = Math.min(maxMenuHeight, Math.max(minMenuHeight, availableHeight));
        this.menu.style.maxHeight = `${constrainedHeight}px`;

        const menuHeight = Math.min(menuRect.height, constrainedHeight);
        let viewportTop = openAbove
            ? coords.top - menuHeight - gap
            : coords.bottom + gap;

        viewportTop = Math.min(
            Math.max(scrollRect.top + margin, viewportTop),
            Math.max(scrollRect.top + margin, scrollRect.bottom - menuHeight - margin)
        );

        this.menu.style.left = `${viewportLeft - editorRect.left}px`;
        this.menu.style.top = `${viewportTop - editorRect.top}px`;
        this.menu.style.visibility = 'visible';
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
        this.editorDom.removeEventListener('mousedown', this.handleEditorPointerDown, true);
        document.removeEventListener('click', this.handleDocumentClick);
        window.removeEventListener('resize', this.handleViewportChange);
        window.visualViewport?.removeEventListener('resize', this.handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', this.handleViewportChange);
        this.menu.remove();
        this.abortAIContinuation();
    }
});
