import {
    Compartment,
    StateEffect,
    StateField,
    type StateEffectType,
} from '@codemirror/state';
import type {
    AIStreamHandler,
    MoondownSlashCommand,
    MoondownTranslations,
} from '../../core';

/**
 * Creates a StateField whose value is replaced only when a specific effect appears.
 * This keeps dynamic runtime settings (AI handler, locale, translations) predictable.
 */
function createEffectBackedStateField<T>(
    effect: StateEffectType<T>,
    initialValue: T
): StateField<T> {
    return StateField.define<T>({
        create: () => initialValue,
        update: (value, transaction) => {
            for (const currentEffect of transaction.effects) {
                if (currentEffect.is(effect)) {
                    return currentEffect.value;
                }
            }
            return value;
        },
    });
}

/** Compartment for dynamically switching light/dark theme. */
export const themeCompartment = new Compartment();

/** Compartment for toggling WYSIWYG features (table/image/syntax hiding). */
export const wysiwygCompartment = new Compartment();

/** Compartment for read-only mode. */
export const readOnlyCompartment = new Compartment();

/** Compartment for placeholder text. */
export const placeholderCompartment = new Compartment();

/** Effect + StateField for runtime AI stream handler injection. */
export const setOnAIStream = StateEffect.define<AIStreamHandler | null>();
export const onAIStreamState = createEffectBackedStateField<AIStreamHandler | null>(setOnAIStream, null);

/** Effect + StateField for runtime translation overrides. */
export const setTranslations = StateEffect.define<MoondownTranslations>();
export const translationsState = createEffectBackedStateField<MoondownTranslations>(setTranslations, {});

/** Effect + StateField for locale switching (defaults to en). */
export const setLocale = StateEffect.define<string>();
export const localeState = createEffectBackedStateField<string>(setLocale, 'en');

/** Effect + StateField for plugin-contributed slash commands. */
export const setPluginSlashCommands = StateEffect.define<ReadonlyArray<MoondownSlashCommand>>();
export const pluginSlashCommandsState = createEffectBackedStateField<ReadonlyArray<MoondownSlashCommand>>(
    setPluginSlashCommands,
    []
);
