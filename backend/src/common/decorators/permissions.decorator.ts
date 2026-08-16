import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/** Require every listed permission. Empty array = authenticated only (no service check). */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const AUTH_ONLY_KEY = 'authOnly';

/** JWT required, but skip default service:investment check. */
export const AuthOnly = () => SetMetadata(AUTH_ONLY_KEY, true);
