import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function TopBar({
  title = 'Personal Tools',
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (user?.name?.trim()?.charAt(0) || '?').toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/favicon.png" alt="" className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">{title}</p>
            <p className="truncate text-xs text-stone-500">
              {subtitle ?? user?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title="โปรไฟล์"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
                {initial}
              </span>
              <span className="hidden max-w-32 truncate text-sm text-stone-700 sm:inline">
                {user?.name}
              </span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-stone-100 px-3 py-2">
                  <p className="truncate text-sm font-medium text-stone-900">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-stone-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/profile');
                  }}
                >
                  จัดการโปรไฟล์
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : null}
          </div>

          <Link
            to="/"
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            title="บริการทั้งหมด"
            aria-label="บริการทั้งหมด"
          >
            <AppsIcon />
          </Link>
        </div>
      </div>
    </header>
  );
}

function AppsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <circle cx="5" cy="5" r="1.6" />
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="19" cy="5" r="1.6" />
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
      <circle cx="5" cy="19" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
      <circle cx="19" cy="19" r="1.6" />
    </svg>
  );
}
