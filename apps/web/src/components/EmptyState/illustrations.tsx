import type { ReactNode } from 'react';

// Empty-state drawings. Same visual language as the original Bookmarks /
// Getting Started illustrations: 220x220, grey outlined object, one indigo
// accent, a lavender sparkle and a couple of light-grey dots.
//
// Shapes are filled with the card colour (not hard-coded white) so they sit
// correctly on the dark theme too.
const STROKE = '#9CA3AF';
const LINE = '#D1D5DB';
const ACCENT = '#6366F1';
const SOFT = '#C4B5FD';
const FILL = 'var(--ifm-card-background-color, #ffffff)';

const shape = { fill: FILL } as const;

function Sparkle({ x, y }: { x: number; y: number }): React.JSX.Element {
  return (
    <path
      d={`M${x} ${y - 10}L${x + 3} ${y - 3}L${x + 10} ${y}L${x + 3} ${y + 3}L${x} ${y + 10}L${x - 3} ${y + 3}L${x - 10} ${y}L${x - 3} ${y - 3}Z`}
      fill={SOFT}
    />
  );
}

function Dot({ x, y }: { x: number; y: number }): React.JSX.Element {
  return <circle cx={x} cy={y} r={5} fill={LINE} />;
}

export type EmptyIllustrationName =
  | 'code'
  | 'videos'
  | 'posts'
  | 'people'
  | 'exam'
  | 'courses'
  | 'search'
  | 'folder'
  | 'pick'
  | 'bookmarkCourses'
  | 'bookmarkModules';

function CodeArt(): React.JSX.Element {
  return (
    <>
      <rect x="44" y="58" width="132" height="108" rx="12" style={shape} stroke={STROKE} strokeWidth="5" />
      <path d="M44 84H176" stroke={LINE} strokeWidth="4" />
      <circle cx="60" cy="71" r="3.5" fill={LINE} />
      <circle cx="72" cy="71" r="3.5" fill={LINE} />
      <circle cx="84" cy="71" r="3.5" fill={LINE} />
      <path d="M84 104L68 120L84 136" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M136 104L152 120L136 136" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M118 100L104 140" stroke={SOFT} strokeWidth="5" strokeLinecap="round" />
      {/* bookmark ribbon hanging off the window's top-right corner */}
      <path d="M146 46H170V96L158 88L146 96V46Z" fill={ACCENT} />
      <Sparkle x={36} y={52} />
      <Dot x={34} y={148} />
      <Dot x={188} y={150} />
    </>
  );
}

function VideosArt(): React.JSX.Element {
  return (
    <>
      <rect x="40" y="56" width="140" height="94" rx="12" style={shape} stroke={STROKE} strokeWidth="5" />
      <circle cx="110" cy="103" r="24" fill={ACCENT} />
      <path d="M103 91L125 103L103 115Z" fill="#FFFFFF" />
      {/* scrubber */}
      <rect x="40" y="168" width="140" height="6" rx="3" fill={LINE} />
      <rect x="40" y="168" width="54" height="6" rx="3" fill={SOFT} />
      <Sparkle x={184} y={50} />
      <Dot x={32} y={64} />
      <Dot x={188} y={142} />
    </>
  );
}

function PostsArt(): React.JSX.Element {
  return (
    <>
      <rect x="58" y="38" width="104" height="142" rx="10" style={shape} stroke={STROKE} strokeWidth="5" />
      <rect x="74" y="56" width="50" height="10" rx="5" fill={ACCENT} />
      <path d="M74 88H146M74 104H146M74 120H126" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <rect x="74" y="136" width="72" height="28" rx="6" fill={SOFT} />
      {/* pencil */}
      <path d="M150 150L174 126L186 138L162 162L146 166Z" style={shape} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M168 132L180 144" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" />
      <Sparkle x={38} y={62} />
      <Dot x={34} y={150} />
    </>
  );
}

function PeopleArt(): React.JSX.Element {
  return (
    <>
      {/* two people behind */}
      <circle cx="62" cy="96" r="14" style={shape} stroke={STROKE} strokeWidth="5" />
      <path d="M36 162C36 142 47 130 62 130C77 130 88 142 88 162Z" style={shape} stroke={STROKE} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="158" cy="96" r="14" style={shape} stroke={STROKE} strokeWidth="5" />
      <path d="M132 162C132 142 143 130 158 130C173 130 184 142 184 162Z" style={shape} stroke={STROKE} strokeWidth="5" strokeLinejoin="round" />
      {/* one in front, in the accent colour */}
      <circle cx="110" cy="84" r="20" style={shape} stroke={ACCENT} strokeWidth="5" />
      <path d="M72 170C72 142 88 122 110 122C132 122 148 142 148 170Z" style={shape} stroke={ACCENT} strokeWidth="5" strokeLinejoin="round" />
      <Sparkle x={182} y={50} />
      <Dot x={38} y={64} />
      <Dot x={188} y={178} />
    </>
  );
}

