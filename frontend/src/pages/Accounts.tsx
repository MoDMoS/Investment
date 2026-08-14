import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { downloadCsv, downloadJson } from '../download';
import { apiError, todayIso } from '../format';
import { useMoneyFmt } from '../privacy';
import type { Account, CashEntry, ExportPayload, Market } from '../types';

type AccountForm = { name: string; kind: Market };
type CashForm = {
  accountId: string;
  date: string;
  direction: 'in' | 'out';
  amount: string;
  note: string;
};

const emptyCash = (accountId = ''): CashForm => ({
  accountId,
  date: todayIso(),
  direction: 'in',
  amount: '',
  note: '',
});

export function AccountsPage() {
  const money = useMoneyFmt();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [accountForm, setAccountForm] = useState<AccountForm>({
    name: '',
    kind: 'foreign',
  });
  const [cashForm, setCashForm] = useState<CashForm>(emptyCash());
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingCashId, setEditingCashId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [nextAccounts, nextEntries] = await Promise.all([
      api.get<Account[]>('/accounts'),
      api.get<CashEntry[]>('/cash-entries'),
    ]);
    setAccounts(nextAccounts);
    setEntries(nextEntries);
    setCashForm((prev) =>
      prev.accountId ? prev : emptyCash(nextAccounts[0]?.id ?? ''),
    );
  }

  useEffect(() => {
    load().catch((err) => setError(apiError(err, 'โหลดบัญชีไม่สำเร็จ')));
  }, []);

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingAccountId) {
        await api.patch(`/accounts/${editingAccountId}`, { name: accountForm.name });
      } else {
        await api.post('/accounts', accountForm);
      }
      setAccountForm({ name: '', kind: 'foreign' });
      setEditingAccountId(null);
      await load();
    } catch (err) {
      setError(apiError(err, 'บันทึกบัญชีไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAccount(id: string) {
    if (!confirm('ลบบัญชีนี้?')) return;
    try {
      await api.delete(`/accounts/${id}`);
      await load();
    } catch (err) {
      setError(apiError(err, 'ลบบัญชีไม่สำเร็จ'));
    }
  }

  async function saveCash(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const body = {
      accountId: cashForm.accountId,
      date: cashForm.date,
      direction: cashForm.direction,
      amount: Number(cashForm.amount),
      note: cashForm.note,
    };
    try {
      if (editingCashId) {
        await api.patch(`/cash-entries/${editingCashId}`, body);
      } else {
        await api.post('/cash-entries', body);
      }
      setCashForm(emptyCash(cashForm.accountId));
      setEditingCashId(null);
      await load();
    } catch (err) {
      setError(apiError(err, 'บันทึกเงินโบรกไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  }

  async function removeCash(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    await api.delete(`/cash-entries/${id}`);
    if (editingCashId === id) {
      setEditingCashId(null);
      setCashForm(emptyCash(accounts[0]?.id ?? ''));
    }
    await load();
  }

  async function exportData(kind: 'json' | 'csv') {
    setError('');
    try {
      const data = await api.get<ExportPayload>('/export');
      const stamp = data.exportedAt.slice(0, 10);
      if (kind === 'json') {
        downloadJson(`investment-${stamp}.json`, data);
        return;
      }
      downloadCsv(`accounts-${stamp}.csv`, ['id', 'name', 'kind'], data.accounts);
      downloadCsv(
        `transfers-${stamp}.csv`,
        ['id', 'accountId', 'date', 'direction', 'thbAmount', 'usdAmount', 'rate', 'feeThb', 'feeUsd', 'note'],
        data.transfers,
      );
      downloadCsv(
        `trades-${stamp}.csv`,
        ['id', 'accountId', 'date', 'ticker', 'market', 'side', 'shares', 'priceUsd', 'feeUsd', 'note'],
        data.trades,
      );
      downloadCsv(
        `dividends-${stamp}.csv`,
        ['id', 'accountId', 'date', 'ticker', 'shares', 'grossUsd', 'taxUsd', 'netUsd', 'note'],
        data.dividends,
      );
      downloadCsv(
        `cash-entries-${stamp}.csv`,
        ['id', 'accountId', 'date', 'direction', 'amount', 'note'],
        data.cashEntries,
      );
    } catch (err) {
      setError(apiError(err, 'ส่งออกไม่สำเร็จ'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">บัญชี / โบรก</h1>
            <HideMoneyButton />
          </div>
          <p className="text-sm text-stone-500">
            แยกโบรกไทยกับโบรกนอก เงินเข้า–ออกโบรกไม่ใช่รายการแลกเงินข้ามประเทศ
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => void exportData('json')}>
            ส่งออก JSON
          </button>
          <button type="button" className="btn-ghost" onClick={() => void exportData('csv')}>
            ส่งออก CSV
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>ชื่อบัญชี</th>
              <th>ประเภท</th>
              <th className="text-right">เงินสด</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{row.name}</td>
                <td>{row.kind === 'th' ? 'หุ้นไทย' : 'หุ้นนอก'}</td>
                <td className="text-right">
                  {row.kind === 'th' ? money.thb(row.cash) : money.usd(row.cash)}
                </td>
                <td className="text-right whitespace-nowrap">
                  <button
                    className="text-sm text-emerald-800"
                    onClick={() => {
                      setEditingAccountId(row.id);
                      setAccountForm({ name: row.name, kind: row.kind });
                    }}
                  >
                    แก้ชื่อ
                  </button>
                  <button
                    className="ml-3 text-sm text-red-700"
                    onClick={() => void removeAccount(row.id)}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form onSubmit={saveAccount} className="card grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="label">ชื่อบัญชี</span>
          <input
            required
            value={accountForm.name}
            onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
            className="input"
            placeholder="เช่น IBKR, หลักทรัพย์กสิกร"
          />
        </label>
        <label className="block">
          <span className="label">ประเภท</span>
          <select
            value={accountForm.kind}
            disabled={Boolean(editingAccountId)}
            onChange={(e) =>
              setAccountForm((prev) => ({ ...prev, kind: e.target.value as Market }))
            }
            className="input"
          >
            <option value="foreign">หุ้นนอก</option>
            <option value="th">หุ้นไทย</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {editingAccountId ? 'บันทึกชื่อ' : 'เพิ่มบัญชี'}
          </button>
          {editingAccountId ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditingAccountId(null);
                setAccountForm({ name: '', kind: 'foreign' });
              }}
            >
              ยกเลิก
            </button>
          ) : null}
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold">เงินเข้า–ออกโบรก</h2>
        <p className="text-sm text-stone-500">
          โบรกไทยเป็นบาท โบรกนอกเป็น USD ไม่ใช่เงินนำกลับไทย
        </p>
      </div>

      <form onSubmit={saveCash} className="card grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label">บัญชี</span>
          <select
            required
            value={cashForm.accountId}
            onChange={(e) => setCashForm((prev) => ({ ...prev, accountId: e.target.value }))}
            className="input"
          >
            {accounts.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">วันที่</span>
          <input
            type="date"
            required
            value={cashForm.date}
            onChange={(e) => setCashForm((prev) => ({ ...prev, date: e.target.value }))}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ทิศทาง</span>
          <select
            value={cashForm.direction}
            onChange={(e) =>
              setCashForm((prev) => ({ ...prev, direction: e.target.value as 'in' | 'out' }))
            }
            className="input"
          >
            <option value="in">เข้าโบรก</option>
            <option value="out">ออกจากโบรก</option>
          </select>
        </label>
        <label className="block">
          <span className="label">จำนวน</span>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={cashForm.amount}
            onChange={(e) => setCashForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="input"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="label">หมายเหตุ</span>
          <input
            value={cashForm.note}
            onChange={(e) => setCashForm((prev) => ({ ...prev, note: e.target.value }))}
            className="input"
          />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {editingCashId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </button>
          {editingCashId ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditingCashId(null);
                setCashForm(emptyCash(accounts[0]?.id ?? ''));
              }}
            >
              ยกเลิก
            </button>
          ) : null}
        </div>
      </form>

      <section className="card overflow-x-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการเงินโบรก</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>บัญชี</th>
                <th>ทิศทาง</th>
                <th className="text-right">จำนวน</th>
                <th>หมายเหตุ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className={row.direction === 'in' ? 'trade-buy' : 'trade-sell'}>
                  <td>{row.date}</td>
                  <td>{row.accountName}</td>
                  <td className="font-semibold">{row.direction === 'in' ? 'เข้า' : 'ออก'}</td>
                  <td className="text-right">
                    {row.kind === 'th' ? money.thb(row.amount) : money.usd(row.amount)}
                  </td>
                  <td>{row.note}</td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="text-sm text-emerald-800"
                      onClick={() => {
                        setEditingCashId(row.id);
                        setCashForm({
                          accountId: row.accountId,
                          date: row.date,
                          direction: row.direction,
                          amount: String(row.amount),
                          note: row.note,
                        });
                      }}
                    >
                      แก้
                    </button>
                    <button
                      className="ml-3 text-sm text-red-700"
                      onClick={() => void removeCash(row.id)}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
