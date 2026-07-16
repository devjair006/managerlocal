import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowsClockwise, Check, Copy, LockKey } from "@phosphor-icons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";

interface Props { onBack: () => void; }

const WORDS = [
  "águila", "ambar", "arco", "atlas", "aurora", "avena", "azul", "bahía", "bambu", "brisa", "cacao", "cactus", "cobre", "cometa", "coral", "cuarzo",
  "dalia", "delta", "duna", "ebano", "eco", "faro", "feliz", "flama", "flor", "fuego", "girasol", "glaciar", "hiedra", "horizonte", "isla", "jade",
  "jardin", "lago", "lima", "lince", "luna", "marea", "miel", "monte", "nube", "ocaso", "oliva", "origen", "pino", "pluma", "prisma", "pulso",
  "rayo", "rio", "roble", "rubí", "sal", "savia", "senda", "sol", "tango", "tierra", "trigo", "valle", "vela", "viento", "zafiro", "zenit",
];

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%*-_+=?";

function randomIndex(limit: number): number {
  const range = 0x1_0000_0000;
  const maximum = range - (range % limit);
  const values = new Uint32Array(1);
  do { window.crypto.getRandomValues(values); } while (values[0] >= maximum);
  return values[0] % limit;
}

function shuffle(values: string[]): string[] {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

function createPassword(length: number, groups: string[]): string {
  const required = groups.map((group) => group[randomIndex(group.length)]);
  const characters = groups.join("");
  while (required.length < length) required.push(characters[randomIndex(characters.length)]);
  return shuffle(required).join("");
}

function createPhrase(words: number, includeNumber: boolean): string {
  const selected = Array.from({ length: words }, () => WORDS[randomIndex(WORDS.length)]);
  return `${selected.join("-")}${includeNumber ? `-${NUMBERS[randomIndex(NUMBERS.length)]}${NUMBERS[randomIndex(NUMBERS.length)]}` : ""}`;
}

export function PasswordGenerator({ onBack }: Props) {
  const [mode, setMode] = useState<"password" | "phrase">("password");
  const [length, setLength] = useState(20);
  const [wordCount, setWordCount] = useState(4);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [phraseNumber, setPhraseNumber] = useState(true);
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);

  const groups = useMemo(() => [uppercase && UPPER, lowercase && LOWER, numbers && NUMBERS, symbols && SYMBOLS].filter((group): group is string => Boolean(group)), [uppercase, lowercase, numbers, symbols]);
  const entropy = mode === "password" ? Math.floor(length * Math.log2(Math.max(1, groups.join("").length))) : Math.floor(wordCount * Math.log2(WORDS.length) + (phraseNumber ? Math.log2(64) : 0));
  const strength = entropy >= 80 ? "Muy fuerte" : entropy >= 60 ? "Fuerte" : entropy >= 40 ? "Aceptable" : "Mejorable";

  function generate() {
    if (mode === "password" && groups.length === 0) return;
    setValue(mode === "password" ? createPassword(Math.max(length, groups.length), groups) : createPhrase(wordCount, phraseNumber));
    setCopied(false);
  }

  useEffect(() => { generate(); }, [mode, length, wordCount, uppercase, lowercase, numbers, symbols, phraseNumber]);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return <section className="tool-view password-tool">
    <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><ToolPixelIcon toolId="password-generator" className="password-icon" /><div><p className="eyebrow">Privacidad</p><h1>Contraseñas seguras</h1><p>Genera contraseñas y frases aleatorias sin guardarlas ni enviarlas fuera del equipo.</p></div></div>
    <div className="password-panel">
      <div className="operation-tabs password-tabs"><button className={mode === "password" ? "operation-tab active" : "operation-tab"} onClick={() => setMode("password")}>Contraseña</button><button className={mode === "phrase" ? "operation-tab active" : "operation-tab"} onClick={() => setMode("phrase")}>Frase segura</button></div>
      <div className="password-output"><code>{value || "Activa al menos una opción"}</code><div><button className="secondary-button" onClick={generate} disabled={mode === "password" && !groups.length}><ArrowsClockwise /> Generar otra</button><button className="primary-button compact" onClick={() => void copy()} disabled={!value}>{copied ? <Check /> : <Copy />}{copied ? "Copiada" : "Copiar"}</button></div></div>
      <div className="strength-meter"><span><strong>{strength}</strong><small>{entropy} bits estimados</small></span><i style={{ "--strength": `${Math.min(100, entropy)}%` } as React.CSSProperties} /></div>
      {mode === "password" ? <><div className="range-row"><label htmlFor="password-length">Longitud</label><output>{length} caracteres</output></div><input id="password-length" type="range" min="8" max="64" value={length} onChange={(event) => setLength(Number(event.target.value))} /><div className="password-options"><label><input type="checkbox" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} /> Mayúsculas</label><label><input type="checkbox" checked={lowercase} onChange={(event) => setLowercase(event.target.checked)} /> Minúsculas</label><label><input type="checkbox" checked={numbers} onChange={(event) => setNumbers(event.target.checked)} /> Números</label><label><input type="checkbox" checked={symbols} onChange={(event) => setSymbols(event.target.checked)} /> Símbolos</label></div></> : <><div className="range-row"><label htmlFor="phrase-words">Palabras</label><output>{wordCount} palabras</output></div><input id="phrase-words" type="range" min="3" max="8" value={wordCount} onChange={(event) => setWordCount(Number(event.target.value))} /><label className="permission-confirm"><input type="checkbox" checked={phraseNumber} onChange={(event) => setPhraseNumber(event.target.checked)} /> Añadir dos números al final</label></>}
      <p className="privacy-note">Usa una contraseña distinta por cuenta y guárdala en un administrador de contraseñas confiable.</p>
    </div>
  </section>;
}
