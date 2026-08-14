import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DonutChart } from '../components/DonutChart';
import { apiError, fmt } from '../format';
import type { Dashboard, Holding } from '../types';

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Dashboard>('/dashboard')
      .then(setData)
      .catch((err) => setError(apiError(err, 'โหลดภาพรวมไม่สำเร็จ')));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-stone-500">กำลังโหลด...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">ภาพรวมพอร์ต</h1>
        <p className="text-sm text-stone-500">
          สรุปเงินเข้าออกประเทศ และแยกหุ้นไทยกับหุ้นนอกตามต้นทุนที่บันทึก
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="เงินออกประเทศ" value={fmt.thb(data.thbOut)} />
        <Card label="เงินนำกลับ" value={fmt.thb(data.thbIn)} hint="กรอกเองเมื่อนำเข้าจริง" />
        <Card label="สุทธิต่างประเทศ" value={fmt.thb(data.thbNetAbroad)} />
        <Card
          label="เรทเฉลี่ยเงินออก"
          value={data.avgOutRate ? `${fmt.rate(data.avgOutRate)} บาท/USD` : '—'}
        />
        <Card label="เงินสด USD" value={fmt.usd(data.cashUsd)} />
        <Card
          label="ปันผลสุทธิ"
          value={fmt.usd(data.dividendNetUsd)}
          hint="เข้าเงินสด USD ยังไม่ใช่เงินนำกลับไทย"
        />
        <Card label="ต้นทุนหุ้นนอก" value={fmt.usd(data.holdingsCostUsd)} />
        <Card label="ต้นทุนหุ้นไทย" value={fmt.thb(data.holdingsCostThb)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HoldingsCard
          title="หุ้นนอก"
          holdings={data.holdingsForeign}
          money={fmt.usd}
          empty="ยังไม่มีหุ้นนอก"
        />
        <HoldingsCard
          title="หุ้นไทย"
          holdings={data.holdingsThai}
          money={fmt.thb}
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
  empty,
}: {
  title: string;
  holdings: Holding[];
  money: (value: number) => string;
  empty: string;
}) {
  const total = holdings.reduce((sum, row) => sum + row.totalCost, 0);
  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link to="/trades" className="text-sm text-emerald-800">
          บันทึกซื้อขาย
        </Link>
      </div>
      <DonutChart
        slices={holdings.map((row) => ({ label: row.ticker, value: row.totalCost }))}
        center={total ? money(total) : '—'}
        sub="ตามต้นทุน"
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
                <th className="text-right">ต้นทุนเฉลี่ย</th>
                <th className="text-right">ต้นทุนรวม</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((row) => (
                <tr key={`${row.market}-${row.ticker}`}>
                  <td className="font-medium">{row.ticker}</td>
                  <td className="text-right">{fmt.shares(row.shares)}</td>
                  <td className="text-right">{money(row.avgCost)}</td>
                  <td className="text-right">{money(row.totalCost)}</td>
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
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}
