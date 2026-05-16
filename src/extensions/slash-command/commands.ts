import { EditorView } from '@codemirror/view';
import {
    MARKDOWN_TEMPLATES,
} from '../../core/constants';
import {
    type MoondownSlashCommand,
    type MoondownTranslations,
} from '../../core';
import { getCurrentLine } from '../../core/utils/editor-utils';
import { ghostWriterExecutor } from './ghost-writer';

/**
 * Defines the structure for a slash command option in the menu.
 */
export interface SlashCommandOption {
    id: string;
    title: string;
    titleKey?: string;
    icon: string;
    keywords?: ReadonlyArray<string>;
    isDivider?: boolean;
    execute: (view: EditorView) => void | Promise<void | AbortController>;
}

export type SlashCommandNavigationStep = 1 | -1;

const dividerCommand: SlashCommandOption = {
    id: 'divider',
    title: 'divider',
    titleKey: 'divider',
    icon: '',
    isDivider: true,
    execute: () => {},
};

/**
 * Helper function to insert text at the beginning of the current line.
 */
function insertAtLineStart(view: EditorView, text: string, cursorOffset: number = 0): void {
    const line = getCurrentLine(view.state);
    view.dispatch({
        changes: { from: line.from, to: line.from, insert: text },
        selection: { anchor: line.from + text.length + cursorOffset },
    });
}

/**
 * Helper function to insert text at the current cursor position, with an optional selection.
 */
function insertAtCursor(
    view: EditorView,
    text: string,
    selectionStart?: number,
    selectionEnd?: number
): void {
    const pos = view.state.selection.main.from;
    const changes = { from: pos, insert: text };

    if (selectionStart !== undefined && selectionEnd !== undefined) {
        view.dispatch({
            changes,
            selection: { anchor: pos + selectionStart, head: pos + selectionEnd },
        });
    } else {
        view.dispatch({
            changes,
            selection: { anchor: pos + text.length },
        });
    }
}

/**
 * Built-in slash commands.
 */
export const builtinSlashCommands: ReadonlyArray<SlashCommandOption> = [
    {
        id: 'ai-continue',
        title: 'AI Continue',
        titleKey: 'moondown.slash.aiContinue',
        icon: 'bot',
        keywords: ['ai', 'continue', 'write'],
        execute: async (view: EditorView) => ghostWriterExecutor(view),
    },
    {
        id: 'heading-1',
        title: 'Heading 1',
        titleKey: 'moondown.slash.heading1',
        icon: 'heading-1',
        keywords: ['h1', 'heading'],
        execute: (view: EditorView) => insertAtLineStart(view, '# ', 0),
    },
    {
        id: 'heading-2',
        title: 'Heading 2',
        titleKey: 'moondown.slash.heading2',
        icon: 'heading-2',
        keywords: ['h2', 'heading'],
        execute: (view: EditorView) => insertAtLineStart(view, '## ', 0),
    },
    {
        id: 'heading-3',
        title: 'Heading 3',
        titleKey: 'moondown.slash.heading3',
        icon: 'heading-3',
        keywords: ['h3', 'heading'],
        execute: (view: EditorView) => insertAtLineStart(view, '### ', 0),
    },
    {
        id: 'heading-4',
        title: 'Heading 4',
        titleKey: 'moondown.slash.heading4',
        icon: 'heading-4',
        keywords: ['h4', 'heading'],
        execute: (view: EditorView) => insertAtLineStart(view, '#### ', 0),
    },
    dividerCommand,
    {
        id: 'insert-table',
        title: 'Insert Table',
        titleKey: 'moondown.slash.insertTable',
        icon: 'table',
        keywords: ['table', 'grid'],
        execute: (view: EditorView) => insertAtCursor(view, MARKDOWN_TEMPLATES.TABLE),
    },
    {
        id: 'insert-link',
        title: 'Insert Link',
        titleKey: 'moondown.slash.insertLink',
        icon: 'link',
        keywords: ['link', 'url'],
        execute: (view: EditorView) => insertAtCursor(view, MARKDOWN_TEMPLATES.LINK, 1, 10),
    },
    {
        id: 'quote-block',
        title: 'Quote Block',
        titleKey: 'moondown.slash.quoteBlock',
        icon: 'quote',
        keywords: ['quote', 'blockquote'],
        execute: (view: EditorView) => insertAtLineStart(view, '> ', 0),
    },
    {
        id: 'ordered-list',
        title: 'Ordered List',
        titleKey: 'moondown.slash.orderedList',
        icon: 'list-ordered',
        keywords: ['ordered', 'list', 'numbered'],
        execute: (view: EditorView) => insertAtLineStart(view, '1. ', 0),
    },
    {
        id: 'unordered-list',
        title: 'Unordered List',
        titleKey: 'moondown.slash.unorderedList',
        icon: 'list',
        keywords: ['unordered', 'list', 'bullet'],
        execute: (view: EditorView) => insertAtLineStart(view, '- ', 0),
    },
    {
        id: 'code-block',
        title: 'Code Block',
        titleKey: 'moondown.slash.codeBlock',
        icon: 'code',
        keywords: ['code', 'fenced'],
        execute: (view: EditorView) => insertAtCursor(view, MARKDOWN_TEMPLATES.CODE_BLOCK, 4, 4),
    },
    {
        id: 'insert-mermaid',
        title: 'Insert Mermaid',
        titleKey: 'moondown.slash.insertMermaid',
        icon: 'git-branch',
        keywords: ['mermaid', 'diagram', 'flowchart'],
        execute: (view: EditorView) => insertAtCursor(view, MARKDOWN_TEMPLATES.MERMAID_BLOCK, 12, 12),
    },
    {
        id: 'insert-latex',
        title: 'Insert LaTeX',
        titleKey: 'moondown.slash.insertLatex',
        icon: 'sigma',
        keywords: ['latex', 'math', 'formula', 'equation'],
        execute: (view: EditorView) => insertAtCursor(view, MARKDOWN_TEMPLATES.LATEX_BLOCK, 10, 10),
    },
];

