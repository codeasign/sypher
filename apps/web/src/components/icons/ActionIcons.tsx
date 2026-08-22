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
