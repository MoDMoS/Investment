import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { SortTh } from '../components/SortTh';
import { apiError, fmt, todayIso } from '../format';
import type { Transfer } from '../types';

type FormState = {
  date: string;
  direction: 'out' | 'in';
  thbAmount: string;
  usdAmount: string;
  rate: string;
  feeThb: string;
  feeUsd: string;
  note: string;
};

const empty = (): FormState => ({
  date: todayIso(),
  direction: 'out',
  thbAmount: '',
  usdAmount: '',
  rate: '',
  feeThb: '',
  feeUsd: '',
  note: '',
});

export function TransfersPage() {
  const [rows, setRows] = useState<Transfer[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'out' | 'in'>('all');
  const [noteQuery, setNoteQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function load() {
    const data = await api.get<Transfer[]>('/transfers');
    setRows(data);
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
      direction: form.direction,
      thbAmount: numOrUndef(form.thbAmount),
      usdAmount: numOrUndef(form.usdAmount),
      rate: numOrUndef(form.rate),
      feeThb: numOrUndef(form.feeThb) ?? 0,
      feeUsd: numOrUndef(form.feeUsd) ?? 0,
      note: form.note,
    };
    try {
      if (editingId) {
        await api.patch(`/transfers/${editingId}`, body);
      } else {
        await api.post('/transfers', body);
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

  function edit(row: Transfer) {
    setEditingId(row.id);
    setForm({
      date: row.date,
      direction: row.direction,
      thbAmount: String(row.thbAmount),
      usdAmount: String(row.usdAmount),
      rate: String(row.rate),
      feeThb: String(row.feeThb || ''),
      feeUsd: String(row.feeUsd || ''),
      note: row.note,
    });
  }

  async function remove(id: string) {
    if (!confirm('ลบรายการนี้?')) return;
    await api.delete(`/transfers/${id}`);
    if (editingId === id) {
      setEditingId(null);
      setForm(empty());
    }
    await load();
  }

  const visibleRows = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (directionFilter !== 'all' && row.direction !== directionFilter) return false;
      if (query && !row.note.toLowerCase().includes(query)) return false;
      return true;
    });
    const copy = [...filtered];
    copy.sort((a, b) => compareTransfers(a, b, sortKey) * (sortDir === 'asc' ? 1 : -1));
    return copy;
  }, [rows, directionFilter, noteQuery, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'date' || key === 'thbAmount' || key === 'usdAmount' || key === 'rate' ? 'desc' : 'asc');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">แลกเงินเข้า–ออกประเทศ</h1>
        <p className="text-sm text-stone-500">
          เงินนำกลับต้องกรอกเองเมื่อโอนเข้าไทยจริง กรอกอย่างน้อย 2 ใน 3 ของบาท / USD / เรท
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
          <span className="label">ทิศทาง</span>
          <select
            value={form.direction}
            onChange={(e) => set('direction', e.target.value as 'out' | 'in')}
            className="input"
          >
            <option value="out">ส่งออก (บาท → USD)</option>
            <option value="in">นำกลับ (USD → บาท)</option>
          </select>
        </label>
        <label className="block">
          <span className="label">จำนวนบาท</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.thbAmount}
            onChange={(e) => set('thbAmount', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">จำนวน USD</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.usdAmount}
            onChange={(e) => set('usdAmount', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">เรท (บาทต่อ 1 USD)</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.rate}
            onChange={(e) => set('rate', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ค่าธรรมเนียมบาท</span>
          <input
            type="number"
            step="any"
            min="0"
            value={form.feeThb}
            onChange={(e) => set('feeThb', e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">ค่าธรรมเนียม USD</span>
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
            placeholder="เช่น Wise, ธนาคาร"
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
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="label">ทิศทาง</span>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as 'all' | 'out' | 'in')}
              className="input"
            >
              <option value="all">ทั้งหมด</option>
              <option value="out">ส่งออก</option>
              <option value="in">นำกลับ</option>
            </select>
          </label>
          <label className="block">
            <span className="label">ค้นหาหมายเหตุ</span>
            <input
              value={noteQuery}
              onChange={(e) => setNoteQuery(e.target.value)}
              className="input"
              placeholder="เช่น Wise, ธนาคาร"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setDirectionFilter('all');
                setNoteQuery('');
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
          <p className="text-sm text-stone-500">ยังไม่มีรายการแลกเงิน</p>
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
                  <SortTh
                    label="ทิศทาง"
                    active={sortKey === 'direction'}
                    dir={sortDir}
                    onClick={() => toggleSort('direction')}
                  />
                  <SortTh
                    label="บาท"
                    align="right"
                    active={sortKey === 'thbAmount'}
                    dir={sortDir}
                    onClick={() => toggleSort('thbAmount')}
                  />
                  <SortTh
                    label="USD"
                    align="right"
                    active={sortKey === 'usdAmount'}
                    dir={sortDir}
                    onClick={() => toggleSort('usdAmount')}
                  />
                  <SortTh
                    label="เรท"
                    align="right"
                    active={sortKey === 'rate'}
                    dir={sortDir}
                    onClick={() => toggleSort('rate')}
                  />
                  <SortTh
                    label="หมายเหตุ"
                    active={sortKey === 'note'}
                    dir={sortDir}
                    onClick={() => toggleSort('note')}
                  />
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.direction === 'in' ? 'trade-buy' : 'trade-sell'}
                  >
                    <td>{row.date}</td>
                    <td className="font-semibold">
                      {row.direction === 'out' ? 'ส่งออก' : 'นำกลับ'}
                    </td>
                    <td className="text-right">{fmt.number(row.thbAmount)}</td>
                    <td className="text-right">{fmt.number(row.usdAmount)}</td>
                    <td className="text-right">{fmt.rate(row.rate)}</td>
                    <td>{row.note}</td>
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

function numOrUndef(value: string) {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

type SortKey = 'date' | 'direction' | 'thbAmount' | 'usdAmount' | 'rate' | 'note';

function compareTransfers(a: Transfer, b: Transfer, key: SortKey) {
  if (key === 'thbAmount' || key === 'usdAmount' || key === 'rate') {
    return a[key] - b[key];
  }
  return String(a[key]).localeCompare(String(b[key]), 'th');
}
