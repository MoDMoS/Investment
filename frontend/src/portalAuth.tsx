import { useEffect } from 'react';

/** Redirect to MoDMoS Portal login (same host, path /login). */
export function PortalAuthRedirect({ mode }: { mode: 'login' | 'register' }) {
  useEffect(() => {
    const next = encodeURIComponent(window.location.href);
    const path = mode === 'register' ? '/register' : '/login';
    window.location.replace(`${path}?next=${next}`);
  }, [mode]);

  return <p className="p-8 text-center text-stone-500">กำลังไปหน้าเข้าสู่ระบบ...</p>;
}

export function redirectToPortalLogin(notice?: string) {
  if (notice) {
    try {
      sessionStorage.setItem('auth_notice', notice);
    } catch {
      /* ignore */
    }
  }
  const next = encodeURIComponent(window.location.href);
  window.location.assign(`/login?next=${next}`);
}
