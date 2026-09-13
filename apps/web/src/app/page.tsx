import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Database, FolderTree, HardDrive, KeyRound, LayoutDashboard, UploadCloud, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: HardDrive, title: "Multi-drive pooling", desc: "Connect unlimited Google Drive accounts. Space, files and quota aggregated per user." },
  { icon: UploadCloud, title: "Smart routing", desc: "Most-available, round-robin or priority. Files stream directly to Drive — zero disk usage." },
  { icon: FolderTree, title: "Virtual folders", desc: "App-level organization mapped onto a single Drive folder. Sync back any time." },
  { icon: KeyRound, title: "Developer API", desc: "Scoped REST keys for upload, list, download, delete and quota. Works from any backend." },
  { icon: Database, title: "Postgres + Prisma", desc: "Clean relational model for users, accounts, files, sessions and audit logs." },
  { icon: LayoutDashboard, title: "Clean dashboard", desc: "Manage files, drives and API keys in a fast Next.js interface." },
];

const endpoints = [
  "POST /api/v1/uploads — multipart, streams to Drive",
  "GET /api/v1/files — search, filter by drive/folder",
  "GET /api/v1/files/:id/download — proxied stream",
  "GET /api/v1/storage/summary — quota per drive",
];

const routing = [
  { t: "Most available", d: "Picks the drive with the most free space that fits the file. Zero config." },
  { t: "Round robin", d: "Evenly spreads uploads across eligible drives. Cursor stored per user." },
  { t: "Priority", d: "Ordered list of account IDs. First one with space wins." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="DriveMommy" width={140} height={32} className="h-8 w-auto" priority />
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#api" className="transition-colors hover:text-foreground">API</a>
            <a href="#routing" className="transition-colors hover:text-foreground">Routing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5">Get started <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid mask-fade absolute inset-0" aria-hidden />
        <div className="absolute left-1/2 top-0 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-zinc-100/80 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-24 text-center md:pt-32">
          <Badge className="mb-6 gap-1">
            <Zap className="h-3 w-3" />
            Postgres · Bun + Hono · Next.js
          </Badge>
          <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.08] tracking-tight md:text-7xl">
            All your Google Drives,
            <br />
            <span className="text-gradient">behind one clean API.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-7 text-muted-foreground">
            Connect multiple Drive accounts, route uploads to whichever has space,
            and let your apps upload, list and download files with scoped API keys.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-6">
                Start connecting <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#api">
              <Button variant="outline" size="lg" className="gap-2 px-6">
                Read the API
              </Button>
            </a>
          </div>
          <div className="mx-auto mt-14 flex max-w-lg items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">N</p>
              <p className="mt-0.5">drives / user</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">0 bytes</p>
              <p className="mt-0.5">stored on server</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">6</p>
              <p className="mt-0.5">API scopes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What you get</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
          A storage gateway without the clutter.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-xl border border-border bg-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 transition-colors group-hover:bg-zinc-200">
                <f.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API */}
      <section id="api" className="border-y border-border bg-zinc-50/50">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Developer API</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Upload once, read anywhere.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Create a key with only the scopes you need, then call the REST API from any
              backend, script or edge function. Uploads automatically pick a Drive with
              enough free space — or pin one with <code className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">targetAccountId</code>.
            </p>
            <ul className="mt-6 space-y-3">
              {endpoints.map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                  <code className="font-mono text-xs leading-6">{t}</code>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 code-block text-zinc-100">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <span className="ml-2 text-xs text-zinc-500">curl</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7">
{`curl -X POST $API/api/v1/uploads \\
  -H "Authorization: Bearer dm_live_..." \\
  -F "file=@report.pdf" \\
  -F "targetAccountId=acc_123"

# response
{ "file": { "id": "f_...",
  "providerFileId": "1Ab...",
  "connectedAccountId": "acc_123",
  "sizeBytes": "245760" } }`}
            </pre>
          </div>
        </div>
      </section>

      {/* Routing */}
      <section id="routing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-4 md:grid-cols-3">
          {routing.map((r, i) => (
            <div key={r.t} className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold text-foreground">
                {i + 1}
              </div>
              <h3 className="mt-3 text-base font-semibold">{r.t}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{r.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-card px-8 py-7 md:flex-row">
          <div>
            <p className="text-sm font-medium">Self-host in minutes with Docker</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Postgres + API + web in one compose file.</p>
          </div>
          <Link href="/register">
            <Button className="gap-2">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="DriveMommy" width={100} height={24} className="h-5 w-auto opacity-50" />
            <span>MIT. Bring your own Google Cloud project.</span>
          </div>
          <span className="hidden sm:inline">Next.js · Hono · Postgres</span>
        </div>
      </footer>
    </div>
  );
}
