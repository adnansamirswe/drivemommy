import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="DriveMommy" width={170} height={38} className="h-10 w-auto" priority />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 14, 2026</p>

        <div className="prose prose-zinc mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              DriveMommy (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is an open-source, self-hosted storage gateway.
              This Privacy Policy explains how we handle data when you use DriveMommy, whether hosted by us or self-hosted on your own infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Data We Access</h2>
            <p>When you connect a Google Drive account, DriveMommy accesses:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Your Google account email and display name (for identification)</li>
              <li>File metadata (names, sizes, types) within your Drive</li>
              <li>Storage quota information (total, used, available bytes)</li>
            </ul>
            <p className="mt-2">
              We do <strong className="text-foreground">not</strong> read, copy, or store the contents of your files.
              Files stream directly from your server to Google Drive without being written to disk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Data</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">File metadata</strong> is stored in our database to enable search, indexing, and quota tracking.</li>
              <li><strong className="text-foreground">OAuth tokens</strong> are encrypted at rest and used solely to communicate with the Google Drive API on your behalf.</li>
              <li><strong className="text-foreground">Account information</strong> is used to authenticate you and associate files with the correct account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Storage and Security</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>All data is stored in a PostgreSQL database that you control.</li>
              <li>OAuth tokens are encrypted using AES-256 before storage.</li>
              <li>Passwords are hashed using Argon2id.</li>
              <li>API keys are stored as SHA-256 hashes — the raw secret is shown once and never stored.</li>
              <li>All communication with Google APIs uses TLS encryption.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Third-Party Services</h2>
            <p>DriveMommy integrates with the following third-party services:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Google Drive API</strong> — to access your Drive files and storage quota. Subject to Google&apos;s <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>.</li>
            </ul>
            <p className="mt-2">We do not share your data with any other third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p>
              Your data is retained for as long as your account is active. When you disconnect a Google Drive account,
              the associated tokens are deleted. File metadata is removed when you delete files or disconnect an account.
              Soft-deleted files are retained for 30 days before permanent removal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Access all data stored about you via the dashboard or API.</li>
              <li>Disconnect Google Drive accounts at any time.</li>
              <li>Delete your account and all associated data.</li>
              <li>Export your data through the developer API.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Self-Hosted Instances</h2>
            <p>
              If you self-host DriveMommy, this Privacy Policy does not apply to your instance.
              You are solely responsible for the data you collect and store. We have no access to
              self-hosted databases, files, or credentials.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated revision date. Continued use of DriveMommy after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, open an issue on{" "}
              <a href="https://github.com/adnansamirswe/drivemommy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                GitHub
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="DriveMommy" width={120} height={28} className="h-6 w-auto opacity-50" />
            <span>MIT License</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Built by <a href="https://samirzn.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">Samir</a></span>
            <a href="https://github.com/adnansamirswe/drivemommy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
