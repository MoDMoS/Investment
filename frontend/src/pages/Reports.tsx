import { useEffect, useState } from 'react';
import { api } from '../api';
import { HideMoneyButton } from '../components/HideMoneyButton';
import { apiError, fmt } from '../format';
import { useMoneyFmt, usePrivacy } from '../privacy';
import type { PeriodSummary } from '../types';

export function ReportsPage() {
  const money = useMoneyFmt();
  const { hidden } = usePrivacy();
  const now = new Date();
  const [period, setPeriod] = useState<'year' | 'month'>('year');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PeriodSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const query =
      period === 'month'
        ? `/reports/summary?period=month&year=${year}&month=${month}`
        : `/reports/summary?period=year&year=${year}`;
    api
      .get<PeriodSummary>(query)
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError('');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, 'โหลดสรุปไม่สำเร็จ'));
      });
    return () => {
      cancelled = true;
    };
  }, [period, year, month]);

  const years = Array.from({ length: 8 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">สรุปรายปี / รายเดือน</h1>
          <HideMoneyButton />
        </div>
        <p className="mt-1 text-sm text-stone-500">
          ปันผล กำไรที่ปิดแล้ว และเงินออก–นำกลับ ตามช่วงเวลาที่เลือก
        </p>
      </div>

      <section className="card grid gap-3 md:grid-cols-4">
        <label className="block">
          <span className="label">ช่วง</span>
          <select
            className="input"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'year' | 'month')}
          >
            <option value="year">รายปี</option>
            <option value="month">รายเดือน</option>
          </select>
        </label>
        <label className="block">
          <span className="label">ปี</span>
          <select
            className="input"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        {period === 'month' ? (
          <label className="block">
            <span className="label">เดือน</span>
            <select
              className="input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((value) => (
                <option key={value} value={value}>
                  {String(value).padStart(2, '0')}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!data && !error ? <p className="text-stone-500">กำลังโหลด...</p> : null}

      {data ? (
        <>
          <p className="text-sm text-stone-500">
            {data.label} · {data.start} ถึง {data.end} · แลกเงิน {data.transferCount} · ซื้อขาย{' '}
            {data.tradeCount} · ปันผล {data.dividendCount}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="เงินออกประเทศ" value={money.thb(data.thbOut)} />
            <Card label="เงินนำกลับ" value={money.thb(data.thbIn)} />
            <Card label="สุทธิต่างประเทศ" value={money.thb(data.thbNetAbroad)} />
            <Card
              label="ต้นทุนเฉลี่ยแลกออก"
              value={data.avgOutRate != null ? fmt.number(data.avgOutRate, 2) : '—'}
            />
            <Card label="ปันผลสุทธิ USD" value={money.usd(data.dividendNetUsd)} />
            <Card label="ปันผลสุทธิบาท" value={money.thb(data.dividendNetThb)} />
            <Card
              label="P/L ที่ปิด (USD)"
              value={money.signed(fmt.usd, data.realizedPnlUsd)}
              tone={hidden ? 'flat' : tone(data.realizedPnlUsd)}
            />
            <Card
              label="P/L ที่ปิด (บาท)"
              value={money.signed(fmt.thb, data.realizedPnlThb)}
              tone={hidden ? 'flat' : tone(data.realizedPnlThb)}
            />
          </div>

          {data.months ? (
            <section className="card overflow-x-auto">
              <h2 className="mb-3 text-lg font-semibold">แยกรายเดือนปี {data.year}</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>เดือน</th>
                    <th className="text-right">เงินออก</th>
                    <th className="text-right">นำกลับ</th>
                    <th className="text-right">ปันผล USD</th>
                    <th className="text-right">ปันผลบาท</th>
                    <th className="text-right">P/L USD</th>
                    <th className="text-right">P/L บาท</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((row) => (
                    <tr key={row.month}>
                      <td>{row.label}</td>
                      <td className="text-right">{money.thb(row.thbOut)}</td>
                      <td className="text-right">{money.thb(row.thbIn)}</td>
                      <td className="text-right">{money.usd(row.dividendNetUsd)}</td>
                      <td className="text-right">{money.thb(row.dividendNetThb)}</td>
                      <td className="text-right">{money.signed(fmt.usd, row.realizedPnlUsd)}</td>
                      <td className="text-right">{money.signed(fmt.thb, row.realizedPnlThb)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'flat';
}) {
  const color =
    tone === 'up' ? 'text-green-400' : tone === 'down' ? 'text-red-400' : 'text-stone-900';
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function tone(value: number): 'up' | 'down' | 'flat' {
  if (value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
}
