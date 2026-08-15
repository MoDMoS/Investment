import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { AccountsPage } from './pages/Accounts';
import { DashboardPage } from './pages/Dashboard';
import { DashboardForeignPage } from './pages/DashboardForeign';
import { DashboardThaiPage } from './pages/DashboardThai';
import { DividendsPage } from './pages/Dividends';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { TradesPage } from './pages/Trades';
import { TransfersPage } from './pages/Transfers';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="p-8 text-center text-stone-500">กำลังโหลด...</p>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/investment" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="foreign" element={<DashboardForeignPage />} />
          <Route path="thai" element={<DashboardThaiPage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="trades" element={<TradesPage />} />
          <Route path="dividends" element={<DividendsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
        </Route>
      </Route>
      <Route path="/foreign" element={<Navigate to="/investment/foreign" replace />} />
      <Route path="/thai" element={<Navigate to="/investment/thai" replace />} />
      <Route path="/transfers" element={<Navigate to="/investment/transfers" replace />} />
      <Route path="/trades" element={<Navigate to="/investment/trades" replace />} />
      <Route path="/dividends" element={<Navigate to="/investment/dividends" replace />} />
      <Route path="/accounts" element={<Navigate to="/investment/accounts" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
