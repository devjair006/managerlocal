import { useMemo, useState } from "react";
import { ArrowLeft, FileText, FolderOpen } from "@phosphor-icons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { compareLines, pickTextFile } from "./text-diff.service";

interface Props { onBack: () => void; }
function name(path: string) { return path.split(/[\\/]/).pop() ?? path; }

export function TextDiff({ onBack }: Props) {
  const [left, setLeft] = useState(""); const [right, setRight] = useState("");
  const [leftName, setLeftName] = useState("Texto original"); const [rightName, setRightName] = useState("Texto nuevo");
  const [fileError, setFileError] = useState("");
  const comparison = useMemo(() => { try { return { diff: compareLines(left, right), error: "" }; } catch (cause) { return { diff: [], error: cause instanceof Error ? cause.message : String(cause) }; } }, [left, right]);
  const diff = comparison.diff; const error = fileError || comparison.error;
  const changed = diff.filter((line) => line.kind !== "same").length;

  async function choose(side: "left" | "right") {
    try { const file = await pickTextFile(); if (!file) return; if (side === "left") { setLeft(file.content); setLeftName(name(file.path)); } else { setRight(file.content); setRightName(name(file.path)); } setFileError(""); }
    catch (cause) { setFileError(cause instanceof Error ? cause.message : String(cause)); }
  }

  return <section className="tool-view"><button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><ToolPixelIcon toolId="text-diff" className="diff-icon" /><div><p className="eyebrow">Productividad</p><h1>Comparador de texto</h1><p>Pega contenido o abre dos archivos para encontrar sus diferencias.</p></div></div>
    <div className="diff-editors">
      <label><span><strong>{leftName}</strong><button onClick={() => void choose("left")}><FolderOpen /> Abrir archivo</button></span><textarea value={left} onChange={(event) => { setLeft(event.target.value); setLeftName("Texto original"); }} placeholder="Pega aquí el texto original" spellCheck={false} /></label>
      <label><span><strong>{rightName}</strong><button onClick={() => void choose("right")}><FolderOpen /> Abrir archivo</button></span><textarea value={right} onChange={(event) => { setRight(event.target.value); setRightName("Texto nuevo"); }} placeholder="Pega aquí el texto nuevo" spellCheck={false} /></label>
    </div>
    <div className="diff-result"><div className="diff-summary"><strong>{changed ? `${changed} cambio(s)` : "Sin diferencias"}</strong><span><i className="removed" /> Eliminado</span><span><i className="added" /> Añadido</span></div>
      <div className="diff-lines">{diff.map((line, index) => <div className={`diff-line ${line.kind}`} key={`${index}-${line.kind}`}><span>{line.left ?? ""}</span><span>{line.right ?? ""}</span><b>{line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " "}</b><code>{line.text || " "}</code></div>)}</div>
    </div>{error && <p className="error-text tool-error">{error}</p>}
  </section>;
}
