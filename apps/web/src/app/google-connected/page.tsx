"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function Status() {
  const params = useSearchParams();
  const ok = params.get("status") === "success";
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">{ok ? "Drive connected" : "Connection failed"}</CardTitle>
          <CardDescription>
            {ok ? "Your Google Drive is connected and quota is syncing." : "Google did not return the required permissions. Try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/drives">
            <Button className="w-full">Go to Drives</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GoogleConnectedPage() {
  return (
    <Suspense>
      <Status />
    </Suspense>
  );
}
