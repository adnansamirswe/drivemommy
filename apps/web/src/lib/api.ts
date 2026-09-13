export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Opts = RequestInit & { token?: string };

export async function apiFetch<T>(path: string, opts: Opts = {}): Promise<T> {
  const { token, ...init } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function formatBytes(value: string | number | bigint | null | undefined): string {
  if (value == null) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
