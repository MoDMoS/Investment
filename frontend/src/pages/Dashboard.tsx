import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DonutChart } from '../components/DonutChart';
import { HideMoneyButton } from '../components/HideMoneyButton';
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

  const foreignTotal = data.holdingsForeign.reduce(
    (sum, row) => sum + (row.marketValue ?? row.totalCost),
    0,
  );
  const thaiTotal = data.holdingsThai.reduce(
    (sum, row) => sum + (row.marketValue ?? row.totalCost),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-stone-900">ภาพรวมพอร์ต</h1>
          <HideMoneyButton />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          สรุปรวมทั้งหุ้นนอกและหุ้นไทย ·{' '}
          <Link to="/foreign" className="text-emerald-800 hover:underline">
            ดูหุ้นนอก
          </Link>
          {' · '}
          <Link to="/thai" className="text-emerald-800 hover:underline">
            ดูหุ้นไทย
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewCard label="เงินออกประเทศ" value={money.thb(data.thbOut)} />
        <OverviewCard label="เงินนำกลับ" value={money.thb(data.thbIn)} hint="กรอกเองเมื่อนำเข้าจริง" />
        <OverviewCard label="สุทธิต่างประเทศ" value={money.thb(data.thbNetAbroad)} />
        <OverviewCard label="เงินสด USD" value={money.usd(data.cashUsd)} />
        <OverviewCard
          label="เงินสดบาท (โบรกไทย)"
          value={money.thb(data.cashThb)}
          hint={
            <Link to="/accounts" className="text-emerald-800 hover:underline">
              เติมเงินที่หน้าบัญชี
            </Link>
          }
        />
        <OverviewCard
          label="มูลค่าหุ้นนอก"
          value={data.marketValueUsd != null ? money.usd(data.marketValueUsd) : '—'}
          hint={`ต้นทุน ${money.usd(data.holdingsCostUsd)}`}
        />
        <OverviewCard
          label="มูลค่าหุ้นไทย"
          value={data.marketValueThb != null ? money.thb(data.marketValueThb) : '—'}
          hint={`ต้นทุน ${money.thb(data.holdingsCostThb)}`}
        />
        <OverviewCard
          label="P/L หุ้นนอก (ยังไม่ปิด)"
          value={data.pnlUsd != null ? money.signed(fmt.usd, data.pnlUsd) : '—'}
          tone={hidden ? 'flat' : overviewTone(data.pnlUsd)}
        />
        <OverviewCard
          label="P/L หุ้นไทย (ยังไม่ปิด)"
          value={data.pnlThb != null ? money.signed(fmt.thb, data.pnlThb) : '—'}
          tone={hidden ? 'flat' : overviewTone(data.pnlThb)}
        />
        <OverviewCard
          label="P/L ที่ปิดแล้ว (USD)"
          value={money.signed(fmt.usd, data.realizedPnlUsd)}
          tone={hidden ? 'flat' : overviewTone(data.realizedPnlUsd)}
        />
        <OverviewCard
          label="P/L ที่ปิดแล้ว (บาท)"
          value={money.signed(fmt.thb, data.realizedPnlThb)}
          tone={hidden ? 'flat' : overviewTone(data.realizedPnlThb)}
        />
        <OverviewCard
          label="ปันผลสุทธิ USD"
          value={money.usd(data.dividendNetUsd)}
          hint="เข้าเงินสด USD"
        />
        <OverviewCard
          label="ปันผลสุทธิบาท"
          value={money.thb(data.dividendNetThb)}
          hint="เข้าเงินสดบาทในโบรกไทย"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">หุ้นนอก</h2>
            <Link to="/foreign" className="text-sm text-emerald-800">
              ดูรายละเอียด
            </Link>
          </div>
          <DonutChart
            slices={data.holdingsForeign.map((row) => ({
              label: row.ticker,
              value: row.marketValue ?? row.totalCost,
            }))}
            center={foreignTotal ? money.usd(foreignTotal) : '—'}
            sub={
              data.holdingsForeign.some((row) => row.marketValue != null)
                ? 'ตามมูลค่าตลาด'
                : 'ตามต้นทุน'
            }
          />
          <OverviewHoldingsTable
            holdings={data.holdingsForeign}
            empty="ยังไม่มีหุ้นนอก"
            hidden={hidden}
            format={money.usd}
            signed={(value) => money.signed(fmt.usd, value)}
          />
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">หุ้นไทย</h2>
            <Link to="/thai" className="text-sm text-emerald-800">
              ดูรายละเอียด
            </Link>
          </div>
          <DonutChart
            slices={data.holdingsThai.map((row) => ({
              label: row.ticker,
              value: row.marketValue ?? row.totalCost,
            }))}
            center={thaiTotal ? money.thb(thaiTotal) : '—'}
            sub={
              data.holdingsThai.some((row) => row.marketValue != null)
                ? 'ตามมูลค่าตลาด'
                : 'ตามต้นทุน'
            }
          />
          <OverviewHoldingsTable
            holdings={data.holdingsThai}
            empty="ยังไม่มีหุ้นไทย"
            hidden={hidden}
            format={money.thb}
            signed={(value) => money.signed(fmt.thb, value)}
          />
        </section>
      </div>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">กำไรที่ปิดแล้วล่าสุด</h2>
        {data.realized.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีรายการขาย</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ตลาด</th>
                  <th>หุ้น</th>
                  <th className="text-right">จำนวน</th>
                  <th className="text-right">กำไร</th>
                </tr>
              </thead>
              <tbody>
                {data.realized.slice(0, 20).map((row, index) => (
                  <tr key={`${row.ticker}-${row.date}-${index}`}>
                    <td>{row.date}</td>
                    <td>{row.market === 'th' ? 'ไทย' : 'นอก'}</td>
                    <td className="font-medium">{row.ticker}</td>
                    <td className="text-right">{fmt.shares(row.shares)}</td>
                    <td
                      className={`text-right font-medium ${overviewPnlClass(hidden ? null : row.pnl)}`}
                    >
                      {money.signed(row.market === 'th' ? fmt.thb : fmt.usd, row.pnl)}
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

function OverviewHoldingsTable({
  holdings,
  empty,
  hidden,
  format,
  signed,
}: {
  holdings: Holding[];
  empty: string;
  hidden: boolean;
  format: (value: number) => string;
  signed: (value: number) => string;
}) {
  if (holdings.length === 0) {
    return <p className="text-sm text-stone-500">{empty}</p>;
  }

  return (
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
            <tr key={`${row.market}-${row.ticker}`}>
              <td className="font-medium">{row.ticker}</td>
              <td className="text-right">{fmt.shares(row.shares)}</td>
              <td className="text-right">{format(row.avgCost)}</td>
              <td className="text-right">
                {row.lastPrice != null ? format(row.lastPrice) : '—'}
              </td>
              <td className="text-right">
                {row.marketValue != null ? format(row.marketValue) : format(row.totalCost)}
              </td>
              <td className={`text-right font-medium ${overviewPnlClass(hidden ? null : row.pnl)}`}>
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
  );
}

function OverviewCard({
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
    tone === 'up' ? 'text-emerald-800' : tone === 'down' ? 'text-red-700' : 'text-stone-900';
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

function overviewTone(value: number | null): 'up' | 'down' | 'flat' {
  if (value == null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function overviewPnlClass(value: number | null) {
  if (value == null || value === 0) return 'text-stone-700';
  return value > 0 ? 'text-emerald-800' : 'text-red-700';
}
