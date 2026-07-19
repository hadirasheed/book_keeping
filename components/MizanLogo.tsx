// Balance-scale mark from the design handoff (navy/white beam, sky-blue pans).
export function MizanLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <line x1="20" y1="6" x2="20" y2="30" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="8" y1="13" x2="32" y2="13" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8" cy="21" r="5.5" stroke="#009cde" strokeWidth="2.4" fill="none" />
      <circle cx="32" cy="21" r="5.5" stroke="#009cde" strokeWidth="2.4" fill="none" />
      <line x1="10" y1="32" x2="30" y2="32" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
