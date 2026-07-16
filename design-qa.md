# Design QA — Estudio QR

Reference images:

- `C:\Users\jahir\AppData\Local\Temp\codex-clipboard-503b2ed0-bed1-40ea-aaba-f3329a04c4b4.png`
- `C:\Users\jahir\AppData\Local\Temp\codex-clipboard-047d841e-fc6c-44fc-84bd-a3068c8ede2b.png`
- `C:\Users\jahir\AppData\Local\Temp\codex-clipboard-1fd9efec-0a9c-401a-88e7-e4dd1b647199.png`

Implementation evidence:

- `design-evidence\qr-studio-final.png`
- `design-evidence\qr-studio-compact-final.png`
- `design-evidence\qr-reference-comparison-final.png`

## Scope

The reference was treated as functional inspiration, then translated into Manager Local's existing pixel-minimal design system. The implemented flow includes 15 content types, live preview, module and eye shapes, colors, transparent background, frames, logo placement, size, margin, error correction and PNG export.

## Functional checks

- Opened Estudio QR from the 19-tool dashboard.
- Generated the initial URL QR locally.
- Changed to WhatsApp, entered a phone number and message, and confirmed the preview data changed.
- Applied a text frame and confirmed the preview data changed again.
- Opened PDF mode and confirmed it requests a public URL rather than a local Windows path.
- Confirmed all 15 content choices are exposed with accessible names.
- Confirmed the save action is enabled when a valid payload exists.
- Browser console: 0 errors and 0 warnings in the tested flow.
- TypeScript, production Vite build and diff whitespace checks passed.

## Visual comparison

The combined evidence compares the source and implementation in one image. Manager Local preserves the source flow—content choices on the left and a persistent QR preview on the right—while using the product's near-black surfaces, green accent, pixel icons and compact metadata. The three-column content grid keeps all options scannable without copying the generic light web treatment.

At 920 × 650 the editor collapses to one main column, the preview becomes non-sticky, the content choices remain three columns of 204 px, and no horizontal overflow occurs.

## Findings

- No P0, P1 or P2 defects remain in the tested QR flow.
- [P3] A physical-camera scan matrix across Android and iOS would be useful before print-production use, especially for logos and non-square module styles.
- [P3] “Código 2D” from the reference is intentionally not mixed into this QR module; formats such as EAN, UPC and Data Matrix deserve a separate barcode tool.

final result: passed
