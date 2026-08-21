import { realmPlugin, addExportVisitor$ } from '@mdxeditor/editor';
import type { LexicalVisitor } from '@mdxeditor/editor';
import { $isLineBreakNode } from 'lexical';

// MDXEditor's built-in LineBreakNode export visitor (core, undocumented)
// serializes a Shift+Enter break as a bare text node with value "\n" --
// neither valid CommonMark hard-break syntax (two trailing spaces, or a
// backslash, before the newline) nor a real mdast `break` node. Two
// consequences: (1) on display, a bare "\n" inside a paragraph is a
// CommonMark "soft break", which renders as a single space -- the break
// visually disappears; (2) on the NEXT edit, MDXEditor's own markdown
// importer parses that same content fresh and finds no real `break` node to
// restore (its import-side MdastBreakVisitor only fires for `type:
// "break"`), so the line break is silently dropped from the editor too.
//
// This registers a higher-priority visitor for the same LineBreakNode type
// that emits a genuine mdast `break` node instead. mdast-util-to-markdown
// then serializes it as real hard-break syntax, which both (a) renders
// correctly under plain CommonMark with no renderer-side workaround needed,
// and (b) round-trips correctly through MDXEditor's own existing
// MdastBreakVisitor on the next open-to-edit.
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
