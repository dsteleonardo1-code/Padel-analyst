import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16">
      <p className="font-display text-3xl font-bold">Pagina non trovata</p>
      <p className="mt-2 text-mute">Il link non corrisponde a una schermata di Fondocampo.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-lime px-4 font-semibold text-ink">
        Torna alle partite
      </Link>
    </div>
  );
}
