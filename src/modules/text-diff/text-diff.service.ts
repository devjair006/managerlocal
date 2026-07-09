export type DiffKind = "same" | "added" | "removed";
export type DiffLine = { kind: DiffKind; left?: number; right?: number; text: string };

export function compareLines(leftText: string, rightText: string): DiffLine[] {
  const left = leftText.replace(/\r\n/g, "\n").split("\n");
  const right = rightText.replace(/\r\n/g, "\n").split("\n");
  if (left.length > 1500 || right.length > 1500) throw new Error("El comparador admite hasta 1500 líneas por lado");
  const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const result: DiffLine[] = [];
  let i = 0; let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) { result.push({ kind: "same", left: i + 1, right: j + 1, text: left[i] }); i++; j++; }
    else if (j < right.length && (i === left.length || table[i][j + 1] >= table[i + 1][j])) { result.push({ kind: "added", right: j + 1, text: right[j++] }); }
    else { result.push({ kind: "removed", left: i + 1, text: left[i++] }); }
  }
  return result;
}

export async function pickTextFile(): Promise<{ path: string; content: string } | null> {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error("Abrir archivos requiere la aplicación de escritorio");
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open({ multiple: false, directory: false, filters: [{ name: "Archivos de texto", extensions: ["txt", "md", "html", "css", "js", "ts", "tsx", "jsx", "json", "xml", "csv", "yml", "yaml", "toml", "rs", "py"] }] });
  if (typeof path !== "string") return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return { path, content: await invoke<string>("read_text_file", { path }) };
}
