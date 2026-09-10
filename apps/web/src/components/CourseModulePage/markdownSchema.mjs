import { defaultSchema } from 'rehype-sanitize';

// Captions are semantic elements, not paragraphs inferred from their position.
// All other sanitization rules (including unsafe attributes/URLs) stay intact.
export const courseMarkdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'u', 'figure', 'figcaption'],
};
