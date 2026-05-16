import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { EditorSelection, EditorState, StateEffect, StateField, Transaction } from "@codemirror/state";
import { slashCommandPlugin } from "./slash-command";
import { CSS_CLASSES, TIMING } from "../../core/constants";
import { onAIStreamState, translationsState } from '../runtime/editor-runtime-state';
import { stripBase64Images } from "../../core/utils/string-utils";

/**
 * Loading widget displayed during AI text generation
 */
class LoadingWidget extends WidgetType {
    /** Flag to identify this widget type */
    readonly isLoadingWidget = true;

    constructor(private text: string) {
        super();
    }

    toDOM(): HTMLElement {
        const div = document.createElement("div");
        div.className = CSS_CLASSES.LOADING_WIDGET;
        div.innerHTML = `
          <div class="${CSS_CLASSES.LOADING_SPINNER}"></div>
          <span>${this.text}</span>
        `;
        return div;
    }
}

/**
 * State effects for ghost writer
 */
const addLoadingEffect = StateEffect.define<{ pos: number, text: string }>();
const removeLoadingEffect = StateEffect.define<null>();
const markNewText = StateEffect.define<{ from: number; to: number }>();
const unmarkNewText = StateEffect.define<{ from: number; to: number }>();

/**
 * State field for managing new text decorations and loading widget
 */
export const newTextState = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(value, tr) {
        value = value.map(tr.changes);

        for (const e of tr.effects) {
            if (e.is(markNewText)) {
                value = value.update({
                    add: [newTextMark.range(e.value.from, e.value.to)]
                });
            } else if (e.is(addLoadingEffect)) {
                value = value.update({
                    add: [Decoration.widget({
                        widget: new LoadingWidget(e.value.text),
                        side: 1
                    }).range(e.value.pos)]
                });
            } else if (e.is(removeLoadingEffect)) {
                value = value.update({
                    filter: (_from, _to, decoration) => {
                        return !(decoration.spec.widget && (decoration.spec.widget as LoadingWidget).isLoadingWidget);
                    }
                });
            } else if (e.is(unmarkNewText)) {
                value = value.update({
                    filter: (from, to, decoration) => {
                        const isTargetDecoration = decoration.spec.class === CSS_CLASSES.NEW_TEXT;
                        const isInRange = from >= e.value.from && to <= e.value.to;
                        return !(isTargetDecoration && isInRange);
                    }
                });
            }
        }

        return value;
    },
    provide: f => EditorView.decorations.from(f)
});

/** Effect to scroll editor view to a specific position */
export const scrollIntoView = StateEffect.define<number>();

/** Decoration mark for newly generated text */
const newTextMark = Decoration.mark({ class: CSS_CLASSES.NEW_TEXT });

/**
 * Executes AI-powered ghost writer to continue text
 * @param view - Editor view instance
 * @returns Promise that resolves to AbortController for cancellation
 */
export async function ghostWriterExecutor(view: EditorView): Promise<AbortController> {
    if (view.state.facet(EditorState.readOnly)) {
        return new AbortController();
    }

    const { state, dispatch } = view;
    const { from, to } = state.selection.ranges[0];
    const text = state.doc.toString();

    // Get raw prefix and suffix
    const rawPrefix = text.slice(0, to);
    const rawSuffix = text.slice(from);

    // Sanitize Base64 images to avoid token overflow
    const prefix = stripBase64Images(rawPrefix);
    const suffix = stripBase64Images(rawSuffix);

    const pos = state.selection.main.from;

    const onAIStream = state.field(onAIStreamState);
    const translations = state.field(translationsState);

    const completionPrompt = translations['moondown.prompts.textContinuation'] || `You are a writing assistant embedded in a Markdown editor.
Your task is to continue writing text at the cursor position.

### CRITICAL RULES:
1. Output ONLY the new text that should be inserted at the cursor position.
2. Do NOT repeat or include any part of the existing text (prefix or suffix).
3. Do NOT wrap your output in quotes, code blocks, or any markup.
4. Continue naturally from where the prefix ends, maintaining consistent style, tone, and language.
5. If the prefix is in Chinese, continue in Chinese. If in English, continue in English.
6. Keep markdown formatting consistent with the existing document.`;

    const abortController = new AbortController();
    const plugin = view.plugin(slashCommandPlugin);

    if (plugin) {
        plugin.setCurrentAbortController(abortController);
    }

    if (!onAIStream) {
        console.error("AI stream handler is not configured for the Moondown editor.");
        if (plugin) plugin.clearCurrentAbortController();
        return abortController;
    }

    const startPos = pos;
    let endPos = pos;
    const loadingText = translations['moondown.ai.thinking'] || 'AI is thinking...';

    // Show loading indicator
    dispatch({
        effects: addLoadingEffect.of({ pos, text: loadingText })
    });

    try {
        const userPrompt = `<text_before_cursor>
${prefix}
</text_before_cursor>

<text_after_cursor>
${suffix}
</text_after_cursor>

Continue writing from where the cursor is. Output ONLY the new continuation text. Do NOT repeat any existing text.`;

        const stream = await onAIStream(
            completionPrompt,
            userPrompt,
            abortController.signal
        );

        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (true) {
            if (abortController.signal.aborted) {
                console.log('Stream aborted by user.');
                if (reader) await reader.cancel();
                break;
            }

            const { done, value } = await reader.read();
            if (done) break;

            const content = typeof value === 'string' ? value : decoder.decode(value);

            if (content) {
                const insertPos = endPos;
                endPos += content.length;

                // Annotate all AI chunks with the same userEvent so CodeMirror's
                // history module groups them into a single undo entry.
                dispatch({
                    changes: { from: insertPos, insert: content },
                    effects: [
                        markNewText.of({ from: insertPos, to: insertPos + content.length }),
                        scrollIntoView.of(insertPos + content.length)
                    ],
                    annotations: Transaction.userEvent.of('input.ai-continue')
                });
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('AI continuation aborted');
        } else {
            console.error('Error during AI continuation:', error);
        }
    } finally {
        // Remove loading indicator
        dispatch({
            effects: removeLoadingEffect.of(null)
        });

        // Move cursor to end of generated text
        view.dispatch(view.state.update({
            selection: EditorSelection.cursor(endPos)
        }));

        // Remove highlight after animation completes
        const finalEndPos = endPos;
        setTimeout(() => {
            view.dispatch({
                effects: unmarkNewText.of({ from: startPos, to: finalEndPos })
            });
        }, TIMING.ANIMATION_DURATION);

        if (plugin) {
            plugin.clearCurrentAbortController();
        }
    }

    return abortController;
}
