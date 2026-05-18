import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
    createIcons,
    type Icons,
    AlignCenter,
    AlignLeft,
    AlignRight,
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRightToLine,
    ArrowUpToLine,
    Trash2,
} from 'lucide';
import type { ColAlignment } from './types';

const ICON_SIZE = {
    width: '16',
    height: '16',
};

interface TableActionPopoverHandlers {
    prependRow: (rowIndex: number) => void;
    appendRow: (rowIndex: number) => void;
    pluckRow: (rowIndex: number) => void;
    prependCol: (colIndex: number) => void;
    appendCol: (colIndex: number) => void;
    pluckCol: (colIndex: number) => void;
    changeColAlignment: (alignment: ColAlignment, colIndex: number) => void;
}

interface TableActionPopoverOptions {
    rowAnchor: HTMLElement;
    columnAnchor: HTMLElement;
    handlers: TableActionPopoverHandlers;
    onCommit: () => void;
}

interface ActionConfig {
    icon: string;
    title: string;
    action: (event: MouseEvent) => void;
}

function createActionButton(action: ActionConfig): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = `<i data-lucide="${action.icon}"></i>`;
    button.title = action.title;
    button.className = 'tippy-button';
    button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        action.action(event);
    });
    return button;
}

function createPopoverContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'table-action-popover';
    return container;
}

function mountIcons(root: HTMLElement, iconSet: Icons): void {
    setTimeout(() => {
        createIcons({
            icons: iconSet,
            attrs: ICON_SIZE,
            root,
        });
    }, 0);
}

export class TableEditorActionsPopover {
    private tippyInstance: TippyInstance | null = null;
    private alignmentTippyInstance: TippyInstance | null = null;

    constructor(private readonly options: TableActionPopoverOptions) {}

    destroy(): void {
        this.alignmentTippyInstance?.destroy();
        this.alignmentTippyInstance = null;
        this.tippyInstance?.destroy();
        this.tippyInstance = null;
    }

    updatePosition(): void {
        void this.tippyInstance?.popperInstance?.update();
    }

    showRowActions(rowIndex: number): void {
        this.destroy();
        const content = this.createRowActionsContent(rowIndex);
        this.tippyInstance = tippy(this.options.rowAnchor, {
            content,
            interactive: true,
            theme: 'custom',
            placement: 'right',
            trigger: 'manual',
            hideOnClick: false,
            appendTo: () => document.body,
            arrow: true,
        });
        this.tippyInstance.show();
    }

    showColumnActions(colIndex: number): void {
        this.destroy();
        const content = this.createColumnActionsContent(colIndex);
        this.tippyInstance = tippy(this.options.columnAnchor, {
            content,
            interactive: true,
            theme: 'custom',
            placement: 'bottom',
            trigger: 'manual',
            hideOnClick: false,
            appendTo: () => document.body,
            arrow: true,
        });
        this.tippyInstance.show();
    }

    private createRowActionsContent(rowIndex: number): HTMLElement {
        const container = createPopoverContainer();
        const actions: ActionConfig[] = [
            {
                icon: 'arrow-up-to-line',
                title: 'Insert row above',
                action: () => {
                    this.options.handlers.prependRow(rowIndex);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'arrow-down-to-line',
                title: 'Insert row below',
                action: () => {
                    this.options.handlers.appendRow(rowIndex);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'trash-2',
                title: 'Delete this row',
                action: () => {
                    this.options.handlers.pluckRow(rowIndex);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
        ];

        for (const action of actions) {
            container.appendChild(createActionButton(action));
        }

        mountIcons(container, { ArrowUpToLine, ArrowDownToLine, Trash2 });
        return container;
    }

    private createColumnActionsContent(colIndex: number): HTMLElement {
        const container = createPopoverContainer();
        const actions: ActionConfig[] = [
            {
                icon: 'arrow-left-to-line',
                title: 'Insert column to the left',
                action: () => {
                    this.options.handlers.prependCol(colIndex);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'arrow-right-to-line',
                title: 'Insert column to the right',
                action: () => {
                    this.options.handlers.appendCol(colIndex);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'trash-2',
                title: 'Delete this column',
                action: () => {
                    this.options.handlers.pluckCol(colIndex);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'align-center',
                title: 'Alignment',
                action: (event) => this.showAlignmentOptions(event.currentTarget as HTMLElement, colIndex),
            },
        ];

        for (const action of actions) {
            container.appendChild(createActionButton(action));
        }

        mountIcons(container, { ArrowLeftToLine, ArrowRightToLine, Trash2, AlignCenter });
        return container;
    }

    private showAlignmentOptions(target: HTMLElement, colIndex: number): void {
        this.alignmentTippyInstance?.destroy();
        this.alignmentTippyInstance = null;
        const alignmentContainer = createPopoverContainer();
        alignmentContainer.classList.add('alignment-options');

        const alignments: Array<{
            icon: string;
            title: string;
            alignment: ColAlignment;
        }> = [
            {
                icon: 'align-left',
                title: 'Align left',
                alignment: 'left',
            },
            {
                icon: 'align-center',
                title: 'Align center',
                alignment: 'center',
            },
            {
                icon: 'align-right',
                title: 'Align right',
                alignment: 'right',
            },
        ];

        for (const alignOption of alignments) {
            const button = createActionButton({
                icon: alignOption.icon,
                title: alignOption.title,
                action: () => {
                    this.options.handlers.changeColAlignment(alignOption.alignment, colIndex);
                    this.alignmentTippyInstance?.hide();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            });
            alignmentContainer.appendChild(button);
        }

        this.alignmentTippyInstance = tippy(target, {
            content: alignmentContainer,
            interactive: true,
            theme: 'custom',
            placement: 'bottom',
            trigger: 'manual',
            hideOnClick: false,
            appendTo: () => document.body,
            arrow: true,
        });
        this.alignmentTippyInstance.show();

        mountIcons(alignmentContainer, { AlignLeft, AlignCenter, AlignRight });
    }
}
