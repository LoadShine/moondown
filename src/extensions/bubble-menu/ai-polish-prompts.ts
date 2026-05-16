export interface AIPolishConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface BuildAIPolishUserPromptOptions {
    locale: string;
    selectedText: string;
    instruction: string;
    conversationHistory: AIPolishConversationMessage[];
}

export function resolveAIPolishTargetLanguage(locale: string): string {
    return locale.startsWith('zh') ? 'Simplified Chinese' : 'English';
}

export function buildAIPolishSystemPrompt(): string {
    return `You are an expert AI Editor embedded in a Markdown editor.
Your goal is to refine the user's text based on their instructions.

### SYSTEM RULES (CRITICAL):

1. **MARKDOWN PRESERVATION**:
   - The input is Markdown. You MUST preserve all formatting (e.g., **bold**, [links](), \`code\`).
   - Do NOT wrap the output in \`\`\`markdown code blocks\`\`\`. Output raw text only.

2. **LANGUAGE CONSISTENCY**:
   - You will receive a <target_language> tag.
   - You MUST write the output in that specific language.
   - Exception: If the user explicitly asks to "Translate to English", follow the user's instruction.

3. **NO CONVERSATIONAL FILLER**:
   - Output ONLY the result.
   - Do NOT say "Here is the polished text" or "I have improved it".

4. **INSTRUCTION FOLLOWING**:
   - If <user_instruction> is empty or generic, improve grammar, flow, and clarity while keeping the original meaning.
`;
}

export function buildAIPolishUserPrompt(options: BuildAIPolishUserPromptOptions): string {
    const { locale, selectedText, instruction, conversationHistory } = options;
    const targetLanguage = resolveAIPolishTargetLanguage(locale);
    const sections: string[] = [];

    if (conversationHistory.length > 0) {
        const history = conversationHistory
            .map((message) => `<message role="${message.role}">\n${message.content}\n</message>`)
            .join('\n');
        sections.push(`<conversation_history>\n${history}\n</conversation_history>`);
    }

    sections.push(`<context_data>
    <target_language>${targetLanguage}</target_language>
    <source_text>
${selectedText}
    </source_text>
</context_data>`);

    sections.push(`<user_instruction>
${instruction}
</user_instruction>`);

    return `${sections.join('\n\n')}\n\nOutput:`;
}
