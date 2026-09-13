"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { getAccessToken } from "./auth";
import { API_URL } from "./api";

const fetcher = async (key: string) => {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${key}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("Session expired");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  return body;
};

export function useAuthedSWR<T>(key: string | null, opts?: SWRConfiguration<T>) {
  return useSWR<T>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000,
    ...opts,
  });
}
