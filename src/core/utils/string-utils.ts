/**
 * Utility functions for string manipulation
 */

/**
 * Escapes special regex characters in a string
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ParsedMarkdownImage {
    alt: string;
    src: string;
}

function isEscaped(text: string, index: number): boolean {
    let backslashes = 0;
    for (let pos = index - 1; pos >= 0 && text[pos] === '\\'; pos -= 1) {
        backslashes += 1;
    }
    return backslashes % 2 === 1;
}

/**
 * Parses a complete Markdown image token.
 * Supports URLs that contain balanced parentheses, e.g. `![x](a_(b).png)`.
 */
export function parseMarkdownImage(text: string): ParsedMarkdownImage | null {
    const source = text.trim();
    if (!source.startsWith('![')) {
        return null;
    }

    let index = 2;
    let altEnd = -1;
    while (index < source.length) {
        if (source[index] === ']' && !isEscaped(source, index)) {
            altEnd = index;
            break;
        }
        index += 1;
    }

    if (altEnd < 0 || source[altEnd + 1] !== '(') {
        return null;
    }

    index = altEnd + 2;
    const srcStart = index;
    let depth = 1;
    let srcEnd = -1;

    while (index < source.length) {
        const char = source[index];
        if (!isEscaped(source, index)) {
            if (char === '(') {
                depth += 1;
            } else if (char === ')') {
                depth -= 1;
                if (depth === 0) {
                    srcEnd = index;
                    break;
                }
            }
        }
        index += 1;
    }

    if (srcEnd < 0 || srcEnd !== source.length - 1) {
        return null;
    }

    const src = source.slice(srcStart, srcEnd);
    if (src.length === 0) {
        return null;
    }

    return {
        alt: source.slice(2, altEnd),
        src,
    };
}

/**
 * Checks if a string matches Markdown image syntax
 * @param text - Text to check
 * @returns True if text is an image markdown
 */
export function isMarkdownImage(text: string): boolean {
    return parseMarkdownImage(text) !== null;
}

/**
 * Creates a heading prefix with the specified level
 * @param level - Heading level (1-6)
 * @returns Heading prefix string (e.g., "# ", "## ")
 */
export function createHeadingPrefix(level: number): string {
    if (level < 1 || level > 6) {
        throw new Error('Heading level must be between 1 and 6');
    }
    return '#'.repeat(level) + ' ';
}

/**
 * Extracts heading level from a line of text
 * @param text - Line text to check
 * @returns Heading level (1-6) or null if not a heading
 */
export function getHeadingLevel(text: string): number | null {
    const match = text.match(/^(#{1,6})\s/);
    return match ? match[1].length : null;
}

/**
 * Checks if a line is an ordered list item
 * @param text - Line text to check
 * @returns True if the line is an ordered list item
 */
export function isOrderedListItem(text: string): boolean {
    return /^\d+\.\s/.test(text);
}

/**
 * Checks if a line is an unordered list item
 * @param text - Line text to check
 * @returns True if the line is an unordered list item
 */
export function isUnorderedListItem(text: string): boolean {
    return /^-\s/.test(text);
}

/**
 * Extracts the number from an ordered list item
 * @param text - Ordered list item text
 * @returns The list number or null if not an ordered list item
 */
export function extractListNumber(text: string): number | null {
    const match = text.match(/^(\d+)\.\s/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Strips Base64 image data from markdown text to save tokens for AI processing.
 * Replaces `![Alt](data:image/...)` with `[Image: Alt]`.
 * @param text - The raw markdown text
 * @returns The sanitized text with Base64 data removed
 */
export function stripBase64Images(text: string): string {
    if (!text) return '';
    // Matches markdown images where the URL starts with "data:"
    // Captures the Alt text ($1) and replaces the whole thing with a placeholder
    return text.replace(/!\[([^\]]*)\]\((data:[^)]+)\)/g, (_match, alt) => {
        return `[Image${alt ? ': ' + alt : ''}]`;
    });
}
