import { createIcons, icons } from 'lucide';
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { CSS_CLASSES, ICON_SIZES } from '../../core';
import { createElement, createIconElement } from '../../core';
import type { BubbleMenuItem } from './types';

interface BubbleMenuDomRenderOptions {
    dom: HTMLElement;
    items: BubbleMenuItem[];
    view: EditorView;
    onActionFinished: () => void;
}

function createMenuButton(item: BubbleMenuItem): HTMLButtonElement {
    const button = createElement('button', CSS_CLASSES.BUBBLE_MENU_ITEM, {
        'data-name': item.name,
        'data-type': item.type || 'button',
        title: item.name,
    });

    const iconWrapper = createIconElement(item.icon, 'cm-bubble-menu-icon');
    button.appendChild(iconWrapper);
    return button;
}

function createSubMenuButton(
    parentItemName: string,
    subItem: NonNullable<BubbleMenuItem['subItems']>[number]
): HTMLButtonElement {
    const subButton = createElement('button', CSS_CLASSES.BUBBLE_MENU_SUB_ITEM, {
        'data-name': subItem.name,
        'data-parent': parentItemName,
    });

    if (subItem.icon) {
        const subIconWrapper = createIconElement(subItem.icon, 'cm-bubble-menu-sub-icon');
        subButton.appendChild(subIconWrapper);
    }

    const subLabel = createElement('span', 'cm-bubble-menu-sub-label');
    subLabel.textContent = subItem.name;
    subButton.appendChild(subLabel);

    return subButton;
}

function mountIcons(): void {
    setTimeout(() => {
        createIcons({
            icons,
            attrs: ICON_SIZES.MEDIUM,
        });
    }, 0);
}

export function updateBubbleMenuActiveStates(
    dom: HTMLElement,
    items: BubbleMenuItem[],
    state: EditorState
): void {
    for (const item of items) {
        if (item.isActive) {
            const button = dom.querySelector(`[data-name="${item.name}"]`) as HTMLButtonElement | null;
            if (button) {
                button.classList.toggle(CSS_CLASSES.BUBBLE_MENU_ACTIVE, item.isActive(state));
            }
        }

        for (const subItem of item.subItems ?? []) {
            if (!subItem.isActive) {
                continue;
            }
            const subButton = dom.querySelector(
                `[data-name="${subItem.name}"][data-parent="${item.name}"]`
            ) as HTMLButtonElement | null;
            if (subButton) {
                subButton.classList.toggle(CSS_CLASSES.BUBBLE_MENU_ACTIVE, subItem.isActive(state));
            }
        }
    }
}

export function renderBubbleMenuDom({
    dom,
    items,
    view,
    onActionFinished,
}: BubbleMenuDomRenderOptions): void {
    dom.innerHTML = '';

    for (const item of items) {
        const button = createMenuButton(item);

        if (item.type === 'dropdown') {
            const dropdownIcon = createIconElement('chevron-down', 'cm-bubble-menu-dropdown-icon');
            button.appendChild(dropdownIcon);

            const dropdown = createElement('div', CSS_CLASSES.BUBBLE_MENU_DROPDOWN);

            for (const subItem of item.subItems ?? []) {
                const subButton = createSubMenuButton(item.name, subItem);
                subButton.addEventListener('click', async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    await subItem.action(view);
                    onActionFinished();
                });
                dropdown.appendChild(subButton);
            }

            button.appendChild(dropdown);
        } else if (item.action) {
            button.addEventListener('click', async (event) => {
                event.preventDefault();
                await item.action?.(view);
                onActionFinished();
            });
        }

        dom.appendChild(button);
    }

    mountIcons();
}
