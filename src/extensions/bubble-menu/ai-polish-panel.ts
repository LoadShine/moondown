import {EditorView} from "@codemirror/view";
import {createIcons, icons} from 'lucide';
import {createElement, createIconElement} from "../../core";
import {CSS_CLASSES} from "../../core";
import type {AIStreamHandler, MoondownTranslations} from "../../core";
import {
    buildAIPolishSystemPrompt,
    buildAIPolishUserPrompt,
    type AIPolishConversationMessage,
} from './ai-polish-prompts';

export interface AIPolishPanelOptions {
    selectedText: string;
    from: number;
    to: number;
    view: EditorView;
    onClose: () => void;
    onInsert: (text: string) => void;
    onAIStream: AIStreamHandler;
    locale?: string;
    translations?: MoondownTranslations;
}

export class AIPolishPanel {
    private dom: HTMLElement;
    private inputContainer: HTMLElement;
    private responseContainer: HTMLElement;
    private inputField: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private options: AIPolishPanelOptions;
    private isGenerating: boolean = false;
    private currentResponse: string = '';
    private abortController: AbortController | null = null;
    private conversationHistory: AIPolishConversationMessage[] = [];
    private readonly locale: string;

    constructor(options: AIPolishPanelOptions) {
        this.options = options;
        this.locale = options.locale || 'en';
        this.dom = createElement('div', CSS_CLASSES.AI_POLISH_PANEL);

        const closeBtn = this.createIconButton('x', this.t('moondown.ai.polish.buttons.close', 'Close'), 'ai-polish-close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.options.onClose();
        });
        this.dom.appendChild(closeBtn);

        this.inputContainer = this.createInputSection();
        this.dom.appendChild(this.inputContainer);

        this.responseContainer = createElement('div', CSS_CLASSES.AI_POLISH_RESPONSE_SECTION);
        this.dom.appendChild(this.responseContainer);

        this.inputField = this.inputContainer.querySelector('textarea') as HTMLTextAreaElement;
        this.sendButton = this.inputContainer.querySelector('.ai-polish-send-btn') as HTMLButtonElement;

        setTimeout(() => this.inputField.focus(), 50);
        document.addEventListener('keydown', this.handleKeyDown);

