import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DonutChart } from '../components/DonutChart';
import { apiError, fmt } from '../format';
import { useMoneyFmt, usePrivacy } from '../privacy';
import type { Dashboard, Holding } from '../types';

export function DashboardPage() {
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
        if (!cancelled) setError(apiError(err, 'โหลดภาพรวมไม่สำเร็จ'));
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">ภาพรวมพอร์ต</h1>
        <p className="text-sm text-stone-500">
          ราคาตลาดดึงจาก Yahoo แบบฟรี (หน่วงได้) รีเฟรชทุก 1 นาที ไม่ใช่ราคาซื้อขายจริงทุกวินาที
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="เงินออกประเทศ" value={money.thb(data.thbOut)} />
        <Card label="เงินนำกลับ" value={money.thb(data.thbIn)} hint="กรอกเองเมื่อนำเข้าจริง" />
        <Card label="สุทธิต่างประเทศ" value={money.thb(data.thbNetAbroad)} />
        <Card label="เงินสด USD" value={money.usd(data.cashUsd)} />
        <Card
          label="มูลค่าหุ้นนอก"
          value={data.marketValueUsd != null ? money.usd(data.marketValueUsd) : '—'}
          hint={`ต้นทุน ${money.usd(data.holdingsCostUsd)}`}
        />
        <Card
          label="P/L หุ้นนอก"
          value={data.pnlUsd != null ? money.signed(fmt.usd, data.pnlUsd) : '—'}
          tone={hidden ? 'flat' : tone(data.pnlUsd)}
        />
        <Card
          label="มูลค่าหุ้นไทย"
          value={data.marketValueThb != null ? money.thb(data.marketValueThb) : '—'}
          hint={`ต้นทุน ${money.thb(data.holdingsCostThb)}`}
        />
        <Card
          label="P/L หุ้นไทย"
          value={data.pnlThb != null ? money.signed(fmt.thb, data.pnlThb) : '—'}
          tone={hidden ? 'flat' : tone(data.pnlThb)}
        />
        <Card
          label="ปันผลสุทธิ"
          value={money.usd(data.dividendNetUsd)}
          hint="เข้าเงินสด USD ยังไม่ใช่เงินนำกลับไทย"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HoldingsCard
          title="หุ้นนอก"
          holdings={data.holdingsForeign}
          money={money.usd}
          signed={(value) => money.signed(fmt.usd, value)}
          empty="ยังไม่มีหุ้นนอก"
        />
        <HoldingsCard
          title="หุ้นไทย"
          holdings={data.holdingsThai}
          money={money.thb}
          signed={(value) => money.signed(fmt.thb, value)}
          empty="ยังไม่มีหุ้นไทย"
        />
      </div>
    </div>
  );
}

function HoldingsCard({
  title,
  holdings,
  money,
  signed,
  empty,
}: {
  title: string;
  holdings: Holding[];
  money: (value: number) => string;
  signed: (value: number) => string;
  empty: string;
}) {
  const { hidden } = usePrivacy();
  const hasQuotes = holdings.some((row) => row.marketValue != null);
  const total = holdings.reduce(
    (sum, row) => sum + (row.marketValue ?? row.totalCost),
    0,
  );
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link to="/trades" className="text-sm text-emerald-800">
          บันทึกซื้อขาย
        </Link>
      </div>
      <DonutChart
        slices={holdings.map((row) => ({
          label: row.ticker,
          value: row.marketValue ?? row.totalCost,
        }))}
        center={total ? money(total) : '—'}
        sub={hasQuotes ? 'ตามมูลค่าตลาด' : 'ตามต้นทุน'}
      />
      {holdings.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>หุ้น</th>
                <th className="text-right">จำนวน</th>
                <th className="text-right">ราคา</th>
                <th className="text-right">มูลค่า</th>
                <th className="text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((row) => (
                <tr key={`${row.market}-${row.ticker}`}>
                  <td className="font-medium">{row.ticker}</td>
                  <td className="text-right">{fmt.shares(row.shares)}</td>
                  <td className="text-right">
                    {row.lastPrice != null ? money(row.lastPrice) : '—'}
                  </td>
                  <td className="text-right">
                    {row.marketValue != null ? money(row.marketValue) : money(row.totalCost)}
                  </td>
                  <td className={`text-right font-medium ${pnlClass(hidden ? null : row.pnl)}`}>
                    {row.pnl == null
                      ? '—'
                      : hidden
                        ? signed(row.pnl)
                        : `${signed(row.pnl)}${
                            row.pnlPct != null ? ` (${fmt.number(row.pnlPct * 100, 1)}%)` : ''
                          }`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'up' | 'down' | 'flat';
}) {
  const color =
    tone === 'up' ? 'text-emerald-800' : tone === 'down' ? 'text-red-700' : 'text-stone-900';
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

function tone(value: number | null): 'up' | 'down' | 'flat' {
  if (value == null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function pnlClass(value: number | null) {
  if (value == null || value === 0) return 'text-stone-700';
  return value > 0 ? 'text-emerald-800' : 'text-red-700';
}
