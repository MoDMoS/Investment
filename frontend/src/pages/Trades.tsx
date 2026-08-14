import { FormEvent, useEffect, useMemo, useState } from 'react';
import { firstAccountId, useAccounts } from '../accounts';
import { api } from '../api';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { SortTh } from '../components/SortTh';
import { apiError, fmt, todayIso } from '../format';
import { useMoneyFmt } from '../privacy';
import type { Market, Trade } from '../types';

type FormState = {
  date: string;
  accountId: string;
  ticker: string;
  market: Market;
  side: 'buy' | 'sell';
  shares: string;
  priceUsd: string;
  feeUsd: string;
  note: string;
};

const empty = (): FormState => ({
  date: todayIso(),
  accountId: '',
  ticker: '',
  market: 'foreign',
  side: 'buy',
  shares: '',
  priceUsd: '',
  feeUsd: '',
  note: '',
});

export function TradesPage() {
  const money = useMoneyFmt();
  const { accounts } = useAccounts();
  const [rows, setRows] = useState<Trade[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickerQuery, setTickerQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'all' | Market>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function load() {
    setRows(await api.get<Trade[]>('/trades'));
  }

  useEffect(() => {
    load().catch((err) => setError(apiError(err, 'โหลดรายการไม่สำเร็จ')));
  }, []);

  useEffect(() => {
    if (form.accountId) return;
    const id = firstAccountId(accounts, form.market);
    if (id) setForm((prev) => ({ ...prev, accountId: id }));
  }, [accounts, form.accountId, form.market]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setWarning('');
    setSubmitting(true);
    const body = {
      date: form.date,
      accountId: form.accountId,
      ticker: form.ticker,
      market: form.market,
      side: form.side,
      shares: Number(form.shares),
      priceUsd: Number(form.priceUsd),
      feeUsd: numOrZero(form.feeUsd),
      note: form.note,
    };
    try {
      if (editingId) {
        await api.patch(`/trades/${editingId}`, body);
      } else {
        const created = await api.post<Trade>('/trades', body);
        if (created.cashWarning) {
          setWarning(
            form.market === 'th'
              ? 'ซื้อเกินเงินสดบาทในบัญชีนี้ (ยังบันทึกไว้แล้ว)'
              : 'ซื้อเกินเงินสด USD ในบัญชีนี้ (ยังบันทึกไว้แล้ว)',
          );
        }
      }
      setForm(empty());
      setEditingId(null);
      await load();
    } catch (err) {
      setError(apiError(err, 'บันทึกไม่สำเร็จ'));
    } finally {
      setSubmitting(false);
    }
  }

  function edit(row: Trade) {
    setEditingId(row.id);
    setForm({
      date: row.date,
      accountId: row.accountId ?? '',
      ticker: row.ticker,
      market: row.market ?? 'foreign',
      side: row.side,
      shares: String(row.shares),
      priceUsd: String(row.priceUsd),
      feeUsd: String(row.feeUsd || ''),
      note: row.note,
    });
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    await api.delete(`/trades/${id}`);
    if (editingId === id) {
      setEditingId(null);
      setForm(empty());
    }
    await load();
  }

  const visibleRows = useMemo(() => {
    const query = tickerQuery.trim().toUpperCase();
    const filtered = rows.filter((row) => {
      if (query && !row.ticker.includes(query)) return false;
      if (marketFilter !== 'all' && row.market !== marketFilter) return false;
      if (sideFilter !== 'all' && row.side !== sideFilter) return false;
      return true;
    });
    const copy = [...filtered];
    copy.sort((a, b) => compareTrades(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1));
    return copy;
  }, [rows, tickerQuery, marketFilter, sideFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'date' || key === 'totalUsd' || key === 'priceUsd' ? 'desc' : 'asc');
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">ซื้อขายหุ้น</h1>
          <HideMoneyButton />
        </div>
        <p className="text-sm text-stone-500">
          แยกหุ้นไทย (ราคาเป็นบาท) กับหุ้นนอก (ราคาเป็น USD)
          ขายหุ้นนอกแล้วยังไม่นับเป็นเงินนำกลับ จนกว่าจะบันทึกแลกเงินเข้าไทย
        </p>
      </div>

      <form onSubmit={onSubmit} className="card grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label">วันที่</span>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ตลาด</span>
          <select
            value={form.market}
            onChange={(e) => {
              const market = e.target.value as Market;
              setForm((prev) => ({
                ...prev,
                market,
                accountId: firstAccountId(accounts, market),
              }));
            }}
            className="input"
          >
            <option value="foreign">หุ้นนอก</option>
            <option value="th">หุ้นไทย</option>
          </select>
        </label>
        <label className="block">
          <span className="label">บัญชี</span>
          <select
            required
            value={form.accountId}
            onChange={(e) => set('accountId', e.target.value)}
            className="input"
          >
            {accounts
              .filter((row) => row.kind === form.market)
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="label">ซื้อ / ขาย</span>
          <select
            value={form.side}
            onChange={(e) => set('side', e.target.value as 'buy' | 'sell')}
            className="input"
          >
            <option value="buy">ซื้อ</option>
            <option value="sell">ขาย</option>
          </select>
        </label>
        <label className="block">
          <span className="label">ชื่อหุ้น</span>
          <input
            required
            value={form.ticker}
            onChange={(e) => set('ticker', e.target.value.toUpperCase())}
            className="input"
            placeholder={form.market === 'th' ? 'PTT' : 'AAPL'}
          />
        </label>
        <label className="block">
          <span className="label">จำนวนหุ้น</span>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={form.shares}
            onChange={(e) => set('shares', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">
            {form.market === 'th' ? 'ราคาต่อหุ้น (บาท)' : 'ราคาต่อหุ้น (USD)'}
          </span>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={form.priceUsd}
            onChange={(e) => set('priceUsd', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">
            {form.market === 'th' ? 'ค่าคอม (บาท)' : 'ค่าคอม USD'}
          </span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.feeUsd}
            onChange={(e) => set('feeUsd', e.target.value)}
            className="input"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="label">หมายเหตุ</span>
          <input
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            className="input"
          />
        </label>
        {error ? <p className="text-sm text-red-700 md:col-span-2">{error}</p> : null}
        {warning ? <p className="text-sm text-amber-700 md:col-span-2">{warning}</p> : null}
        <div className="flex items-end gap-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </button>
          {editingId ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditingId(null);
                setForm(empty());
              }}
            >
              ยกเลิก
            </button>
          ) : null}
        </div>
      </form>

      <section className="card space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="label">ค้นหาหุ้น</span>
            <input
              value={tickerQuery}
              onChange={(e) => setTickerQuery(e.target.value.toUpperCase())}
              className="input"
              placeholder="เช่น AAPL, PTT"
            />
          </label>
          <label className="block">
            <span className="label">ตลาด</span>
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value as 'all' | Market)}
              className="input"
            >
              <option value="all">ทั้งหมด</option>
              <option value="foreign">หุ้นนอก</option>
              <option value="th">หุ้นไทย</option>
            </select>
          </label>
          <label className="block">
            <span className="label">ด้าน</span>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as 'all' | 'buy' | 'sell')}
              className="input"
            >
              <option value="all">ทั้งหมด</option>
              <option value="buy">ซื้อ</option>
              <option value="sell">ขาย</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setTickerQuery('');
                setMarketFilter('all');
                setSideFilter('all');
                setSortKey('date');
                setSortDir('desc');
              }}
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        <p className="text-sm text-stone-500">
          แสดง {visibleRows.length} จาก {rows.length} รายการ
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการซื้อขาย</p>
        ) : visibleRows.length === 0 ? (
          <p className="text-sm text-stone-500">ไม่พบรายการตามตัวกรอง</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <SortTh
                    label="วันที่"
                    active={sortKey === 'date'}
                    dir={sortDir}
                    onClick={() => toggleSort('date')}
                  />
                  <th>บัญชี</th>
                  <SortTh
                    label="ตลาด"
                    active={sortKey === 'market'}
                    dir={sortDir}
                    onClick={() => toggleSort('market')}
                  />
                  <SortTh
                    label="หุ้น"
                    active={sortKey === 'ticker'}
                    dir={sortDir}
                    onClick={() => toggleSort('ticker')}
                  />
                  <SortTh
                    label="ด้าน"
                    active={sortKey === 'side'}
                    dir={sortDir}
                    onClick={() => toggleSort('side')}
                  />
                  <SortTh
                    label="จำนวน"
                    align="right"
                    active={sortKey === 'shares'}
                    dir={sortDir}
                    onClick={() => toggleSort('shares')}
                  />
                  <SortTh
                    label="ราคา"
                    align="right"
                    active={sortKey === 'priceUsd'}
                    dir={sortDir}
                    onClick={() => toggleSort('priceUsd')}
                  />
                  <SortTh
                    label="รวม"
                    align="right"
                    active={sortKey === 'totalUsd'}
                    dir={sortDir}
                    onClick={() => toggleSort('totalUsd')}
                  />
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.side === 'buy' ? 'trade-buy' : 'trade-sell'}
                  >
                    <td>{row.date}</td>
                    <td>{row.accountName}</td>
                    <td>{row.market === 'th' ? 'ไทย' : 'นอก'}</td>
                    <td className="font-medium">{row.ticker}</td>
                    <td className="font-semibold">{row.side === 'buy' ? 'ซื้อ' : 'ขาย'}</td>
                    <td className="text-right">{fmt.shares(row.shares)}</td>
                    <td className="text-right">
                      {row.market === 'th' ? money.thb(row.priceUsd) : money.usd(row.priceUsd)}
                    </td>
                    <td className="text-right">
                      {row.market === 'th' ? money.thb(row.totalUsd) : money.usd(row.totalUsd)}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button className="text-sm text-emerald-800" onClick={() => edit(row)}>
                        แก้
                      </button>
                      <button
                        className="ml-3 text-sm text-red-700"
                        onClick={() => void remove(row.id)}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function numOrZero(value: string) {
  if (value.trim() === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type SortKey = 'date' | 'market' | 'ticker' | 'side' | 'shares' | 'priceUsd' | 'totalUsd';

function compareTrades(a: Trade, b: Trade, key: SortKey) {
  if (key === 'shares' || key === 'priceUsd' || key === 'totalUsd') {
    return a[key] - b[key];
  }
  return String(a[key]).localeCompare(String(b[key]), 'th');
}
