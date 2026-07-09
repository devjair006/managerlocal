# Sistema interno de plugins

Carpeta de runtime:

```text
%APPDATA%\com.managerlocal.app\plugins
```

Cada plugin vive en su propia carpeta y debe incluir:

```text
mi-plugin/
  managerlocal.plugin.json
  index.js
```

Ejemplo de `managerlocal.plugin.json`:

```json
{
  "schemaVersion": 1,
  "id": "demo.text-tools",
  "name": "Demo Text Tools",
  "version": "0.1.0",
  "description": "Plugin de ejemplo para herramientas de texto.",
  "author": "Manager Local",
  "entry": "index.js",
  "permissions": [
    {
      "id": "filesystem.read-selected",
      "reason": "Necesita leer solo archivos que el usuario seleccione explícitamente."
    }
  ],
  "signature": {
    "algorithm": "ed25519",
    "keyId": "managerlocal-dev",
    "publicKey": "BASE64_PUBLIC_KEY",
    "value": "BASE64_SIGNATURE"
  }
}
```

Los publicadores confiables se declaran en:

```text
trusted-publishers.json
```

Formato:

```json
[
  {
    "keyId": "managerlocal-dev",
    "publicKey": "BASE64_PUBLIC_KEY"
  }
]
```

Regla actual: la app solo audita. Un plugin sin firma confiable se lista, pero queda bloqueado y no se ejecuta.
