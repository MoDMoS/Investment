import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { takeAuthNotice, useAuth } from '../auth';
import { apiError } from '../format';
import type { User } from '../types';

export function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const message = takeAuthNotice();
    if (message) setNotice(message);
  }, []);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const next = await api.post<User>('/auth/login', { email, password });
      setUser(next);
      navigate('/');
    } catch (err) {
      setError(apiError(err, 'เข้าสู่ระบบไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="เข้าสู่ระบบ" subtitle="บันทึกเงินออกประเทศและการซื้อหุ้นสหรัฐ">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="อีเมล">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="รหัสผ่าน">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>
        {notice ? <p className="text-sm text-amber-800">{notice}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
        <p className="text-center text-sm text-stone-500">
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" className="font-medium text-emerald-800">
            สมัครสมาชิก
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <div className="mb-5 flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            className="h-11 w-11 rounded-xl shadow-md"
          />
          <div>
            <p className="font-brand text-xs font-bold tracking-[0.18em] text-emerald-800">
              MoDMoS
            </p>
            <p className="text-xs text-stone-500">Investment Ledger</p>
          </div>
        </div>
        <h1 className="font-brand text-2xl font-bold tracking-tight text-stone-900">
          {title}
        </h1>
        <p className="mt-1 mb-6 text-sm text-stone-500">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-stone-600">{label}</span>
      {children}
    </label>
  );
}
