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
    prependRow: () => void;
    appendRow: () => void;
    pluckRow: () => void;
    prependCol: () => void;
    appendCol: () => void;
    pluckCol: () => void;
    changeColAlignment: (alignment: ColAlignment) => void;
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
    button.innerHTML = `<i data-lucide="${action.icon}"></i>`;
    button.title = action.title;
    button.className = 'tippy-button';
    button.addEventListener('click', action.action);
    return button;
}

function createPopoverContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'table-action-popover';
    return container;
}

function mountIcons(iconSet: Icons): void {
    setTimeout(() => {
        createIcons({
            icons: iconSet,
            attrs: ICON_SIZE,
        });
    }, 0);
}

export class TableEditorActionsPopover {
    private tippyInstance: TippyInstance | null = null;

    constructor(private readonly options: TableActionPopoverOptions) {}

    destroy(): void {
        this.tippyInstance?.destroy();
        this.tippyInstance = null;
    }

    showRowActions(): void {
        this.destroy();
        const content = this.createRowActionsContent();
        this.tippyInstance = tippy(this.options.rowAnchor, {
            content,
            interactive: true,
            theme: 'custom',
            placement: 'right',
            trigger: 'manual',
            arrow: true,
        });
        this.tippyInstance.show();
    }

    showColumnActions(): void {
        this.destroy();
        const content = this.createColumnActionsContent();
        this.tippyInstance = tippy(this.options.columnAnchor, {
            content,
            interactive: true,
            theme: 'custom',
            placement: 'bottom',
            trigger: 'manual',
            arrow: true,
        });
        this.tippyInstance.show();
    }

    private createRowActionsContent(): HTMLElement {
        const container = createPopoverContainer();
        const actions: ActionConfig[] = [
            {
                icon: 'arrow-up-to-line',
                title: 'Insert row above',
                action: () => {
                    this.options.handlers.prependRow();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'arrow-down-to-line',
                title: 'Insert row below',
                action: () => {
                    this.options.handlers.appendRow();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'trash-2',
                title: 'Delete this row',
                action: () => {
                    this.options.handlers.pluckRow();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
        ];

        for (const action of actions) {
            container.appendChild(createActionButton(action));
        }

        mountIcons({ ArrowUpToLine, ArrowDownToLine, Trash2 });
        return container;
    }

    private createColumnActionsContent(): HTMLElement {
        const container = createPopoverContainer();
        const actions: ActionConfig[] = [
            {
                icon: 'arrow-left-to-line',
                title: 'Insert column to the left',
                action: () => {
                    this.options.handlers.prependCol();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'arrow-right-to-line',
                title: 'Insert column to the right',
                action: () => {
                    this.options.handlers.appendCol();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'trash-2',
                title: 'Delete this column',
                action: () => {
                    this.options.handlers.pluckCol();
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            },
            {
                icon: 'align-center',
                title: 'Alignment',
                action: (event) => this.showAlignmentOptions(event.currentTarget as HTMLElement),
            },
        ];

        for (const action of actions) {
            container.appendChild(createActionButton(action));
        }

        mountIcons({ ArrowLeftToLine, ArrowRightToLine, Trash2, AlignCenter });
        return container;
    }

    private showAlignmentOptions(target: HTMLElement): void {
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
                    this.options.handlers.changeColAlignment(alignOption.alignment);
                    this.tippyInstance?.hide();
                    this.options.onCommit();
                },
            });
            alignmentContainer.appendChild(button);
        }

        const instance = tippy(target, {
            content: alignmentContainer,
            interactive: true,
            theme: 'custom',
            placement: 'bottom',
            trigger: 'manual',
            arrow: true,
        });
        instance.show();

        mountIcons({ AlignLeft, AlignCenter, AlignRight });
    }
}
