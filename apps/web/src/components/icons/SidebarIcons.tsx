// Sidebar / navigation icons. Thin wrappers over lucide-react so every
// existing import site keeps working unchanged. Kept as its own module (not
// merged into ActionIcons.tsx) because these render at a lighter 1.75 stroke
// weight to match the sidebar's typography, while row-action icons use 2.
import {
  Book,
  BookOpen,
  Bookmark,
  ClipboardCheck,
  Code,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  Rocket,
  Settings,
  ShieldCheck,
  User,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface IconProps {
  className?: string;
}

function stroke(Glyph: LucideIcon) {
  return function Icon({ className }: IconProps): React.JSX.Element {
    return <Glyph className={className} size={16} strokeWidth={1.75} aria-hidden="true" />;
  };
}

export const DashboardIcon = stroke(LayoutDashboard);
export const LogoutIcon = stroke(LogOut);
export const CoursesIcon = stroke(Book);
export const ManageAccessIcon = stroke(ShieldCheck);
export const TestAccountsIcon = stroke(FlaskConical);
export const LaunchCohortIcon = stroke(Rocket);
export const ManageCohortUsersIcon = stroke(Users);
export const BookmarksIcon = stroke(Bookmark);
export const MockTestIcon = stroke(ClipboardCheck);
export const ProfileIcon = stroke(User);
export const BookIcon = stroke(BookOpen);
export const LockIcon = stroke(Lock);
export const SetupGuidesIcon = stroke(Wrench);
export const ManageCoursesIcon = stroke(GraduationCap);
export const VideoIcon = stroke(Video);
export const PracticeCodingIcon = stroke(Code);
// Was a gear glyph before the Lucide migration; kept as Settings to preserve
// the existing meaning rather than pick a new metaphor mid-migration.
export const ManageBlogIcon = stroke(Settings);
