// Small inline icons (stroke style, inherit the text colour).
function Icon({ children, size = 20, title, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const SearchIcon = (props) => <Icon {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const BagIcon = (props) => <Icon {...props}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Icon>;
export const MenuIcon = (props) => <Icon {...props}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const CloseIcon = (props) => <Icon {...props}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const ShareIcon = (props) => <Icon {...props}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6h14v-6" /></Icon>;
export const TruckIcon = (props) => <Icon {...props}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></Icon>;
export const HandIcon = (props) => <Icon {...props}><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-6.5a1.5 1.5 0 0 1 3 0V12m0-5a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 13.6a1.5 1.5 0 0 1 2.5-1.7L8 14" /></Icon>;
export const LockIcon = (props) => <Icon {...props}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
export const ChevronIcon = (props) => <Icon {...props}><path d="m9 6 6 6-6 6" /></Icon>;
export const ChevronLeftIcon = (props) => <Icon {...props}><path d="m15 6-6 6 6 6" /></Icon>;

export function HeartIcon({ filled, ...props }) {
  return (
    <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </Icon>
  );
}
