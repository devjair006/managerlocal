# Generar módulos

Comando tipo `nest g` para crear herramientas en Manager Local.

```bash
npm run gen:module -- <id> [opciones]
```

El script vive en `scripts/generate-module.mjs`.

---

## Ejemplos rápidos

### 1. Módulo nuevo (no está en el registry)

Primero agrega la tarjeta en `src/modules/registry.ts` con `status: "soon"` **o** deja que el generador cree la entrada si el `id` no existe.

Ejemplo: herramienta nueva `hex-picker` (no existe hoy en el proyecto).

```bash
npm run gen:module -- hex-picker \
  --name "Selector de color" \
  --desc "Extrae y copia colores desde cualquier imagen." \
  --category Imágenes \
  --icon Eyedropper \
  --accent "#f472b6"
```

**Qué hace:**

| Archivo | Resultado |
|---------|-----------|
| `src/modules/hex-picker/HexPicker.tsx` | Pantalla base |
| `src/modules/hex-picker/hex-picker.service.ts` | Servicio con stub |
| `src/modules/registry.ts` | Añade entrada con `status: "available"` |
| `src/modules/tool-routes.tsx` | Registra el componente en el mapa de rutas |

Con procesamiento nativo:

```bash
npm run gen:module -- hex-picker --name "Selector de color" --category Imágenes --icon Eyedropper --rust
```

Añade además:

- `src-tauri/src/tools/hex_picker.rs`
- Registro en `src-tauri/src/tools/mod.rs` y `src-tauri/src/lib.rs`

---

### 2. Módulo `soon` (ya está en el registry)

Si el `id` ya existe en `registry.ts`, el generador **no duplica** la entrada. Reutiliza nombre, descripción, categoría, icono y color, y cambia `status: "soon"` → `"available"`.

Ejemplo: `image-converter` (ya definido en el registry).

```bash
npm run gen:module -- image-converter --rust
```

Equivalente explícito (opcional, los flags sobrescriben el registry):

```bash
npm run gen:module -- image-converter \
  --name "Convertir imágenes" \
  --desc "Convierte PNG, JPG y WebP de forma local y por lotes." \
  --category Imágenes \
  --icon ImageSquare \
  --accent "#38bdf8" \
  --rust
```

**Qué hace:**

| Archivo | Resultado |
|---------|-----------|
| `src/modules/image-converter/ImageConverter.tsx` | Pantalla base |
| `src/modules/image-converter/image-converter.service.ts` | Servicio + `invoke` |
| `src/modules/registry.ts` | Solo activa: `soon` → `available` |
| `src/modules/tool-routes.tsx` | Registra el componente en el mapa de rutas |
| `src-tauri/src/tools/image_converter.rs` | Comando Rust (con `--rust`) |

---

## Lista de módulos `soon` disponibles hoy

Puedes generar cualquiera de estos sin pasar flags:

| Comando | Nombre en la app |
|---------|------------------|
| `npm run gen:module -- image-converter --rust` | Convertir imágenes |
| `npm run gen:module -- image-resizer --rust` | Redimensionar |
| `npm run gen:module -- pdf-tools --rust` | Herramientas PDF |
| `npm run gen:module -- video-converter --rust` | Convertir video |
| `npm run gen:module -- batch-renamer --rust` | Renombrar archivos |

---

## Opciones del CLI

| Flag | Descripción | Default |
|------|-------------|---------|
| `--name` | Nombre visible en la UI | Registry o título del `id` |
| `--desc` | Descripción corta | Registry o "Descripción pendiente." |
| `--category` | `Imágenes` \| `PDF` \| `Productividad` \| `Multimedia` | Registry o `Productividad` |
| `--icon` | Componente de `@phosphor-icons/react` | Registry o `Wrench` |
| `--accent` | Color hex de la tarjeta | Registry o `#a78bfa` |
| `--rust` | Genera comando Tauri en Rust | No |

Ayuda:

```bash
npm run gen:module -- --help
```

---

## Después de generar

1. Edita el componente en `src/modules/<id>/`.
2. Implementa la lógica en `<id>.service.ts`.
3. Si usaste `--rust`, completa el `TODO` en `src-tauri/src/tools/<id_snake>.rs`.
4. Recarga la app (`npm run tauri dev`).

Los archivos generados incluyen comentarios `TODO` en los puntos clave.

---

## Errores comunes

| Mensaje | Causa | Solución |
|---------|-------|----------|
| `Ya existe src/modules/<id>` | La carpeta del módulo ya fue creada | Edita los archivos a mano o bórralos si era un borrador |
| `El id debe ser kebab-case` | ID con mayúsculas o espacios | Usa `mi-herramienta`, no `MiHerramienta` |
| `Categoría inválida` | Typo en `--category` | Una de: Imágenes, PDF, Productividad, Multimedia |

---

## Estructura que genera

```
src/modules/<id>/
  <PascalCase>.tsx      # UI de la herramienta
  <id>.service.ts       # Lógica / invoke a Tauri

src/modules/registry.ts # Entrada en el grid (nueva o activada)
src/modules/tool-routes.tsx # Mapa id → componente (lo usa App.tsx)
src/App.tsx             # Lee toolViews y renderiza la pantalla activa

# Solo con --rust:
src-tauri/src/tools/<id_snake>.rs
src-tauri/src/tools/mod.rs
src-tauri/src/lib.rs
```
