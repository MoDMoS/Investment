import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DonutChart } from '../components/DonutChart';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { apiError, fmt } from '../format';
import { useMoneyFmt, usePrivacy } from '../privacy';
import type { Dashboard, Holding } from '../types';

export function DashboardThaiPage() {
  const money = useMoneyFmt();
  const { hidden } = usePrivacy();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await api.get<Dashboard>('/dashboard');
        if (!cancelled) {
          setData(next);
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(apiError(err, 'โหลดภาพรวมหุ้นไทยไม่สำเร็จ'));
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (error && !data) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-stone-500">กำลังโหลด...</p>;

  const holdings = data.holdingsThai;
  const realized = data.realized.filter((row) => row.market === 'th');
  const hasQuotes = holdings.some((row) => row.marketValue != null);
  const total = holdings.reduce((sum, row) => sum + (row.marketValue ?? row.totalCost), 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-stone-900">ภาพรวมหุ้นไทย</h1>
          <HideMoneyButton />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          เงินสดบาทในโบรก และพอร์ตหุ้นไทย — ซื้อขายไม่หักเงินสดบาทอัตโนมัติ
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ThaiCard
          label="เงินสดบาท (โบรกไทย)"
          value={money.thb(data.cashThb)}
          hint={
            <Link to="/investment/accounts" className="text-emerald-800 hover:underline">
              เติมเงินที่หน้าบัญชี
            </Link>
          }
        />
        <ThaiCard
          label="มูลค่าหุ้นไทย"
          value={data.marketValueThb != null ? money.thb(data.marketValueThb) : '—'}
          hint={`ต้นทุน ${money.thb(data.holdingsCostThb)}`}
        />
        <ThaiCard
          label="P/L ยังไม่ปิด"
          value={data.pnlThb != null ? money.signed(fmt.thb, data.pnlThb) : '—'}
          tone={hidden ? 'flat' : thaiTone(data.pnlThb)}
        />
        <ThaiCard
          label="P/L ที่ปิดแล้ว"
          value={money.signed(fmt.thb, data.realizedPnlThb)}
          tone={hidden ? 'flat' : thaiTone(data.realizedPnlThb)}
        />
        <ThaiCard
          label="ปันผลสุทธิ"
          value={money.thb(data.dividendNetThb ?? 0)}
          hint="เข้าเงินสดบาทในโบรกไทย"
        />
      </div>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">พอร์ตหุ้นไทย</h2>
          <Link to="/investment/trades" className="text-sm text-emerald-800">
            บันทึกซื้อขาย
          </Link>
        </div>
        <DonutChart
          slices={holdings.map((row) => ({
            label: row.ticker,
            value: row.marketValue ?? row.totalCost,
          }))}
          center={total ? money.thb(total) : '—'}
          sub={hasQuotes ? 'ตามมูลค่าตลาด' : 'ตามต้นทุน'}
        />
        {holdings.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีหุ้นไทย</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>หุ้น</th>
                  <th className="text-right">จำนวน</th>
                  <th className="text-right">ต้นทุน</th>
                  <th className="text-right">ราคา</th>
                  <th className="text-right">มูลค่า</th>
                  <th className="text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((row) => (
                  <ThaiHoldingRow
                    key={`${row.market}-${row.ticker}`}
                    row={row}
                    hidden={hidden}
                    format={money.thb}
                    signed={(value) => money.signed(fmt.thb, value)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">กำไรที่ปิดแล้ว (บาท)</h2>
        {realized.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการขาย</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>หุ้น</th>
                  <th className="text-right">จำนวน</th>
                  <th className="text-right">กำไร</th>
                </tr>
              </thead>
              <tbody>
                {realized.map((row, index) => (
                  <tr key={`${row.ticker}-${row.date}-${index}`}>
                    <td>{row.date}</td>
                    <td className="font-medium">{row.ticker}</td>
                    <td className="text-right">{fmt.shares(row.shares)}</td>
                    <td
                      className={`text-right font-medium ${thaiPnlClass(hidden ? null : row.pnl)}`}
                    >
                      {money.signed(fmt.thb, row.pnl)}
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

function ThaiHoldingRow({
  row,
  hidden,
  format,
  signed,
}: {
  row: Holding;
  hidden: boolean;
  format: (value: number) => string;
  signed: (value: number) => string;
}) {
  return (
    <tr>
      <td className="font-medium">{row.ticker}</td>
      <td className="text-right">{fmt.shares(row.shares)}</td>
      <td className="text-right">{format(row.avgCost)}</td>
      <td className="text-right">{row.lastPrice != null ? format(row.lastPrice) : '—'}</td>
      <td className="text-right">
        {row.marketValue != null ? format(row.marketValue) : format(row.totalCost)}
      </td>
      <td className={`text-right font-medium ${thaiPnlClass(hidden ? null : row.pnl)}`}>
        {row.pnl == null
          ? '—'
          : hidden
            ? signed(row.pnl)
            : `${signed(row.pnl)}${
                row.pnlPct != null ? ` (${fmt.number(row.pnlPct * 100, 1)}%)` : ''
              }`}
      </td>
    </tr>
  );
}

function ThaiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  tone?: 'up' | 'down' | 'flat';
}) {
  const color =
    tone === 'up' ? 'text-green-400' : tone === 'down' ? 'text-red-400' : 'text-stone-900';
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

function thaiTone(value: number | null): 'up' | 'down' | 'flat' {
  if (value == null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function thaiPnlClass(value: number | null) {
  if (value == null || value === 0) return 'text-stone-700';
  return value > 0 ? 'text-green-400' : 'text-red-400';
}
