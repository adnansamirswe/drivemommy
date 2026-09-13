import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="DriveMommy" width={140} height={32} className="h-8 w-auto" priority />
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 14, 2026</p>

        <div className="prose prose-zinc mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DriveMommy (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>
              DriveMommy is an open-source storage gateway that allows you to connect multiple Google Drive accounts,
              pool storage, and manage files through a web dashboard and REST API. The Service is provided &quot;as is&quot;
              without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Your Responsibilities</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>You must own or have authorization for the Google Drive accounts you connect.</li>
              <li>You are responsible for maintaining the security of your API keys and credentials.</li>
              <li>You must not use the Service to store or distribute illegal, harmful, or infringing content.</li>
              <li>You must not attempt to circumvent rate limits, quotas, or security measures.</li>
              <li>You must not use the Service for any purpose that violates applicable laws or regulations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. API Usage</h2>
            <p>
              The developer API is provided for programmatic access to your own data. You are responsible for
              all activity that occurs through your API keys. API keys can be revoked at any time from the dashboard.
            </p>
            <p className="mt-2">
              We reserve the right to impose rate limits and usage quotas to protect the Service from abuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Intellectual Property</h2>
            <p>
              DriveMommy is released under the MIT License. You are free to use, modify, and distribute the software
              in accordance with the license terms. The Service name, logo, and documentation are our intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of data, loss of profits, or
              business interruption, arising from your use of the Service.
            </p>
            <p className="mt-2">
              We do not guarantee uninterrupted access to the Service. We are not responsible for any data loss
              resulting from Google Drive API outages, account suspensions, or force majeure events.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Termination</h2>
            <p>
              You may stop using the Service at any time. You can delete your account from the dashboard.
              We reserve the right to suspend or terminate access to the Service at our discretion, with or
              without notice, for conduct that we believe violates these Terms or is harmful to other users or the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Self-Hosted Instances</h2>
            <p>
              If you self-host DriveMommy, these Terms govern your use of the software. You are responsible for
              your own deployment, data, and compliance with applicable laws. We have no control over or access
              to self-hosted instances.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes constitutes
              acceptance of the updated Terms. We will notify users of material changes through the Service or
              by email when possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p>
              For questions about these Terms, open an issue on{" "}
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
            <Image src="/logo.png" alt="DriveMommy" width={100} height={24} className="h-5 w-auto opacity-50" />
            <span>MIT License</span>
          </div>
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  );
}
