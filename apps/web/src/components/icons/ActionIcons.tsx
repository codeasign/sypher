// Table/row action icons. Thin wrappers over lucide-react so every existing
// import site (`ViewIcon`, `EditIcon`, ...) keeps working unchanged while the
// glyphs themselves come from Lucide. Shared across every table's Actions
// column (Launch Cohort, Manage Blog, Manage Cohort Users, ...) so icon-button
// styling stays consistent project-wide.
//
// Lucide icons are stroke-based and inherit `currentColor`, so the existing
// "bare theme-tinted glyph, no background" convention (.actionBtn + verb
// modifier) applies without any CSS change.
import {
  Ban,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FilePlus,
  Flag,
  FileText,
  Image as ImageGlyph,
  Info,
  KeyRound,
  LogOut,
  Mail,
  Maximize2,
  MessageSquare,
  Minimize2,
  MonitorPlay,
  Pencil,
  Plus,
  Reply,
  RotateCcw,
  Settings,
  Sparkles,
  ThumbsUp,
  Timer,
  Trash2,
  Upload,
  User,
  UserMinus,
  UserPlus,
  Users,
  Eye,
  type LucideIcon,
} from 'lucide-react';

interface IconProps {
  className?: string;
}

function wrap(Glyph: LucideIcon) {
  return function Icon({ className }: IconProps): React.JSX.Element {
    return <Glyph className={className} size={16} strokeWidth={2} aria-hidden="true" />;
  };
}

export const ViewIcon = wrap(Eye);
export const SettingsIcon = wrap(Settings);
export const EditIcon = wrap(Pencil);
export const AddIcon = wrap(Plus);
export const DeleteIcon = wrap(Trash2);
export const RestoreIcon = wrap(RotateCcw);
export const RemoveIcon = wrap(UserMinus);
export const PersonIcon = wrap(User);
export const OpenInFullIcon = wrap(Maximize2);
export const CloseFullscreenIcon = wrap(Minimize2);
export const LogoutMenuIcon = wrap(LogOut);
export const TimerIcon = wrap(Timer);
export const KeyIcon = wrap(KeyRound);

// Shared by every info/tooltip hint (AccessManager's InfoIcon originally).
export const InfoIcon = wrap(Info);

export const MailIcon = wrap(Mail);

// Friendly, low-key "psst, here's an idea" glyph (e.g. the profile page's
// casual Go Pro nudge) — never used for a hard-sell CTA.
export const SparkleIcon = wrap(Sparkles);

// Empty-state placeholder for logo/avatar uploaders (e.g. the company form's
// logo upload row).
export const ImageIcon = wrap(ImageGlyph);

// File-upload actions (e.g. company logo).
export const UploadIcon = wrap(Upload);

export const ChevronDownIcon = wrap(ChevronDown);
export const ChevronRightIcon = wrap(ChevronRight);
export const ReplyIcon = wrap(Reply);
export const ThumbUpIcon = wrap(ThumbsUp);
export const ReportIcon = wrap(Flag);

// Speech bubble for reply-count toggles.
export const CommentIcon = wrap(MessageSquare);

// Featured-media types (blog post editor): PDF / YouTube / None.
export const PdfIcon = wrap(FileText);
export const VideoIcon = wrap(MonitorPlay);
export const NoMediaIcon = wrap(Ban);

// Outbound link to a third-party page (e.g. a certification's vendor page).
export const OpenInNewIcon = wrap(ExternalLink);

// A cohort of learners / add a member to a cohort or group.
export const GroupsIcon = wrap(Users);
export const GroupAddIcon = wrap(UserPlus);

// Create a new blog post.
export const PostAddIcon = wrap(FilePlus);

// An open book. Marks course groups in the Bookmarks lesson menu.
export const MenuBookIcon = wrap(BookOpen);
