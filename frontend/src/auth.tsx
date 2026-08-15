import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import type { User } from './types';

/** ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน */
const IDLE_MS = 60 * 60 * 1000;
const AUTH_NOTICE_KEY = 'auth_notice';
const AUTH_UNAUTHORIZED = 'auth:unauthorized';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function takeAuthNotice() {
  try {
    const message = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (message) sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return message;
  } catch {
    return null;
  }
}

function setAuthNotice(message: string) {
  try {
    sessionStorage.setItem(AUTH_NOTICE_KEY, message);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(user);
  userRef.current = user;

  async function logout(notice?: string) {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore — เคลียร์ฝั่ง client อยู่ดี */
    }
    if (notice) setAuthNotice(notice);
    setUser(null);
  }

  useEffect(() => {
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      if (!userRef.current) return;
      setAuthNotice('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      setUser(null);
    }
    window.addEventListener(AUTH_UNAUTHORIZED, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED, onUnauthorized);
  }, []);

  useEffect(() => {
    if (!user) return;

    let timer = 0;
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void logout('ไม่มีการใช้งานนานเกินไป กรุณาเข้าสู่ระบบใหม่');
      }, IDLE_MS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'visibilitychange'] as const;
    for (const event of events) {
      window.addEventListener(event, bump, { passive: true });
    }
    bump();

    return () => {
      window.clearTimeout(timer);
      for (const event of events) {
        window.removeEventListener(event, bump);
      }
    };
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      logout: () => logout(),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { AUTH_UNAUTHORIZED };
