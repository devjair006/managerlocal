# Manager Local

Aplicación de escritorio modular para ejecutar herramientas privadas sin subir archivos a internet.

## Ejecutar la interfaz

```powershell
npm install
npm run dev
```

Abre `http://127.0.0.1:5173`.

## Ejecutar como aplicación Tauri

Requiere Rust, Cargo, Microsoft C++ Build Tools y WebView2:

```powershell
npm run tauri dev
```

## Cómo está construido un módulo

El módulo QR muestra el patrón que utilizarán las demás herramientas:

1. `src/modules/registry.ts` registra la herramienta para que aparezca en el catálogo.
2. `src/modules/qr-generator/QrGenerator.tsx` contiene su pantalla y estado visual.
3. `src/modules/qr-generator/qr.service.ts` es el adaptador: llama a Rust dentro de Tauri y usa una implementación web durante el desarrollo en navegador.
4. `src-tauri/src/tools/qr.rs` contiene el procesamiento nativo en Rust.
5. `src-tauri/src/lib.rs` registra el comando para que React pueda invocarlo.

Este límite evita mezclar interfaz y procesamiento. Para añadir una herramienta nueva se repite el mismo recorrido sin modificar las demás.

## Flujo React → Rust

```text
QrGenerator.tsx
      ↓
qr.service.ts
      ↓ invoke("generate_qr")
src-tauri/src/tools/qr.rs
      ↓
PNG como data URL
```

## Primera lección de Rust

En `qr.rs`:

- `struct GenerateQrInput` define los datos aceptados.
- `#[derive(Deserialize)]` permite convertir automáticamente el objeto enviado por TypeScript.
- `Result<String, String>` expresa éxito o error sin excepciones.
- `?` detiene la función y devuelve el error si una operación falla.
- `#[tauri::command]` expone la función al frontend.

## Próximos pasos

1. Instalar el toolchain de Rust y compilar la ventana Tauri.
2. Añadir controles nativos de minimizar, maximizar y cerrar.
3. Persistir transparencia y preferencias.
4. Implementar el conversor de imágenes como segundo módulo.
