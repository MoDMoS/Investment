import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { DividendsPage } from './pages/Dividends';
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
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/dividends" element={<DividendsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
