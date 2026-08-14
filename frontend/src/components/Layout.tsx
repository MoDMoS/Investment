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
            <p className="text-sm font-semibold tracking-wide text-emerald-900">
              บันทึกการลงทุน
            </p>
            <p className="text-xs text-stone-500">{user?.name}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              ภาพรวม
            </NavLink>
            <NavLink to="/foreign" className={linkClass}>
              หุ้นนอก
            </NavLink>
            <NavLink to="/thai" className={linkClass}>
              หุ้นไทย
            </NavLink>
            <NavLink to="/transfers" className={linkClass}>
              แลกเงิน
            </NavLink>
            <NavLink to="/trades" className={linkClass}>
              ซื้อขายหุ้น
            </NavLink>
            <NavLink to="/dividends" className={linkClass}>
              ปันผล
            </NavLink>
            <NavLink to="/accounts" className={linkClass}>
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
