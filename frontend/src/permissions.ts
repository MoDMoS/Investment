import type { User } from './types';

export function hasPermission(user: User | null | undefined, code: string) {
  return Boolean(user?.permissions?.includes(code));
}

export function portalLoginPath(next?: string) {
  if (!next) return '/login';
  return `/login?next=${encodeURIComponent(next)}`;
}
