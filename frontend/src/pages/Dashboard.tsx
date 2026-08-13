import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { apiError, fmt } from '../format';
import type { Dashboard } from '../types';

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
          สรุปเงินเข้าออกประเทศและหุ้นที่ถือจากต้นทุนที่บันทึก
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
        <Card label="ต้นทุนหุ้นที่ถือ" value={fmt.usd(data.holdingsCostUsd)} />
      </div>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">หุ้นที่ถืออยู่</h2>
          <Link to="/trades" className="text-sm text-emerald-800">
            บันทึกซื้อขาย
          </Link>
        </div>
        {data.holdings.length === 0 ? (
          <p className="text-sm text-stone-500">ยังไม่มีหุ้นในพอร์ต</p>
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
                {data.holdings.map((row) => (
                  <tr key={row.ticker}>
                    <td className="font-medium">{row.ticker}</td>
                    <td className="text-right">{fmt.shares(row.shares)}</td>
                    <td className="text-right">{fmt.usd(row.avgCostUsd)}</td>
                    <td className="text-right">{fmt.usd(row.totalCostUsd)}</td>
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
