import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DonutChart } from '../components/DonutChart';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { apiError, fmt } from '../format';
import { useMoneyFmt, usePrivacy } from '../privacy';
import type { Dashboard, Holding } from '../types';

export function DashboardForeignPage() {
  const money = useMoneyFmt();
  const { hidden } = usePrivacy();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await api.get<Dashboard>('/dashboard');
        if (!cancelled) {
          setData(next);
          setGoalInput(
            next.repatriationGoalThb != null ? String(next.repatriationGoalThb) : '',
          );
          setError('');
        }
      } catch (err) {
        if (!cancelled) setError(apiError(err, 'โหลดภาพรวมหุ้นนอกไม่สำเร็จ'));
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function saveGoal() {
    setSavingGoal(true);
    setError('');
    try {
      const value = goalInput.trim() === '' ? null : Number(goalInput);
      if (value != null && (!Number.isFinite(value) || value < 0)) {
        throw new Error('เป้าหมายต้องเป็นตัวเลขไม่ติดลบ');
      }
      await api.patch('/settings', { repatriationGoalThb: value });
      const next = await api.get<Dashboard>('/dashboard');
      setData(next);
      setGoalInput(
        next.repatriationGoalThb != null ? String(next.repatriationGoalThb) : '',
      );
    } catch (err) {
      setError(apiError(err, 'บันทึกเป้าหมายไม่สำเร็จ'));
    } finally {
      setSavingGoal(false);
    }
  }

  if (error && !data) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-stone-500">กำลังโหลด...</p>;

  const holdings = data.holdingsForeign;
  const realized = data.realized.filter((row) => row.market === 'foreign');
  const hasQuotes = holdings.some((row) => row.marketValue != null);
  const total = holdings.reduce((sum, row) => sum + (row.marketValue ?? row.totalCost), 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-stone-900">ภาพรวมหุ้นนอก</h1>
          <HideMoneyButton />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          เงินสด USD แลกเงิน และพอร์ตหุ้นต่างประเทศ
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="card grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 className="text-lg font-semibold">เป้าหมายเงินนำกลับ</h2>
          <p className="mt-1 text-sm text-stone-500">
            ต้นทุนเฉลี่ยแลกออก{' '}
            {data.avgOutRate != null ? `${fmt.number(data.avgOutRate, 2)} บาท/USD` : '—'}
            {data.usdThbRate != null
              ? ` · เรทตลาด ${fmt.number(data.usdThbRate, 2)}`
              : ''}
            {data.repatriationProgress != null
              ? ` · คืบหน้า ${fmt.number(data.repatriationProgress * 100, 1)}%`
              : ''}
          </p>
          {data.repatriationGoalThb != null ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-emerald-700"
                style={{
                  width: `${Math.min((data.repatriationProgress ?? 0) * 100, 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-40">
            <span className="label">เป้าหมาย (บาท)</span>
            <input
              type="number"
              min="0"
              step="any"
              className="input"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="เช่น 1000000"
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={savingGoal}
            onClick={() => void saveGoal()}
          >
            {savingGoal ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ForeignCard label="เงินออกประเทศ" value={money.thb(data.thbOut)} />
        <ForeignCard label="เงินนำกลับ" value={money.thb(data.thbIn)} hint="กรอกเองเมื่อนำเข้าจริง" />
        <ForeignCard label="สุทธิต่างประเทศ" value={money.thb(data.thbNetAbroad)} />
        <ForeignCard
          label="ต้นทุนเฉลี่ยแลกออก"
          value={data.avgOutRate != null ? `${fmt.number(data.avgOutRate, 2)} บาท/USD` : '—'}
          hint={
            data.rateVsAvgOut != null
              ? `เรทตลาดห่างจากต้นทุน ${data.rateVsAvgOut >= 0 ? '+' : ''}${fmt.number(data.rateVsAvgOut, 2)}`
              : undefined
          }
        />
        <ForeignCard label="เงินสด USD" value={money.usd(data.cashUsd)} />
        <ForeignCard
          label="มูลค่าหุ้นนอก"
          value={data.marketValueUsd != null ? money.usd(data.marketValueUsd) : '—'}
          hint={`ต้นทุน ${money.usd(data.holdingsCostUsd)}`}
        />
        <ForeignCard
          label="P/L ยังไม่ปิด"
          value={data.pnlUsd != null ? money.signed(fmt.usd, data.pnlUsd) : '—'}
          tone={hidden ? 'flat' : foreignTone(data.pnlUsd)}
        />
        <ForeignCard
          label="P/L ที่ปิดแล้ว"
          value={money.signed(fmt.usd, data.realizedPnlUsd)}
          tone={hidden ? 'flat' : foreignTone(data.realizedPnlUsd)}
        />
        <ForeignCard
          label="ปันผลสุทธิ"
          value={money.usd(data.dividendNetUsd)}
          hint="เข้าเงินสด USD ยังไม่ใช่เงินนำกลับไทย"
        />
      </div>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">พอร์ตหุ้นนอก</h2>
          <Link to="/investment/trades" className="text-sm text-emerald-800">
            บันทึกซื้อขาย
          </Link>
        </div>
        <DonutChart
          slices={holdings.map((row) => ({
            label: row.ticker,
            value: row.marketValue ?? row.totalCost,
          }))}
          center={total ? money.usd(total) : '—'}
          sub={hasQuotes ? 'ตามมูลค่าตลาด' : 'ตามต้นทุน'}
        />
        {holdings.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีหุ้นนอก</p>
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
                  <ForeignHoldingRow
                    key={`${row.market}-${row.ticker}`}
                    row={row}
                    hidden={hidden}
                    format={money.usd}
                    signed={(value) => money.signed(fmt.usd, value)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">กำไรที่ปิดแล้ว (USD)</h2>
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
                      className={`text-right font-medium ${foreignPnlClass(hidden ? null : row.pnl)}`}
                    >
                      {money.signed(fmt.usd, row.pnl)}
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

function ForeignHoldingRow({
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
      <td className={`text-right font-medium ${foreignPnlClass(hidden ? null : row.pnl)}`}>
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

function ForeignCard({
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

function foreignTone(value: number | null): 'up' | 'down' | 'flat' {
  if (value == null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function foreignPnlClass(value: number | null) {
  if (value == null || value === 0) return 'text-stone-700';
  return value > 0 ? 'text-emerald-800' : 'text-red-700';
}
