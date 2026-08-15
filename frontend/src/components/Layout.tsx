import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';

const STORAGE_KEY = 'investment-nav-open';

const navItems: {
  to: string;
  end?: boolean;
  label: string;
  icon: ReactNode;
}[] = [
  { to: '/investment', end: true, label: 'ภาพรวม', icon: <OverviewIcon /> },
  { to: '/investment/foreign', label: 'หุ้นนอก', icon: <GlobeIcon /> },
  { to: '/investment/thai', label: 'หุ้นไทย', icon: <TempleIcon /> },
  { to: '/investment/reports', label: 'สรุป', icon: <ChartIcon /> },
  { to: '/investment/history', label: 'ประวัติ', icon: <HistoryIcon /> },
  { to: '/investment/transfers', label: 'แลกเงิน', icon: <ExchangeIcon /> },
  { to: '/investment/trades', label: 'ซื้อขายหุ้น', icon: <TradeIcon /> },
  { to: '/investment/dividends', label: 'ปันผล', icon: <DividendIcon /> },
  { to: '/investment/accounts', label: 'บัญชี', icon: <WalletIcon /> },
];

function readOpen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

const linkClass = (open: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg text-sm font-medium transition ${
      open ? 'px-3 py-2' : 'justify-center px-2 py-2.5'
    } ${
      isActive
        ? 'bg-emerald-800 text-white'
        : 'text-stone-600 hover:bg-stone-200/70'
    }`;

export function Layout() {
  const [open, setOpen] = useState(readOpen);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="บันทึกการลงทุน" />

      <div className="flex min-h-0 flex-1">
        <aside
          className={`sticky top-14 flex h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-stone-200 bg-white/90 backdrop-blur transition-[width] duration-200 ${
            open ? 'w-56' : 'w-16'
          }`}
        >
          <div
            className={`flex items-center border-b border-stone-200 px-2 py-2 ${
              open ? 'justify-between' : 'justify-center'
            }`}
          >
            {open ? (
              <p className="px-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                เมนู
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
              title={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            >
              {open ? <CollapseIcon /> : <MenuIcon />}
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={linkClass(open)}
                title={item.label}
              >
                <span className="shrink-0">{item.icon}</span>
                {open ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function MenuIcon() {
  return (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}

function CollapseIcon() {
  return (
    <Icon>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  );
}

function OverviewIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

function GlobeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </Icon>
  );
}

function TempleIcon() {
  return (
    <Icon>
      <path d="M4 20h16M6 20V10l6-5 6 5v10M9 20v-4h6v4" />
    </Icon>
  );
}

function ChartIcon() {
  return (
    <Icon>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16v-5M12 16V8M16 16v-8" />
    </Icon>
  );
}

function HistoryIcon() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 109-9" />
      <path d="M3 5v4h4M12 7v5l3 2" />
    </Icon>
  );
}

function ExchangeIcon() {
  return (
    <Icon>
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </Icon>
  );
}

function TradeIcon() {
  return (
    <Icon>
      <path d="M4 16l5-5 3 3 7-7" />
      <path d="M14 7h5v5" />
    </Icon>
  );
}

function DividendIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.5c.6-1 1.5-1.5 2.5-1.5s2 .7 2 1.8-1 1.7-2.5 2.2-2.5.9-2.5 2.2 1 1.8 2.5 1.8 1.9-.5 2.5-1.5" />
    </Icon>
  );
}

function WalletIcon() {
  return (
    <Icon>
      <path d="M3 7h15a3 3 0 013 3v7a3 3 0 01-3 3H6a3 3 0 01-3-3V7z" />
      <path d="M3 7l2.2-2.5A2 2 0 016.7 4H16" />
      <circle cx="16.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}
