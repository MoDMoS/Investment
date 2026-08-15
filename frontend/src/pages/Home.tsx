import { Link } from 'react-router-dom';
import { TopBar } from '../components/TopBar';

type Service = {
  id: string;
  name: string;
  description: string;
  to?: string;
  href?: string;
  available: boolean;
};

const goldAgentUrl = import.meta.env.VITE_GOLD_AGENT_URL?.trim();

const services: Service[] = [
  {
    id: 'investment',
    name: 'บันทึกการลงทุน',
    description: 'แลกเงิน ซื้อขายหุ้นไทย/นอก ปันผล และภาพรวมพอร์ต',
    to: '/investment',
    available: true,
  },
  {
    id: 'gold-agent',
    name: 'Gold Agent',
    description: 'ราคาทองคำ สัญญาณเทรด และกราฟแท่งเทียน',
    href: goldAgentUrl,
    available: Boolean(goldAgentUrl),
  },
];

function ServiceCard({ service }: { service: Service }) {
  const body = (
    <>
      <p className="font-brand text-lg font-bold tracking-tight text-stone-900">
        {service.name}
      </p>
      <p className="mt-2 text-sm text-stone-500">{service.description}</p>
      {service.available ? (
        <p className="mt-4 text-sm font-semibold text-emerald-800">เข้าใช้งาน →</p>
      ) : (
        <p className="mt-4 text-sm text-stone-400">เร็วๆ นี้</p>
      )}
    </>
  );

  const cardClass =
    'card block h-full transition hover:border-emerald-700/50 hover:-translate-y-0.5';

  if (service.available && service.to) {
    return (
      <Link to={service.to} className={cardClass}>
        {body}
      </Link>
    );
  }

  if (service.available && service.href) {
    return (
      <a href={service.href} className={cardClass}>
        {body}
      </a>
    );
  }

  return <div className={`${cardClass} opacity-55`}>{body}</div>;
}

export function HomePage() {
  return (
    <div className="min-h-screen">
      <TopBar title="MoDMoS" subtitle="เลือกบริการ" />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-2 flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}favicon.png`}
            alt=""
            className="h-12 w-12 rounded-xl shadow-lg"
          />
          <div>
            <h1 className="font-brand text-3xl font-bold tracking-tight text-stone-900">
              เลือกบริการ
            </h1>
            <p className="mt-1 text-stone-500">
              โปรเจกต์ในเครือ MoDMoS — เพิ่มบริการอื่นได้ภายหลัง
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.id}>
              <ServiceCard service={service} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
