import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { apiError, fmt, todayIso } from '../format';
import { useMoneyFmt } from '../privacy';
import type { Dividend } from '../types';

type FormState = {
  date: string;
  ticker: string;
  shares: string;
  grossUsd: string;
  taxUsd: string;
  note: string;
};

const empty = (): FormState => ({
  date: todayIso(),
  ticker: '',
  shares: '',
  grossUsd: '',
  taxUsd: '',
  note: '',
});

export function DividendsPage() {
  const money = useMoneyFmt();
  const [rows, setRows] = useState<Dividend[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setRows(await api.get<Dividend[]>('/dividends'));
  }

  useEffect(() => {
    load().catch((err) => setError(apiError(err, 'โหลดรายการไม่สำเร็จ')));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const body = {
      date: form.date,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ปันผล</h1>
        <p className="text-sm text-stone-500">
          เงินปันผลเข้าเงินสด USD ในโบรกเกอร์ ยังไม่นับเป็นเงินนำกลับไทย
          จนกว่าจะบันทึกแลกเงินเข้า
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
          <span className="label">ชื่อหุ้น</span>
          <input
            required
            value={form.ticker}
            onChange={(e) => set('ticker', e.target.value.toUpperCase())}
            className="input"
            placeholder="AAPL"
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
          <span className="label">ปันผลก่อนหักภาษี (USD)</span>
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
          <span className="label">ภาษีหัก ณ ที่จ่าย (USD)</span>
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

      <section className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการปันผล</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>หุ้น</th>
                <th className="text-right">จำนวนหุ้น</th>
                <th className="text-right">ก่อนหักภาษี</th>
                <th className="text-right">ภาษี</th>
                <th className="text-right">สุทธิเข้าบัญชี</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td className="font-medium">{row.ticker}</td>
                  <td className="text-right">{row.shares ? fmt.shares(row.shares) : '—'}</td>
                  <td className="text-right">{money.usd(row.grossUsd)}</td>
                  <td className="text-right">{money.usd(row.taxUsd)}</td>
                  <td className="text-right">{money.usd(row.netUsd)}</td>
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
        )}
      </section>
    </div>
  );
}

function numOrUndef(value: string) {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
