import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { AccountsPage } from './pages/Accounts';
import { DashboardPage } from './pages/Dashboard';
import { DashboardForeignPage } from './pages/DashboardForeign';
import { DashboardThaiPage } from './pages/DashboardThai';
import { DividendsPage } from './pages/Dividends';
import { HistoryPage } from './pages/History';
import { PortalAuthRedirect } from './portalAuth';
import { ReportsPage } from './pages/Reports';
import { TradesPage } from './pages/Trades';
import { TransfersPage } from './pages/Transfers';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) {
    return <p className="p-8 text-center text-stone-500">กำลังโหลด...</p>;
  }
  if (!user) return <PortalAuthRedirect mode="login" />;
  return <Outlet />;
}

function PortalProfileRedirect() {
  useEffect(() => {
    window.location.replace('/profile');
  }, []);
  return <p className="p-8 text-center text-stone-500">กำลังไปหน้าโปรไฟล์...</p>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<PortalAuthRedirect mode="login" />} />
      <Route path="/register" element={<PortalAuthRedirect mode="register" />} />
      <Route path="/profile" element={<PortalProfileRedirect />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Navigate to="/investment" replace />} />
        <Route path="/investment" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="foreign" element={<DashboardForeignPage />} />
          <Route path="thai" element={<DashboardThaiPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="history" element={<HistoryPage />} />
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
      <Route path="*" element={<Navigate to="/investment" replace />} />
    </Routes>
  );
}
