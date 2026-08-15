import { useEffect, useState } from 'react';
import { api } from '../api';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { LineChart } from '../components/LineChart';
import { apiError } from '../format';
import { useMoneyFmt } from '../privacy';
import type { PortfolioSnapshot } from '../types';

export function HistoryPage() {
  const money = useMoneyFmt();
  const [rows, setRows] = useState<PortfolioSnapshot[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setRows(await api.get<PortfolioSnapshot[]>('/snapshots'));
  }

  useEffect(() => {
    load().catch((err) => setError(apiError(err, 'โหลดประวัติไม่สำเร็จ')));
  }, []);

  async function capture() {
    setSaving(true);
    setError('');
    try {
      await api.post('/snapshots');
      await load();
    } catch (err) {
      setError(apiError(err, 'บันทึก snapshot ไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  }

  const chartPoints = rows
    .filter((row) => row.totalUsdApprox != null)
    .map((row) => ({
      label: row.date,
      value: row.totalUsdApprox ?? 0,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">ประวัติมูลค่าพอร์ต</h1>
            <HideMoneyButton />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            ระบบบันทึกอัตโนมัติเมื่อเปิดภาพรวม — กดบันทึกวันนี้เพื่ออัปเดตซ้ำได้
          </p>
        </div>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void capture()}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก snapshot วันนี้'}
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">มูลค่ารวมโดยประมาณ (USD)</h2>
        <LineChart points={chartPoints} format={(value) => money.usd(value)} />
      </section>

      <section className="card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มี snapshot — เปิดหน้าภาพรวมหรือกดบันทึกวันนี้</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th className="text-right">เงินสด USD</th>
                <th className="text-right">เงินสดบาท</th>
                <th className="text-right">มูลค่าหุ้นนอก</th>
                <th className="text-right">มูลค่าหุ้นไทย</th>
                <th className="text-right">สุทธิต่างประเทศ</th>
                <th className="text-right">รวม ≈ USD</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td className="text-right">{money.usd(row.cashUsd)}</td>
                  <td className="text-right">{money.thb(row.cashThb)}</td>
                  <td className="text-right">
                    {row.marketValueUsd != null
                      ? money.usd(row.marketValueUsd)
                      : money.usd(row.holdingsCostUsd)}
                  </td>
                  <td className="text-right">
                    {row.marketValueThb != null
                      ? money.thb(row.marketValueThb)
                      : money.thb(row.holdingsCostThb)}
                  </td>
                  <td className="text-right">{money.thb(row.thbNetAbroad)}</td>
                  <td className="text-right">
                    {row.totalUsdApprox != null ? money.usd(row.totalUsdApprox) : '—'}
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
