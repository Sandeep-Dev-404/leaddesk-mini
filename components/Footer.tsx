export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-500">
        <p>
          <a
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline underline-offset-2"
          >
            Built for Digital Heroes Training Task
          </a>
        </p>
        <p className="mt-1">LeadDesk Mini &middot; Next.js, Prisma, PostgreSQL</p>
      </div>
    </footer>
  );
}