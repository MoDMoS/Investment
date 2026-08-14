import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { apiError, fmt, todayIso } from '../format';
import type { Market, Trade } from '../types';

type FormState = {
  date: string;
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
  ticker: '',
  market: 'foreign',
  side: 'buy',
  shares: '',
  priceUsd: '',
  feeUsd: '',
  note: '',
});

export function TradesPage() {
  const [rows, setRows] = useState<Trade[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setRows(await api.get<Trade[]>('/trades'));
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
    setWarning('');
    setSubmitting(true);
    const body = {
      date: form.date,
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
          setWarning('ซื้อเกินเงินสด USD ที่มีในขณะนี้ (ยังบันทึกไว้แล้ว)');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ซื้อขายหุ้น</h1>
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
            onChange={(e) => set('market', e.target.value as Market)}
            className="input"
          >
            <option value="foreign">หุ้นนอก</option>
            <option value="th">หุ้นไทย</option>
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

      <section className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการซื้อขาย</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ตลาด</th>
                <th>หุ้น</th>
                <th>ด้าน</th>
                <th className="text-right">จำนวน</th>
                <th className="text-right">ราคา</th>
                <th className="text-right">รวม</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.market === 'th' ? 'ไทย' : 'นอก'}</td>
                  <td className="font-medium">{row.ticker}</td>
                  <td>{row.side === 'buy' ? 'ซื้อ' : 'ขาย'}</td>
                  <td className="text-right">{fmt.shares(row.shares)}</td>
                  <td className="text-right">
                    {row.market === 'th' ? fmt.thb(row.priceUsd) : fmt.usd(row.priceUsd)}
                  </td>
                  <td className="text-right">
                    {row.market === 'th' ? fmt.thb(row.totalUsd) : fmt.usd(row.totalUsd)}
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
