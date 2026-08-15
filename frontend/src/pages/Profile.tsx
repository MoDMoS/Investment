import { FormEvent, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { TopBar } from '../components/TopBar';
import { apiError } from '../format';
import type { User } from '../types';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileMsg('');
    setProfileError('');
    setProfileSaving(true);
    try {
      const next = await api.patch<User>('/auth/profile', { name });
      setUser(next);
      setProfileMsg('บันทึกชื่อแล้ว');
    } catch (err) {
      setProfileError(apiError(err, 'บันทึกโปรไฟล์ไม่สำเร็จ'));
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    setPasswordSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('เปลี่ยนรหัสผ่านแล้ว');
    } catch (err) {
      setPasswordError(apiError(err, 'เปลี่ยนรหัสผ่านไม่สำเร็จ'));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar title="โปรไฟล์" subtitle={user?.email} />
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">โปรไฟล์</h1>
          <p className="mt-1 text-sm text-stone-500">
            แก้ไขชื่อที่แสดง และเปลี่ยนรหัสผ่าน
          </p>
        </div>

        <form onSubmit={saveProfile} className="card space-y-4">
          <h2 className="text-lg font-semibold">ข้อมูลบัญชี</h2>
          <label className="block">
            <span className="label">อีเมล</span>
            <input className="input bg-stone-50" value={user?.email ?? ''} disabled />
          </label>
          <label className="block">
            <span className="label">ชื่อที่แสดง</span>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {profileError ? <p className="text-sm text-red-700">{profileError}</p> : null}
          {profileMsg ? <p className="text-sm text-emerald-800">{profileMsg}</p> : null}
          <button type="submit" className="btn-primary" disabled={profileSaving}>
            {profileSaving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
          </button>
        </form>

        <form onSubmit={savePassword} className="card space-y-4">
          <h2 className="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2>
          <label className="block">
            <span className="label">รหัสผ่านปัจจุบัน</span>
            <input
              type="password"
              className="input"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">รหัสผ่านใหม่</span>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">ยืนยันรหัสผ่านใหม่</span>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
          {passwordMsg ? <p className="text-sm text-emerald-800">{passwordMsg}</p> : null}
          <button type="submit" className="btn-primary" disabled={passwordSaving}>
            {passwordSaving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </main>
    </div>
  );
}