function normalizePluginCommand(command: MoondownSlashCommand): SlashCommandOption {
    return {
        id: command.id,
        title: command.title,
        titleKey: command.titleKey,
        icon: command.icon || 'puzzle',
        keywords: command.keywords,
        execute: command.execute,
    };
}

function dedupeSlashCommands(commands: ReadonlyArray<SlashCommandOption>): SlashCommandOption[] {
    const seen = new Set<string>();
    const deduped: SlashCommandOption[] = [];

    for (const command of commands) {
        if (command.isDivider) {
            deduped.push(command);
            continue;
        }

        if (seen.has(command.id)) {
            continue;
        }
        seen.add(command.id);
        deduped.push(command);
    }

    return deduped;
}

/**
 * Returns the merged slash command list (built-ins + plugin commands).
 */
export function resolveSlashCommands(
    pluginCommands: ReadonlyArray<MoondownSlashCommand>
): SlashCommandOption[] {
    const mappedPluginCommands = pluginCommands.map(normalizePluginCommand);
    const merged = mappedPluginCommands.length > 0
        ? [...builtinSlashCommands, dividerCommand, ...mappedPluginCommands]
        : [...builtinSlashCommands];

    return dedupeSlashCommands(merged);
}

/**
 * Resolves the full slash command list and applies filter text.
 */
export function resolveFilteredSlashCommands(
    pluginCommands: ReadonlyArray<MoondownSlashCommand>,
    filterText: string,
    translations: MoondownTranslations
): SlashCommandOption[] {
    const allCommands = resolveSlashCommands(pluginCommands);
    return filterSlashCommands(allCommands, filterText, translations);
}

export function getSlashCommandTitle(
    command: SlashCommandOption,
    translations: MoondownTranslations
): string {
    if (command.titleKey) {
        const translatedTitle = translations[command.titleKey];
        if (translatedTitle) {
            return translatedTitle;
        }
    }
    return command.title;
}

function matchesSlashCommand(
    command: SlashCommandOption,
    filterText: string,
    translations: MoondownTranslations
): boolean {
    if (command.isDivider) {
        return true;
    }

    const normalizedFilter = filterText.trim().toLowerCase();
    if (normalizedFilter.length === 0) {
        return true;
    }

    const title = getSlashCommandTitle(command, translations).toLowerCase();
    if (title.includes(normalizedFilter)) {
        return true;
    }

    return (command.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(normalizedFilter));
}

function trimDividers(commands: ReadonlyArray<SlashCommandOption>): SlashCommandOption[] {
    const normalized: SlashCommandOption[] = [];
    let previousWasDivider = true;

    for (const command of commands) {
        if (command.isDivider) {
            if (previousWasDivider) {
                continue;
            }
            previousWasDivider = true;
            normalized.push(command);
            continue;
        }

        previousWasDivider = false;
        normalized.push(command);
    }

    while (normalized.length > 0 && normalized[normalized.length - 1].isDivider) {
        normalized.pop();
    }

    return normalized;
}

/**
 * Filters slash commands by user input while preserving divider structure.
 */
export function filterSlashCommands(
    commands: ReadonlyArray<SlashCommandOption>,
    filterText: string,
    translations: MoondownTranslations
): SlashCommandOption[] {
    const filtered = commands.filter((command) => matchesSlashCommand(command, filterText, translations));
    return trimDividers(filtered);
}

export function findFirstSelectableSlashCommandIndex(commands: ReadonlyArray<SlashCommandOption>): number {
    for (let index = 0; index < commands.length; index += 1) {
        if (!commands[index].isDivider) {
            return index;
        }
    }
    return -1;
}

export function findSelectableSlashCommandIndex(
    commands: ReadonlyArray<SlashCommandOption>,
    startIndex: number,
    step: SlashCommandNavigationStep
): number {
    if (commands.length === 0) {
        return -1;
    }

    let index = ((startIndex % commands.length) + commands.length) % commands.length;
    for (let i = 0; i < commands.length; i += 1) {
        if (isSelectableSlashCommand(commands[index])) {
            return index;
        }
        index = (index + step + commands.length) % commands.length;
    }

    return -1;
}

export function normalizeSelectedSlashCommandIndex(
    commands: ReadonlyArray<SlashCommandOption>,
    selectedIndex: number
): number {
    if (commands.length === 0) {
        return 0;
    }

    if (selectedIndex < 0 || selectedIndex >= commands.length || !isSelectableSlashCommand(commands[selectedIndex])) {
        return findFirstSelectableSlashCommandIndex(commands);
    }

    return selectedIndex;
}

export function isSelectableSlashCommand(command: SlashCommandOption | undefined): boolean {
    return Boolean(command && !command.isDivider);
}
