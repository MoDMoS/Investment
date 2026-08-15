import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-emerald-800 text-white'
      : 'text-stone-600 hover:bg-stone-200/70'
  }`;

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <NavLink
              to="/"
              className="text-sm font-semibold tracking-wide text-emerald-900 hover:underline"
            >
              ← บริการทั้งหมด
            </NavLink>
            <p className="text-xs text-stone-500">
              บันทึกการลงทุน · {user?.name}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/investment" end className={linkClass}>
              ภาพรวม
            </NavLink>
            <NavLink to="/investment/foreign" className={linkClass}>
              หุ้นนอก
            </NavLink>
            <NavLink to="/investment/thai" className={linkClass}>
              หุ้นไทย
            </NavLink>
            <NavLink to="/investment/transfers" className={linkClass}>
              แลกเงิน
            </NavLink>
            <NavLink to="/investment/trades" className={linkClass}>
              ซื้อขายหุ้น
            </NavLink>
            <NavLink to="/investment/dividends" className={linkClass}>
              ปันผล
            </NavLink>
            <NavLink to="/investment/accounts" className={linkClass}>
              บัญชี
            </NavLink>
            <button
              type="button"
              onClick={() => void logout()}
              className="ml-1 rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100"
            >
              ออกจากระบบ
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
