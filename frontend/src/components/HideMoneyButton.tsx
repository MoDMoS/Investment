import { usePrivacy } from '../privacy';

export function HideMoneyButton() {
  const { hidden, toggle } = usePrivacy();

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
      aria-pressed={hidden}
      aria-label={hidden ? 'แสดงยอดเงิน' : 'ซ่อนยอดเงิน'}
      title={hidden ? 'แสดงยอดเงิน' : 'ซ่อนยอดเงิน'}
    >
      {hidden ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2.5 2.5 0 0 0 12 14.5a2.5 2.5 0 0 0 2.4-1.9" />
      <path d="M6.7 6.8C4.4 8.3 2.5 12 2.5 12s3.5 7 9.5 7c1.8 0 3.4-.5 4.8-1.3" />
      <path d="M17.2 14.8C19.4 13.3 21.5 12 21.5 12s-3.5-7-9.5-7c-.7 0-1.3.1-1.9.2" />
    </svg>
  );
}
