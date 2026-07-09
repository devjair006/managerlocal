export type UnitCategory = "length" | "mass" | "temperature" | "data";

export type UnitDefinition = { id: string; label: string; symbol: string; factor?: number };

export const unitCategories: Record<UnitCategory, { label: string; units: UnitDefinition[] }> = {
  length: { label: "Longitud", units: [
    { id: "mm", label: "Milímetros", symbol: "mm", factor: 0.001 },
    { id: "cm", label: "Centímetros", symbol: "cm", factor: 0.01 },
    { id: "m", label: "Metros", symbol: "m", factor: 1 },
    { id: "km", label: "Kilómetros", symbol: "km", factor: 1000 },
    { id: "in", label: "Pulgadas", symbol: "in", factor: 0.0254 },
    { id: "ft", label: "Pies", symbol: "ft", factor: 0.3048 },
    { id: "mi", label: "Millas", symbol: "mi", factor: 1609.344 },
  ] },
  mass: { label: "Masa", units: [
    { id: "mg", label: "Miligramos", symbol: "mg", factor: 0.000001 },
    { id: "g", label: "Gramos", symbol: "g", factor: 0.001 },
    { id: "kg", label: "Kilogramos", symbol: "kg", factor: 1 },
    { id: "oz", label: "Onzas", symbol: "oz", factor: 0.028349523125 },
    { id: "lb", label: "Libras", symbol: "lb", factor: 0.45359237 },
    { id: "t", label: "Toneladas", symbol: "t", factor: 1000 },
  ] },
  temperature: { label: "Temperatura", units: [
    { id: "c", label: "Celsius", symbol: "°C" }, { id: "f", label: "Fahrenheit", symbol: "°F" }, { id: "k", label: "Kelvin", symbol: "K" },
  ] },
  data: { label: "Datos", units: [
    { id: "b", label: "Bytes", symbol: "B", factor: 1 }, { id: "kb", label: "Kilobytes", symbol: "KB", factor: 1024 },
    { id: "mb", label: "Megabytes", symbol: "MB", factor: 1024 ** 2 }, { id: "gb", label: "Gigabytes", symbol: "GB", factor: 1024 ** 3 },
    { id: "tb", label: "Terabytes", symbol: "TB", factor: 1024 ** 4 },
  ] },
};

export function convertUnit(value: number, category: UnitCategory, from: string, to: string) {
  if (!Number.isFinite(value)) return null;
  if (category === "temperature") {
    const celsius = from === "c" ? value : from === "f" ? (value - 32) * 5 / 9 : value - 273.15;
    return to === "c" ? celsius : to === "f" ? celsius * 9 / 5 + 32 : celsius + 273.15;
  }
  const units = unitCategories[category].units;
  const source = units.find((unit) => unit.id === from); const target = units.find((unit) => unit.id === to);
  return source?.factor && target?.factor ? value * source.factor / target.factor : null;
}

export const timeZones = ["America/Managua", "America/Mexico_City", "America/Bogota", "America/Lima", "America/New_York", "America/Los_Angeles", "America/Sao_Paulo", "UTC", "Europe/Madrid", "Europe/London", "Asia/Tokyo", "Asia/Shanghai"];

function partsAt(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

export function zonedDateToInstant(localValue: string, zone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
  if (!match) return null;
  const [, y, m, d, h, min] = match.map(Number); const wallTime = Date.UTC(y, m - 1, d, h, min);
  let instant = wallTime;
  for (let i = 0; i < 2; i += 1) { const p = partsAt(new Date(instant), zone); const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); instant = wallTime - (represented - instant); }
  return new Date(instant);
}

export function formatInZone(date: Date, zone: string) {
  return new Intl.DateTimeFormat("es-NI", { timeZone: zone, dateStyle: "full", timeStyle: "long" }).format(date);
}
