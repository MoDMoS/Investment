import { FormEvent, useEffect, useMemo, useState } from 'react';
import { firstAccountId, useAccounts } from '../accounts';
import { api } from '../api';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { apiError, fmt, todayIso } from '../format';
import { useMoneyFmt } from '../privacy';
import type { Dividend, Market } from '../types';

type FormState = {
  date: string;
  market: Market;
  accountId: string;
  ticker: string;
  shares: string;
  grossUsd: string;
  taxUsd: string;
  note: string;
};

const empty = (): FormState => ({
  date: todayIso(),
  market: 'foreign',
  accountId: '',
  ticker: '',
  shares: '',
  grossUsd: '',
  taxUsd: '',
  note: '',
});

export function DividendsPage() {
  const money = useMoneyFmt();
  const { accounts } = useAccounts();
  const [rows, setRows] = useState<Dividend[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickerQuery, setTickerQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<'all' | Market>('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  async function load() {
    setRows(await api.get<Dividend[]>('/dividends'));
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
    setSubmitting(true);
    const body = {
      date: form.date,
      market: form.market,
      accountId: form.accountId,
      ticker: form.ticker,
      shares: numOrUndef(form.shares) ?? 0,
      grossUsd: Number(form.grossUsd),
      taxUsd: numOrUndef(form.taxUsd) ?? 0,
      note: form.note,
    };
    try {
      if (editingId) {
        await api.patch(`/dividends/${editingId}`, body);
      } else {
        await api.post('/dividends', body);
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

  function edit(row: Dividend) {
    setEditingId(row.id);
    setForm({
      date: row.date,
      market: row.market ?? 'foreign',
      accountId: row.accountId ?? '',
      ticker: row.ticker,
      shares: row.shares ? String(row.shares) : '',
      grossUsd: String(row.grossUsd),
      taxUsd: row.taxUsd ? String(row.taxUsd) : '',
      note: row.note,
    });
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    await api.delete(`/dividends/${id}`);
    if (editingId === id) {
      setEditingId(null);
      setForm(empty());
    }
    await load();
  }

  const years = useMemo(() => {
    const set = new Set(rows.map((row) => row.date.slice(0, 4)));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const visibleRows = useMemo(() => {
    const query = tickerQuery.trim().toUpperCase();
    return rows.filter((row) => {
      if (query && !row.ticker.includes(query)) return false;
      if (marketFilter !== 'all' && row.market !== marketFilter) return false;
      if (yearFilter !== 'all' && !row.date.startsWith(yearFilter)) return false;
      if (accountFilter !== 'all' && row.accountId !== accountFilter) return false;
      return true;
    });
  }, [rows, tickerQuery, marketFilter, yearFilter, accountFilter]);

  const totals = useMemo(() => {
    let grossUsd = 0;
    let taxUsd = 0;
    let netUsd = 0;
    let grossThb = 0;
    let taxThb = 0;
    let netThb = 0;
    for (const row of visibleRows) {
      if (row.market === 'th') {
        grossThb += row.grossUsd;
        taxThb += row.taxUsd;
        netThb += row.netUsd;
      } else {
        grossUsd += row.grossUsd;
        taxUsd += row.taxUsd;
        netUsd += row.netUsd;
      }
    }
    return { grossUsd, taxUsd, netUsd, grossThb, taxThb, netThb };
  }, [visibleRows]);

  const showUsd = marketFilter !== 'th';
  const showThb = marketFilter !== 'foreign';
  const unit = form.market === 'th' ? 'บาท' : 'USD';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">ปันผล</h1>
          <HideMoneyButton />
        </div>
        <p className="text-sm text-stone-500">
          ปันผลหุ้นนอกเข้าเงินสด USD — ปันผลหุ้นไทยเข้าเงินสดบาทในโบรก
          ยังไม่นับเป็นเงินนำกลับไทยจากการแลกเงิน
        </p>
      </div>

      <form onSubmit={onSubmit} className="card grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="label">วันที่ได้รับ</span>
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
          <span className="label">จำนวนหุ้น (ไม่บังคับ)</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.shares}
            onChange={(e) => set('shares', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ปันผลก่อนหักภาษี ({unit})</span>
          <input
            type="number"
            step="any"
            min="0"
            required
            value={form.grossUsd}
            onChange={(e) => set('grossUsd', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ภาษีหัก ณ ที่จ่าย ({unit})</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.taxUsd}
            onChange={(e) => set('taxUsd', e.target.value)}
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
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
            <span className="label">ปี</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="input"
            >
              <option value="all">ทั้งหมด</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">บัญชี</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="input"
            >
              <option value="all">ทั้งหมด</option>
              {accounts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} ({row.kind === 'th' ? 'ไทย' : 'นอก'})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setTickerQuery('');
                setMarketFilter('all');
                setYearFilter('all');
                setAccountFilter('all');
              }}
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {showUsd ? (
            <>
              <SummaryCard
                label="ปันผลก่อนหัก (USD)"
                value={money.usd(totals.grossUsd)}
              />
              <SummaryCard label="ภาษี (USD)" value={money.usd(totals.taxUsd)} />
              <SummaryCard
                label="สุทธิเข้าบัญชี (USD)"
                value={money.usd(totals.netUsd)}
              />
            </>
          ) : null}
          {showThb ? (
            <>
              <SummaryCard
                label="ปันผลก่อนหัก (บาท)"
                value={money.thb(totals.grossThb)}
              />
              <SummaryCard label="ภาษี (บาท)" value={money.thb(totals.taxThb)} />
              <SummaryCard
                label="สุทธิเข้าบัญชี (บาท)"
                value={money.thb(totals.netThb)}
              />
            </>
          ) : null}
        </div>

        <p className="text-sm text-stone-500">
          แสดง {visibleRows.length} จาก {rows.length} รายการ
          {yearFilter !== 'all' ? ` · ปี ${yearFilter}` : ''}
        </p>

        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการปันผล</p>
        ) : visibleRows.length === 0 ? (
          <p className="text-sm text-stone-500">ไม่พบรายการตามตัวกรอง</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ตลาด</th>
                  <th>บัญชี</th>
                  <th>หุ้น</th>
                  <th className="text-right">จำนวนหุ้น</th>
                  <th className="text-right">ก่อนหักภาษี</th>
                  <th className="text-right">ภาษี</th>
                  <th className="text-right">สุทธิเข้าบัญชี</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const fmtMoney = row.market === 'th' ? money.thb : money.usd;
                  return (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.market === 'th' ? 'ไทย' : 'นอก'}</td>
                      <td>{row.accountName}</td>
                      <td className="font-medium">{row.ticker}</td>
                      <td className="text-right">
                        {row.shares ? fmt.shares(row.shares) : '—'}
                      </td>
                      <td className="text-right">{fmtMoney(row.grossUsd)}</td>
                      <td className="text-right">{fmtMoney(row.taxUsd)}</td>
                      <td className="text-right">{fmtMoney(row.netUsd)}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function numOrUndef(value: string) {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
