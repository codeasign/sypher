export interface MarkdownEditorProps {
  /** Initial markdown. The editor is uncontrolled after mount: later changes to this prop are ignored. */
  value: string;
  onChange: (markdown: string) => void;
  /** Shows a live `n/max` counter that turns red when exceeded. Does not block typing; the parent decides whether to block saving. */
  maxLength?: number;
  placeholder?: string;
  /** Read-only while true (e.g. a save is in flight). */
  disabled?: boolean;
  /** CSS min-height of the writing area, e.g. `10rem`. */
  minHeight?: string;
  /** Id of the element that labels this editor, for assistive tech. */
  labelledBy?: string;
}
