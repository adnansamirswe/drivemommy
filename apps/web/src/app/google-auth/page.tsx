"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { exchangeGoogleToken } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function GoogleAuthHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(params.get("status") === "error" ? "Google sign-in was denied or failed. Try again." : null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) return;
    exchangeGoogleToken(token)
      .then(() => router.replace("/dashboard"))
      .catch(() => setError("Google login session expired. Please try again."));
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{error ? "Sign-in failed" : "Finishing sign-in…"}</CardTitle>
          <CardDescription>{error ?? "Exchanging your Google session."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm font-medium text-zinc-900 underline">Back to sign in</Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense>
      <GoogleAuthHandler />
    </Suspense>
  );
}
