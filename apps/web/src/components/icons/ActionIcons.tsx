// Material Symbols glyphs, inlined — same convention as AccessManager's
// InfoIcon (apps/web has no MUI/icon-font dependency deliberately). Shared
// across every table's Actions column (Launch Cohort, Manage Blog, Manage
// Cohort Users) so icon-button styling stays consistent project-wide.
interface IconProps {
  className?: string;
}

function base(path: string) {
  return function Icon({ className }: IconProps): React.JSX.Element {
    return (
      <svg className={className} width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    );
  };
}

export const ViewIcon = base(
  'M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Z',
);

export const SettingsIcon = base(
  'M555-80h-150q-14 0-24.5-9.5T366-113l-11-88q-13-5-24.5-12T307-228l-83 34q-14 6-28 1t-22-17L96-329q-8-12-5-27t15-24l71-52q-1-7-1-13.5v-27q0-6.5 1-13.5l-71-52q-12-9-15-24t5-27l78-119q7-11 21.5-16t28.5 0l83 34q11-8 23-15t24-12l11-88q2-14 12.5-23.5T404-880h150q14 0 24.5 9.5T590-847l11 88q13 5 24.5 12t22.5 15l83-34q14-6 28-1t22 17l78 119q8 12 5 27t-15 24l-71 52q1 7 1 13.5v27q0 6.5-1 13.5l71 52q12 9 15 24t-5 27l-78 119q-7 11-21.5 16t-28.5 0l-83-34q-11 8-23 15t-24 12l-11 88q-2 14-12.5 23.5T555-80Zm-73-260q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Z',
);

export const EditIcon = base(
  'M200-200h57l391-391-57-57-391 391v57Zm-40 80q-17 0-28.5-11.5T120-160v-97q0-16 6-30.5t17-25.5l505-504q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T772-647L268-143q-11 11-25.5 17t-30.5 6h-97Zm544-528-56-56 56 56Zm-141 85-28-29 57 57-29-28Z',
);

export const DeleteIcon = base(
  'M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z',
);

export const RestoreIcon = base(
  'M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z',
);

export const RemoveIcon = base(
  'm336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56Z',
);

export const PersonIcon = base(
  'M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z',
);

export const LogoutMenuIcon = base(
  'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-56-57 103-103H360v-80h327L584-623l56-57 200 200-200 200Z',
);

export const InfoIcon = base(
  // Moved here from a local copy in AccessManager.tsx (2026-08-23) so every
  // info/tooltip hint uses the shared library. Path is the same verified
  // Material Symbols "info" glyph that was already rendering there.
  'M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
);

export const ImageIcon = base(
  // Material Symbols "image" — empty-state placeholder for logo/avatar
  // uploaders (e.g. the company form's logo upload row).
  'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 220Zm100-240q25 0 42.5-17.5T400-580q0-25-17.5-42.5T340-640q-25 0-42.5 17.5T280-580q0 25 17.5 42.5T340-520ZM200-200v-560 560Z',
);

export const UploadIcon = base(
  // Material Symbols "upload" — file-upload actions (e.g. company logo).
  'M440-320h80v-326l116 116 56-58-192-192-192 192 56 58 116-116v326ZM240-160q-33 0-56.5-23.5T160-240v-80h80v80h480v-80h80v80q0 33-23.5 56.5T800-160H240Z',
);

export const ChevronDownIcon = base(
  // Material Symbols "expand_more"
  'M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z',
);

export const ChevronRightIcon = base(
  // Material Symbols "chevron_right"
  'M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z',
);

export const ReplyIcon = base(
  // Material Symbols "reply"
  'M760-200v-160q0-50-35-85t-85-35H280l144 144-56 56-240-240 240-240 56 56-144 144h360q83 0 141.5 58.5T860-360v160h-100Z',
);

export const ThumbUpIcon = base(
  // Material Symbols "thumb_up"
  'M720-560h120v320H720v-320Zm-440 480q-34 0-58-22t-30-54l-72-380q-4-21 10-38t35-17h195l97-204q7-15 21-24t30-9q19 0 33 13t14 33v10l-38 181h214q30 0 51 21t21 51v57q0 14-4 27t-11 25L880-249q-8 19-25 29t-37 10H280Zm0-80h120v-360H280v360Z',
);

export const CommentIcon = base(
  // Material Symbols "comment" — speech bubble for reply-count toggles.
  'M180-120q-24.75 0-42.375-17.625T120-180v-600q0-24.75 17.625-42.375T180-840h600q24.75 0 42.375 17.625T840-780v600q0 24.75-17.625 42.375T780-120H180Zm60-240h480v-60H240v60Zm0-110h480v-60H240v60Zm0-110h480v-60H240v60Z',
);

export const PdfIcon = base(
  // Material Symbols "picture_as_pdf" — featured-media type: PDF.
  'M360-460h40v-80h40q17 0 28.5-11.5T480-580v-40q0-17-11.5-28.5T440-660h-80v200Zm40-120v-40h40v40h-40Zm120 120h80q17 0 28.5-11.5T640-500v-120q0-17-11.5-28.5T600-660h-80v200Zm40-40v-120h40v120h-40Zm120 40h40v-80h40v-40h-40v-40h40v-40h-80v200ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z',
);

export const VideoIcon = base(
  // Material Symbols "smart_display" — featured-media type: YouTube (no
  // brand logo in Material Symbols, so a generic play-in-frame glyph).
  'm380-300 280-180-280-180v360ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z',
);

export const NoMediaIcon = base(
  // Material Symbols "block" — featured-media type: None.
  'M324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM480-160q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448ZM480-480Z',
);

export const OpenInNewIcon = base(
  // Material Symbols "open_in_new" — outbound link to a third-party page
  // (e.g. a certification's official vendor page).
  'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z',
);
