export const PLAYGROUND_IMAGE_SRC = "/moondown-sample.svg";

export const BASIC_PLAYGROUND_DOC = `# Moondown Playground

Try these interactions:

- Select text and use the bubble menu.
- Type \`/\` to open slash command.
- Insert a table using slash command and click the table controls.
- Add an image: ![Moondown sample](${PLAYGROUND_IMAGE_SRC})
- Mermaid code block preview:

\`\`\`mermaid
flowchart TD
  Start --> Edit
  Edit --> Preview
\`\`\`

- LaTeX code block preview:

\`\`\`latex
\\int_0^1 x^2 dx = \\frac{1}{3}
\`\`\`

> Blockquote level 1
> > Blockquote level 2

\`Inline code\`, ==highlight==, ~underline~, ~~strikethrough~~.
`;

export const COMPLETE_MARKDOWN_TEST_DOC = `# Full Markdown Test

## Heading 2

### Heading 3

#### Heading 4

Plain text with **bold**, *italic*, ***bold italic***, ~~strikethrough~~, ~underline~, ==highlight==, and nested **bold with *italic inside***.

Inline code: \`const sum = (a, b) => a + b;\`

Inline link: [Moondown](https://example.com/moondown)

Reference link: [Reference target][ref-target]

[ref-target]: https://example.com/reference "Reference Title"

## Lists

1. Ordered item 1
2. Ordered item 2
3. Ordered item 3
   1. Nested ordered 3.1
   2. Nested ordered 3.2

- Unordered item A
  - Nested unordered B
    - Deep nested unordered C

## Quote and Rule

> Primary quote line
> > Nested quote line
> > with multiple lines.

---

## Table

| Feature | Status | Notes |
| :--- | :---: | ---: |
| Core API | Ready | Stable facade + runtime |
| Plugin API | Ready | Setup + lifecycle + slash commands |
| Mermaid | Ready | Widget rendering |
| LaTeX | Ready | KaTeX rendering |
| Inline styles | Ready | **bold**, *italic*, \`code\`, ==mark== |

## Code Blocks

\`\`\`ts
type User = { id: string; name: string };

export function formatUser(user: User): string {
  return \`\${user.id} - \${user.name}\`;
}
\`\`\`

\`\`\`json
{
  "name": "moondown",
  "features": ["markdown", "widgets", "theme-color"],
  "stable": true
}
\`\`\`

\`\`\`plain
Unknown fenced code should keep the normal fencedCode background.
\`\`\`

## Mermaid

\`\`\`mermaid
flowchart LR
  Draft --> Review
  Review --> Approve
  Approve --> Publish
\`\`\`

## LaTeX

\`\`\`latex
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
\`\`\`

## Image

![Sample image](${PLAYGROUND_IMAGE_SRC})

## Footnotes

Footnote reference[^1] and another reference[^note].

[^1]: This is the first footnote.
[^note]: This is the named footnote.
`;
