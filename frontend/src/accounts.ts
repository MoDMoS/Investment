import { useEffect, useState } from 'react';
import { api } from './api';
import { apiError } from './format';
import type { Account, Market } from './types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setAccounts(await api.get<Account[]>('/accounts'));
  }

  useEffect(() => {
    load().catch((err) => setError(apiError(err, 'โหลดบัญชีไม่สำเร็จ')));
  }, []);

  return { accounts, error, reload: load };
}

export function firstAccountId(accounts: Account[], kind: Market) {
  return accounts.find((row) => row.kind === kind)?.id ?? '';
}
