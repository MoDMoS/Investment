import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { apiError } from '../format';
import type { User } from '../types';
import { AuthShell, Field } from './Login';

export function RegisterPage() {
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    setSubmitting(true);
    try {
      const next = await api.post<User>('/auth/register', {
        name,
        email,
        password,
        confirmPassword,
      });
      setUser(next);
      navigate('/');
    } catch (err) {
      setError(apiError(err, 'สมัครสมาชิกไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="สมัครสมาชิก" subtitle="แต่ละบัญชีมีพอร์ตของตัวเอง">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="ชื่อ">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="อีเมล">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="รหัสผ่าน (อย่างน้อย 8 ตัว)">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="ยืนยันรหัสผ่าน">
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
          />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
        <p className="text-center text-sm text-stone-500">
          มีบัญชีแล้ว?{' '}
          <Link to="/login" className="font-medium text-emerald-800">
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
