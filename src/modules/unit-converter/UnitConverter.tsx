import { useMemo, useState } from "react";
import { ArrowLeft, ArrowsLeftRight, CalendarBlank, Ruler } from "@phosphor-icons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { convertUnit, formatInZone, timeZones, unitCategories, zonedDateToInstant, type UnitCategory } from "./unit-converter.service";

interface Props { onBack: () => void }
type Mode = "units" | "time";
const initialDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function readable(value: number | null) { return value === null ? "—" : new Intl.NumberFormat("es-NI", { maximumFractionDigits: 8 }).format(value); }

export function UnitConverter({ onBack }: Props) {
  const [mode, setMode] = useState<Mode>("units"); const [category, setCategory] = useState<UnitCategory>("length");
  const [value, setValue] = useState("1"); const [from, setFrom] = useState("m"); const [to, setTo] = useState("ft");
  const [date, setDate] = useState(initialDate); const [sourceZone, setSourceZone] = useState("America/Managua"); const [targetZone, setTargetZone] = useState("Europe/Madrid");
  const units = unitCategories[category].units;
  const result = useMemo(() => convertUnit(Number(value), category, from, to), [value, category, from, to]);
  const convertedDate = useMemo(() => { try { const instant = zonedDateToInstant(date, sourceZone); return instant ? formatInZone(instant, targetZone) : "Fecha no válida"; } catch { return "Zona horaria no compatible"; } }, [date, sourceZone, targetZone]);
  function changeCategory(next: UnitCategory) { const nextUnits = unitCategories[next].units; setCategory(next); setFrom(nextUnits[0].id); setTo(nextUnits[1].id); }
  function swapUnits() { setFrom(to); setTo(from); }

  return <section className="tool-view"><button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><ToolPixelIcon toolId="unit-converter" className="unit-icon" /><div><p className="eyebrow">Productividad</p><h1>Conversor universal</h1><p>Convierte unidades, fechas y zonas horarias sin conexión.</p></div></div>
    <div className="unit-mode-tabs"><button className={mode === "units" ? "active" : ""} onClick={() => setMode("units")}><Ruler /> Unidades</button><button className={mode === "time" ? "active" : ""} onClick={() => setMode("time")}><CalendarBlank /> Fecha y hora</button></div>
    {mode === "units" ? <div className="file-tool-panel unit-panel">
      <div className="unit-categories">{(Object.keys(unitCategories) as UnitCategory[]).map((key) => <button key={key} className={category === key ? "active" : ""} onClick={() => changeCategory(key)}>{unitCategories[key].label}</button>)}</div>
      <div className="unit-conversion-grid"><label><span>Cantidad</span><input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></label><label><span>De</span><select value={from} onChange={(e) => setFrom(e.target.value)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.symbol})</option>)}</select></label>
        <button className="unit-swap" onClick={swapUnits} aria-label="Intercambiar unidades"><ArrowsLeftRight /></button><label><span>A</span><select value={to} onChange={(e) => setTo(e.target.value)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label} ({unit.symbol})</option>)}</select></label></div>
      <div className="unit-result"><small>Resultado</small><strong>{readable(result)}</strong><span>{units.find((unit) => unit.id === to)?.symbol}</span></div>
    </div> : <div className="file-tool-panel unit-panel"><div className="timezone-grid"><label><span>Fecha y hora</span><input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></label><label><span>Zona de origen</span><select value={sourceZone} onChange={(e) => setSourceZone(e.target.value)}>{timeZones.map((zone) => <option key={zone}>{zone}</option>)}</select></label><label><span>Convertir a</span><select value={targetZone} onChange={(e) => setTargetZone(e.target.value)}>{timeZones.map((zone) => <option key={zone}>{zone}</option>)}</select></label></div><div className="unit-result time-result"><small>Hora convertida en {targetZone}</small><strong>{convertedDate}</strong></div><p className="tool-notice">La conversión considera automáticamente el horario de verano de cada zona.</p></div>}
    <p className="privacy-note unit-privacy">Cálculos realizados localmente en tu dispositivo</p>
  </section>;
}