function ExamArt(): React.JSX.Element {
  return (
    <>
      <rect x="54" y="48" width="112" height="128" rx="12" style={shape} stroke={STROKE} strokeWidth="5" />
      <rect x="88" y="38" width="44" height="20" rx="6" fill={ACCENT} />
      {[80, 108, 136].map((y, i) => (
        <g key={y}>
          <rect x="72" y={y} width="16" height="16" rx="4" stroke={i < 2 ? ACCENT : LINE} strokeWidth="4" />
          {i < 2 && <path d={`M75 ${y + 8}L79 ${y + 12}L86 ${y + 4}`} stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          <path d={`M98 ${y + 8}H148`} stroke={LINE} strokeWidth="5" strokeLinecap="round" />
        </g>
      ))}
      <Sparkle x={184} y={66} />
      <Dot x={34} y={90} />
      <Dot x={188} y={160} />
    </>
  );
}

function CoursesArt(): React.JSX.Element {
  return (
    <>
      {/* a stack of three books */}
      <rect x="46" y="136" width="128" height="28" rx="6" style={shape} stroke={STROKE} strokeWidth="5" />
      <path d="M64 136V164" stroke={LINE} strokeWidth="4" />
      <rect x="56" y="106" width="112" height="28" rx="6" fill={ACCENT} />
      <path d="M74 106V134" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="4" />
      <g transform="rotate(-8 110 84)">
        <rect x="52" y="70" width="112" height="28" rx="6" style={shape} stroke={STROKE} strokeWidth="5" />
        <path d="M70 70V98" stroke={LINE} strokeWidth="4" />
      </g>
      <Sparkle x={184} y={60} />
      <Dot x={34} y={84} />
      <Dot x={188} y={150} />
    </>
  );
}

function SearchArt(): React.JSX.Element {
  return (
    <>
      <circle cx="98" cy="96" r="44" style={shape} stroke={STROKE} strokeWidth="5" />
      <path d="M78 84H118M78 98H118M78 112H104" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M130 130L168 168" stroke={ACCENT} strokeWidth="10" strokeLinecap="round" />
      <Sparkle x={176} y={60} />
      <Dot x={38} y={150} />
      <Dot x={186} y={120} />
    </>
  );
}

function FolderArt(): React.JSX.Element {
  return (
    <>
      <path
        d="M46 74C46 67.4 51.4 62 58 62H90L100 74H162C168.6 74 174 79.4 174 86V152C174 158.6 168.6 164 162 164H58C51.4 164 46 158.6 46 152V74Z"
        style={shape}
        stroke={STROKE}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M46 84H174" stroke={LINE} strokeWidth="4" />
      <rect x="76" y="94" width="52" height="54" rx="6" style={shape} stroke={ACCENT} strokeWidth="4" />
      <path d="M87 108H117M87 120H117M87 132H108" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
      <Sparkle x={158} y={46} />
      <Dot x={56} y={46} />
    </>
  );
}

// "Pick one from the list": a list with one row highlighted and a pointer on it.
function PickArt(): React.JSX.Element {
  return (
    <>
      <rect x="44" y="52" width="132" height="116" rx="12" style={shape} stroke={STROKE} strokeWidth="5" />
      <path d="M62 78H140" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <rect x="56" y="98" width="108" height="26" rx="8" fill={SOFT} />
      <path d="M68 111H126" stroke={ACCENT} strokeWidth="5" strokeLinecap="round" />
      <path d="M62 146H124" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      {/* pointer resting on the highlighted row */}
      <path d="M142 114L142 138L148.5 132L153 142L158 140L153.5 130L162 130Z" fill={ACCENT} style={{ stroke: FILL }} strokeWidth="2.5" strokeLinejoin="round" />
      <Sparkle x={184} y={50} />
      <Dot x={34} y={72} />
      <Dot x={188} y={172} />
    </>
  );
}

// The two original Bookmarks drawings (Courses / Modules tabs), moved here
// unchanged apart from the fill now following the card colour.
function BookmarkCoursesArt(): React.JSX.Element {
  return (
    <>
      <path d="M110 65C96 52 78 48 55 52V155C78 151 96 155 110 168V65Z" style={shape} stroke={STROKE} strokeWidth="5" strokeLinejoin="round" />
      <path d="M110 65C124 52 142 48 165 52V155C142 151 124 155 110 168V65Z" style={shape} stroke={STROKE} strokeWidth="5" strokeLinejoin="round" />
      <path d="M143 62H168V112L155.5 104L143 112V62Z" fill={ACCENT} />
      <path d="M68 78H94M68 94H94M68 110H88" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M126 125H151M126 141H151" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M43 116V143L50 139L57 143V116" stroke={SOFT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <Sparkle x={178} y={128} />
    </>
  );
}

function BookmarkModulesArt(): React.JSX.Element {
  return (
    <>
      <rect x="52" y="48" width="116" height="124" rx="10" style={shape} stroke={STROKE} strokeWidth="5" />
      <circle cx="82" cy="78" r="12" stroke={ACCENT} strokeWidth="4" />
      <path d="M78 78L81 81L87 75" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M132 62H157V113L144.5 105L132 113V62Z" fill={ACCENT} />
      <path d="M68 106H132M68 121H144M68 136H124" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <rect x="68" y="151" width="76" height="6" rx="3" fill="#E5E7EB" />
      <rect x="68" y="151" width="28" height="6" rx="3" fill={SOFT} />
      <Dot x={42} y={76} />
      <Dot x={180} y={142} />
      <Sparkle x={177} y={88} />
    </>
  );
}

export const ILLUSTRATIONS: Record<EmptyIllustrationName, () => ReactNode> = {
  code: CodeArt,
  videos: VideosArt,
  posts: PostsArt,
  people: PeopleArt,
  exam: ExamArt,
  courses: CoursesArt,
  search: SearchArt,
  folder: FolderArt,
  pick: PickArt,
  bookmarkCourses: BookmarkCoursesArt,
  bookmarkModules: BookmarkModulesArt,
};