        this.initializeIcons();
    }

    private initializeIcons(): void {
        requestAnimationFrame(() => {
            createIcons({
                icons,
                attrs: {width: '14', height: '14', "stroke-width": "2.5"},
            });
        });
    }

    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && !this.isGenerating) {
            this.options.onClose();
        }
    };

    private createInputSection(): HTMLElement {
        const container = createElement('div', CSS_CLASSES.AI_POLISH_INPUT_SECTION);
        const wrapper = createElement('div', 'ai-polish-input-wrapper');

        const textarea = document.createElement('textarea');
        textarea.className = CSS_CLASSES.AI_POLISH_INPUT;
        textarea.placeholder = this.t('moondown.ai.polish.placeholder', 'Tell AI how to polish this text...');
        textarea.rows = 1;

        textarea.addEventListener('input', () => this.adjustTextareaHeight(textarea));
        textarea.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handleGenerate();
            }
        });

        wrapper.appendChild(textarea);

        const sendBtn = document.createElement('button');
        sendBtn.className = 'ai-polish-send-btn';
        sendBtn.type = 'button';
        sendBtn.title = `${this.t('moondown.ai.polish.buttons.send', 'Send')} (Cmd+Enter)`;
        sendBtn.appendChild(createIconElement('arrow-up'));
        sendBtn.addEventListener('click', () => this.handleGenerate());

        wrapper.appendChild(sendBtn);
        container.appendChild(wrapper);

        const hint = createElement('div', 'ai-polish-hint');
        hint.innerHTML = `<span>${this.t('moondown.ai.polish.hint', 'Press Cmd/Ctrl + Enter to send')}</span>`;
        container.appendChild(hint);

        return container;
    }

    private adjustTextareaHeight(textarea: HTMLTextAreaElement) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    private createIconButton(iconName: string, tooltip: string, extraClass: string = ''): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = `ai-polish-icon-btn ${extraClass}`.trim();
        btn.type = 'button';
        btn.title = tooltip;
        btn.appendChild(createIconElement(iconName));
        return btn;
    }

    private async handleGenerate(manualInstruction?: string, isRetry: boolean = false): Promise<void> {
        const instruction = manualInstruction || this.inputField.value.trim();
        if (this.isGenerating) return;

        this.isGenerating = true;
        this.currentResponse = '';

        this.dom.classList.add('is-generating');
        this.inputField.disabled = true;
        this.sendButton.disabled = true;

        if (!isRetry) {
            this.inputField.value = '';
            this.adjustTextareaHeight(this.inputField);

            const userHistoryContent = instruction || "General Polish";
            this.conversationHistory.push({ role: 'user', content: userHistoryContent });

            this.responseContainer.classList.add('visible');
            if (instruction) {
                this.appendUserBubble(instruction);
            }
        }

        const responseBubble = this.createResponseBubble();
        this.responseContainer.appendChild(responseBubble);
        const responseText = responseBubble.querySelector('.ai-polish-response-text') as HTMLElement;
        this.scrollToBottom();

        try {
            this.abortController = new AbortController();

            const systemPrompt = buildAIPolishSystemPrompt();
            const userPrompt = buildAIPolishUserPrompt({
                locale: this.locale,
                selectedText: this.options.selectedText,
                instruction: instruction || 'Polish this text.',
                conversationHistory: this.conversationHistory,
            });

            const stream = await this.options.onAIStream(
                systemPrompt,
                userPrompt,
                this.abortController.signal
            );

            const reader = stream.getReader();

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                if (value) {
                    this.currentResponse += value;
                    responseText.textContent = this.currentResponse;
                    this.scrollToBottom();
                }
            }

            this.conversationHistory.push({ role: 'assistant', content: this.currentResponse });

            this.showActionButtons(responseBubble);

        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                responseText.textContent += ' [Cancelled]';
            } else {
                console.error('AI Polish error:', error);
                const message = error instanceof Error ? error.message : 'Generation failed';
                responseText.textContent = `Error: ${message}`;
                responseBubble.classList.add('error');
            }
        } finally {
            this.isGenerating = false;
            this.sendButton.disabled = false;
            this.inputField.disabled = false;
            this.inputField.focus();
            this.abortController = null;
            this.dom.classList.remove('is-generating');
            this.initializeIcons();
        }
    }

    private handleRegenerate(): void {
        if (this.isGenerating) return;
        if (this.conversationHistory.length < 2) return;

        const lastIndex = this.conversationHistory.length - 1;
        const lastMsg = this.conversationHistory[lastIndex];

        if (lastMsg.role === 'assistant') {
            this.conversationHistory.pop();
            if (this.responseContainer.lastElementChild) {
                this.responseContainer.lastElementChild.remove();
            }
        }

        const userMsg = this.conversationHistory[this.conversationHistory.length - 1];
        if (userMsg && userMsg.role === 'user') {
            const retryContent = userMsg.content === "General Polish" ? "" : userMsg.content;
            this.handleGenerate(retryContent, true);
        }
    }

    private appendUserBubble(text: string): void {
        const bubble = createElement('div', 'ai-polish-user-bubble');
        bubble.textContent = text;
        this.responseContainer.appendChild(bubble);
    }

    private scrollToBottom(): void {
        if (this.responseContainer) {
            this.responseContainer.scrollTop = this.responseContainer.scrollHeight;
        }
    }

    private createResponseBubble(): HTMLElement {
        const bubble = createElement('div', CSS_CLASSES.AI_POLISH_RESPONSE_BUBBLE);
        const responseText = createElement('div', 'ai-polish-response-text');
        const typingIndicator = createElement('div', 'ai-polish-typing-indicator');
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';

        bubble.appendChild(responseText);
        bubble.appendChild(typingIndicator);
        return bubble;
    }

    private showActionButtons(bubble: HTMLElement): void {
        const typingIndicator = bubble.querySelector('.ai-polish-typing-indicator');
        if (typingIndicator) typingIndicator.remove();

        const actionBar = createElement('div', 'ai-polish-action-bar');

        const createAction = (iconName: string, label: string, onClick: () => void, isPrimary = false) => {
            const btn = document.createElement('button');
            btn.className = 'ai-polish-action-btn';
            btn.type = 'button';
            if (isPrimary) btn.classList.add('primary-action');

            const icon = createIconElement(iconName);
            const span = document.createElement('span');
            span.textContent = label;

            btn.appendChild(icon);
            btn.appendChild(span);
            btn.onclick = onClick;
            return btn;
        };

        actionBar.appendChild(createAction('refresh-cw', this.t('moondown.ai.polish.buttons.retry', 'Retry'), () => this.handleRegenerate()));

        const copyBtn = createAction('copy', this.t('moondown.ai.polish.buttons.copy', 'Copy'), () => this.handleCopy(copyBtn));
        actionBar.appendChild(copyBtn);

        const insertBtn = createAction('check', this.t('moondown.ai.polish.buttons.insert', 'Insert'), () => this.handleInsert(), true);
        actionBar.appendChild(insertBtn);

        bubble.appendChild(actionBar);
        setTimeout(() => this.scrollToBottom(), 0);
    }

    private handleCopy(btn: HTMLButtonElement): void {
        if (this.currentResponse) {
            navigator.clipboard.writeText(this.currentResponse).then(() => {
                const originalContent = btn.innerHTML;
                const span = btn.querySelector('span');
                if (span) span.textContent = this.t('moondown.ai.polish.buttons.copied', 'Copied');

                setTimeout(() => {
                    btn.innerHTML = originalContent;
                    this.initializeIcons();
                }, 1500);
            });
        }
    }

    private handleInsert(): void {
        if (this.currentResponse) {
            this.options.onInsert(this.currentResponse);
            this.options.onClose();
        }
    }

    private t(key: string, fallback: string): string {
        return this.options.translations?.[key] ?? fallback;
    }

    public getDOM(): HTMLElement { return this.dom; }
    public destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.abortController) this.abortController.abort();
        this.dom.remove();
    }
}
