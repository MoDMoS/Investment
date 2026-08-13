import { FormEvent, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { apiError } from '../format';
import type { User } from '../types';

export function LoginPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.2em] text-emerald-800">
          INVESTMENT LEDGER
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{title}</h1>
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
