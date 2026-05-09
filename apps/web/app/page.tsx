import { Disclaimer } from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <main className="px-6 py-8 space-y-6">
      <Disclaimer />
      <section>
        <h2 className="text-xl font-semibold mb-4">Alertas priorizadas</h2>
        <p className="text-sm text-slate-600">
          P3 conecta aquí <code>AlertsTable</code> con <code>/alerts</code>.
        </p>
      </section>
    </main>
  );
}
