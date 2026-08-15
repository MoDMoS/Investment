import { Link } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

type Service = {
  id: string;
  name: string;
  description: string;
  to?: string;
  available: boolean;
};

const services: Service[] = [
  {
    id: 'investment',
    name: 'บันทึกการลงทุน',
    description: 'แลกเงิน ซื้อขายหุ้นไทย/นอก ปันผล และภาพรวมพอร์ต',
    to: '/investment',
    available: true,
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen">
      <TopBar title="Personal Tools" />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          เลือกบริการ
        </h1>
        <p className="mt-2 text-stone-500">
          เลือกโปรเจกต์ที่ต้องการใช้งาน — จะเพิ่มบริการอื่นในภายหลัง
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.id}>
              {service.available && service.to ? (
                <Link
                  to={service.to}
                  className="card block h-full transition hover:border-emerald-700/40 hover:shadow-md"
                >
                  <p className="text-lg font-semibold text-stone-900">{service.name}</p>
                  <p className="mt-2 text-sm text-stone-500">{service.description}</p>
                  <p className="mt-4 text-sm font-medium text-emerald-800">เข้าใช้งาน →</p>
                </Link>
              ) : (
                <div className="card h-full opacity-60">
                  <p className="text-lg font-semibold text-stone-900">{service.name}</p>
                  <p className="mt-2 text-sm text-stone-500">{service.description}</p>
                  <p className="mt-4 text-sm text-stone-400">เร็วๆ นี้</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
