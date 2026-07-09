export type RecentOutput = {
  path: string;
  label: string;
  directory: boolean;
  createdAt: number;
};

const STORAGE_KEY = "managerlocal.recentOutputs";
const EVENT_NAME = "managerlocal:output-recorded";
const MAX_OUTPUTS = 12;

export function loadRecentOutputs(): RecentOutput[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentOutput => Boolean(
      item && typeof item === "object" && typeof item.path === "string" && typeof item.label === "string" && typeof item.directory === "boolean" && typeof item.createdAt === "number",
    )).slice(0, MAX_OUTPUTS);
  } catch {
    return [];
  }
}

export function recordOutput(output: Omit<RecentOutput, "createdAt">): RecentOutput[] {
  const entry: RecentOutput = { ...output, createdAt: Date.now() };
  const next = [entry, ...loadRecentOutputs().filter((item) => item.path !== entry.path)].slice(0, MAX_OUTPUTS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<RecentOutput[]>(EVENT_NAME, { detail: next }));
  return next;
}

export function clearRecentOutputs(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent<RecentOutput[]>(EVENT_NAME, { detail: [] }));
}

export function listenToRecentOutputs(callback: (outputs: RecentOutput[]) => void): () => void {
  function handle(event: Event) {
    callback((event as CustomEvent<RecentOutput[]>).detail);
  }
  window.addEventListener(EVENT_NAME, handle);
  return () => window.removeEventListener(EVENT_NAME, handle);
}
