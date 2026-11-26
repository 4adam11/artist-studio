// Small line icons that inherit the text colour.
function Icon({ children, size = 20, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const SearchIcon = (props) => <Icon {...props}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Icon>;
export const BagIcon = (props) => <Icon {...props}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Icon>;
export const MenuIcon = (props) => <Icon {...props}><path d="M4 8h16M4 16h16" /></Icon>;
export const CloseIcon = (props) => <Icon {...props}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const ChevronRightIcon = (props) => <Icon {...props}><path d="m9 6 6 6-6 6" /></Icon>;
export const ChevronLeftIcon = (props) => <Icon {...props}><path d="m15 6-6 6 6 6" /></Icon>;
