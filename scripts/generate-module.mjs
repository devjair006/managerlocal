#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const categories = ["Imágenes", "PDF", "Productividad", "Multimedia"];

function usage() {
  console.log(`
Uso:
  npm run gen:module -- <id> [opciones]

Ejemplo:
  npm run gen:module -- image-converter --name "Convertir imágenes" --category Imágenes --icon ImageSquare
  npm run gen:module -- pdf-tools --rust

Opciones:
  --name <texto>       Nombre visible (default: del registry o título del id)
  --desc <texto>       Descripción corta
  --category <cat>     Imágenes | PDF | Productividad | Multimedia
  --icon <Phosphor>    Icono de @phosphor-icons/react (default: del registry o Wrench)
  --accent <color>     Color hex (default: del registry o #a78bfa)
  --rust               También genera el comando Tauri en Rust

Si el id ya está en registry.ts (status "soon"), reutiliza sus datos y lo marca "available".
`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

function toPascalCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toTitleCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toSnakeCase(value) {
  return value.replace(/-/g, "_");
}

function toCamelCase(value) {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function ensureImport(source, symbol) {
  if (source.includes(symbol)) return source;

  return source.replace(
    /} from "@phosphor-icons\/react";/,
    `  ${symbol},\n} from "@phosphor-icons/react";`,
  );
}

function parseRegistryEntry(registrySource, id) {
  const pattern = new RegExp(
    `\\{[\\s\\n]*id: "${id}"[\\s\\n]*,[\\s\\n]*name: "([^"]+)"[\\s\\n]*,[\\s\\n]*description: "([^"]+)"[\\s\\n]*,[\\s\\n]*category: "([^"]+)"[\\s\\n]*,[\\s\\n]*icon: (\\w+)[\\s\\n]*,[\\s\\n]*accent: "([^"]+)"[\\s\\n]*,[\\s\\n]*status: "(available|soon)"`,
  );
  const match = registrySource.match(pattern);
  if (!match) return null;

  return {
    id,
    name: match[1],
    description: match[2],
    category: match[3],
    icon: match[4],
    accent: match[5],
    status: match[6],
  };
}

function upsertRegistryEntry(registrySource, entry, icon) {
  const existing = parseRegistryEntry(registrySource, entry.id);

  if (existing) {
    let next = registrySource;
    if (existing.status === "soon") {
      next = next.replace(
        new RegExp(`(id: "${entry.id}"[\\s\\S]*?status: )"soon"`),
        '$1"available"',
      );
      console.log(`  · registry.ts: "${entry.id}" activado (soon → available)`);
    } else {
      console.log(`  · registry.ts: "${entry.id}" ya estaba disponible — sin cambios`);
    }
    return next;
  }

  let next = ensureImport(registrySource, icon);
  const toolBlock = `  {
    id: "${entry.id}",
    name: "${entry.name}",
    description: "${entry.description}",
    category: "${entry.category}",
    icon: ${icon},
    accent: "${entry.accent}",
    status: "available",
  },`;

  next = next.replace(/export const tools: ToolDefinition\[] = \[\n/, `export const tools: ToolDefinition[] = [\n${toolBlock}\n`);
  console.log(`  · registry.ts: entrada "${entry.id}" añadida`);
  return next;
}

function addAppImport(appSource, id, componentName) {
  const importLine = `import { ${componentName} } from "./modules/${id}/${componentName}";`;
  if (appSource.includes(importLine)) return appSource;
  return appSource.replace(
    /import \{ BackgroundRemover \} from "\.\/modules\/background-remover\/BackgroundRemover";/,
    `import { BackgroundRemover } from "./modules/background-remover/BackgroundRemover";\n${importLine}`,
  );
}

function addAppRoute(appSource, id, componentName) {
  const route = `activeTool === "${id}" ? <${componentName} onBack={() => setActiveTool(null)} /> : `;
  if (appSource.includes(route)) return appSource;

  return appSource.replace(
    /activeTool === "background-remover" \? <BackgroundRemover onBack=\{\(\) => setActiveTool\(null\)\} \/> : \(/,
    `activeTool === "background-remover" ? <BackgroundRemover onBack={() => setActiveTool(null)} /> : ${route}(`,
  );
}

function addRustModule(modSource, snakeName) {
  const line = `pub mod ${snakeName};`;
  if (modSource.includes(line)) return modSource;
  return `${modSource.trimEnd()}\n${line}\n`;
}

function addRustHandler(libSource, snakeName, commandName) {
  const handler = `tools::${snakeName}::${commandName}`;
  if (libSource.includes(handler)) return libSource;

  return libSource.replace(
    /tools::background::remove_white_background\n/,
    `tools::background::remove_white_background,\n            ${handler}\n`,
  );
}

function componentTemplate({ componentName, icon, category, name, description, serviceFile, serviceFn }) {
  return `import { useState } from "react";
import { ArrowLeft, ${icon} } from "@phosphor-icons/react";
// import { ${serviceFn} } from "./${serviceFile}";

interface Props {
  onBack: () => void;
}

export function ${componentName}({ onBack }: Props) {
  const [error, setError] = useState("");

  async function handleAction() {
    try {
      setError("");
      // TODO: conectar con el servicio
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la acción");
    }
  }

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon"><${icon} weight="duotone" /></span>
        <div>
          <p className="eyebrow">${category}</p>
          <h1>${name}</h1>
          <p>${description}</p>
        </div>
      </div>

      <div className="qr-form">
        <p className="privacy-note">Procesamiento 100% local · Sin cuentas · Sin anuncios</p>
        <button className="primary-button" onClick={() => void handleAction()}>Empezar</button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
}
`;
}

function serviceTemplate({ id, withRust, commandName }) {
  const fnName = toCamelCase(id);
  const typeName = `${toPascalCase(id)}Input`;

  if (withRust) {
    return `export type ${typeName} = {
  // TODO: define los campos de entrada
  sample: string;
};

export async function ${fnName}(input: ${typeName}): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("${commandName}", { input });
  }

  // Fallback para desarrollo en navegador
  return Promise.resolve(input.sample);
}
`;
  }

  return `export type ${typeName} = {
  // TODO: define los campos de entrada
  sample: string;
};

export async function ${fnName}(input: ${typeName}): Promise<string> {
  // TODO: implementa la lógica en el navegador
  return input.sample;
}
`;
}

function rustTemplate({ snakeName, commandName, typeName }) {
  return `use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ${typeName} {
    sample: String,
}

#[tauri::command]
pub fn ${commandName}(input: ${typeName}) -> Result<String, String> {
    if input.sample.trim().is_empty() {
        return Err("El valor no puede estar vacío".into());
    }

    // TODO: implementa el procesamiento nativo
    Ok(input.sample)
}
`;
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const id = positional[0];

if (!id || flags.help || flags.h) {
  usage();
  process.exit(id ? 0 : 1);
}

if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error("El id debe ser kebab-case, por ejemplo: image-converter");
  process.exit(1);
}

const registryPath = join(root, "src", "modules", "registry.ts");
const appPath = join(root, "src", "App.tsx");
const registrySource = readFileSync(registryPath, "utf8");
const existingEntry = parseRegistryEntry(registrySource, id);

const componentName = toPascalCase(id);
const serviceBase = id;
const category = flags.category ?? existingEntry?.category ?? "Productividad";
const icon = flags.icon ?? existingEntry?.icon ?? "Wrench";
const name = flags.name ?? existingEntry?.name ?? toTitleCase(id);
const description = flags.desc ?? existingEntry?.description ?? "Descripción pendiente.";
const accent = flags.accent ?? existingEntry?.accent ?? "#a78bfa";
const withRust = Boolean(flags.rust);
const commandName = toSnakeCase(id);
const rustTypeName = `${toPascalCase(id)}Input`;

if (!categories.includes(category)) {
  console.error(`Categoría inválida. Usa una de: ${categories.join(", ")}`);
  process.exit(1);
}

if (existingEntry) {
  console.log(`\nEncontrado en registry: "${existingEntry.name}" (${existingEntry.status})`);
}

const moduleDir = join(root, "src", "modules", id);
if (existsSync(moduleDir)) {
  console.error(`Ya existe src/modules/${id}`);
  process.exit(1);
}

const serviceFileName = `${serviceBase}.service.ts`;
const componentPath = join(moduleDir, `${componentName}.tsx`);
const servicePath = join(moduleDir, serviceFileName);

mkdirSync(moduleDir, { recursive: true });

const serviceFn = toCamelCase(id);
const componentSource = componentTemplate({
  componentName,
  icon,
  category,
  name,
  description,
  serviceFile: serviceFileName,
  serviceFn,
});

writeFileSync(componentPath, componentSource);
writeFileSync(servicePath, serviceTemplate({ id, withRust, commandName }));

writeFileSync(
  registryPath,
  upsertRegistryEntry(registrySource, { id, name, description, category, accent }, icon),
);
writeFileSync(appPath, addAppRoute(addAppImport(readFileSync(appPath, "utf8"), id, componentName), id, componentName));

if (withRust) {
  const rustPath = join(root, "src-tauri", "src", "tools", `${commandName}.rs`);
  const modPath = join(root, "src-tauri", "src", "tools", "mod.rs");
  const libPath = join(root, "src-tauri", "src", "lib.rs");

  writeFileSync(rustPath, rustTemplate({ snakeName: commandName, commandName, typeName: rustTypeName }));
  writeFileSync(modPath, addRustModule(readFileSync(modPath, "utf8"), commandName));
  writeFileSync(libPath, addRustHandler(readFileSync(libPath, "utf8"), commandName, commandName));
}

console.log(`\nMódulo "${id}" creado:\n`);
console.log(`  src/modules/${id}/${componentName}.tsx`);
console.log(`  src/modules/${id}/${serviceFileName}`);
console.log(`  src/modules/registry.ts  (${existingEntry ? "activado" : "entrada nueva"})`);
console.log(`  src/App.tsx              (import + ruta)`);
if (withRust) {
  console.log(`  src-tauri/src/tools/${commandName}.rs`);
  console.log(`  src-tauri/src/tools/mod.rs`);
  console.log(`  src-tauri/src/lib.rs`);
}
console.log("\nSiguiente paso: edita el componente y el servicio, luego recarga la app.\n");
