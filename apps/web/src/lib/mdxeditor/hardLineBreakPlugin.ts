import { realmPlugin, addExportVisitor$ } from '@mdxeditor/editor';
import type { LexicalVisitor } from '@mdxeditor/editor';
import { $isLineBreakNode } from 'lexical';

// Ported from apps/app/src/lib/mdxeditor/hardLineBreakPlugin.ts — MDXEditor's
// built-in LineBreakNode export visitor serializes a Shift+Enter break as a
// bare "\n" text node, which is neither valid CommonMark hard-break syntax
// nor a real mdast `break` node, so it visually disappears on render and
// gets silently dropped on the next edit. This registers a higher-priority
// visitor emitting a genuine mdast `break` node instead.
const HardLineBreakExportVisitor: LexicalVisitor = {
  testLexicalNode: $isLineBreakNode,
  priority: 1,
  visitLexicalNode: ({ mdastParent, actions }) => {
    actions.appendToParent(mdastParent, { type: 'break' });
  },
};

export const hardLineBreakPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({ [addExportVisitor$]: HardLineBreakExportVisitor });
  },
});
