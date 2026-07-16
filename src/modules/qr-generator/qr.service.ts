import QRCode from "qrcode";

export type QrContentType = "url" | "text" | "email" | "phone" | "sms" | "whatsapp" | "wifi" | "vcard" | "event" | "location" | "pdf" | "image" | "video" | "app" | "social";
export type QrModuleStyle = "square" | "rounded" | "dots" | "diamond" | "bars";
export type QrEyeStyle = "square" | "rounded" | "circle" | "soft";
export type QrFrameStyle = "none" | "border" | "label";
export type QrErrorCorrection = "L" | "M" | "Q" | "H";

export interface GenerateQrInput {
  content: string;
  size: number;
  foreground: string;
  background: string;
  eyeColor: string;
  transparent: boolean;
  margin: number;
  moduleStyle: QrModuleStyle;
  eyeStyle: QrEyeStyle;
  frameStyle: QrFrameStyle;
  frameLabel: string;
  errorCorrection: QrErrorCorrection;
  logoData?: string;
}

export interface QrContentValues {
  url: string;
  text: string;
  email: string;
  subject: string;
  emailBody: string;
  phone: string;
  smsMessage: string;
  whatsappPhone: string;
  whatsappMessage: string;
  wifiName: string;
  wifiPassword: string;
  wifiSecurity: "WPA" | "WEP" | "nopass";
  wifiHidden: boolean;
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
  eventTitle: string;
  eventLocation: string;
  eventStart: string;
  eventEnd: string;
  eventDescription: string;
  latitude: string;
  longitude: string;
}

function escapeWifi(value: string) {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function escapeVCard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function escapeCalendar(value: string) {
  return escapeVCard(value);
}

function calendarDate(value: string) {
  if (!value) return "";
  return value.replace(/[-:]/g, "").replace("T", "T") + (value.length === 16 ? "00" : "");
}

function appendQuery(base: string, entries: Array<[string, string]>) {
  const query = entries.filter(([, value]) => value.trim()).map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`).join("&");
  return query ? `${base}?${query}` : base;
}

export function buildQrContent(type: QrContentType, values: QrContentValues): string {
  switch (type) {
    case "url":
    case "pdf":
    case "image":
    case "video":
    case "app":
    case "social":
      return values.url.trim();
    case "text":
      return values.text.trim();
    case "email":
      return values.email.trim() ? appendQuery(`mailto:${values.email.trim()}`, [["subject", values.subject], ["body", values.emailBody]]) : "";
    case "phone":
      return values.phone.trim() ? `tel:${values.phone.trim()}` : "";
    case "sms":
      return values.phone.trim() ? `SMSTO:${values.phone.trim()}:${values.smsMessage.trim()}` : "";
    case "whatsapp": {
      const digits = values.whatsappPhone.replace(/\D/g, "");
      return digits ? appendQuery(`https://wa.me/${digits}`, [["text", values.whatsappMessage]]) : "";
    }
    case "wifi":
      return values.wifiName.trim()
        ? `WIFI:T:${values.wifiSecurity};S:${escapeWifi(values.wifiName.trim())};P:${escapeWifi(values.wifiPassword)};H:${values.wifiHidden ? "true" : "false"};;`
        : "";
    case "vcard": {
      if (!values.firstName.trim() && !values.lastName.trim()) return "";
      const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVCard(values.lastName.trim())};${escapeVCard(values.firstName.trim())};;;`,
        `FN:${escapeVCard(fullName)}`,
        values.organization.trim() && `ORG:${escapeVCard(values.organization.trim())}`,
        values.jobTitle.trim() && `TITLE:${escapeVCard(values.jobTitle.trim())}`,
        values.contactPhone.trim() && `TEL;TYPE=CELL:${escapeVCard(values.contactPhone.trim())}`,
        values.contactEmail.trim() && `EMAIL:${escapeVCard(values.contactEmail.trim())}`,
        values.contactWebsite.trim() && `URL:${escapeVCard(values.contactWebsite.trim())}`,
        "END:VCARD",
      ].filter(Boolean).join("\n");
    }
    case "event": {
      if (!values.eventTitle.trim() || !values.eventStart) return "";
      return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `SUMMARY:${escapeCalendar(values.eventTitle.trim())}`,
        `DTSTART:${calendarDate(values.eventStart)}`,
        values.eventEnd && `DTEND:${calendarDate(values.eventEnd)}`,
        values.eventLocation.trim() && `LOCATION:${escapeCalendar(values.eventLocation.trim())}`,
        values.eventDescription.trim() && `DESCRIPTION:${escapeCalendar(values.eventDescription.trim())}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].filter(Boolean).join("\n");
    }
    case "location":
      return values.latitude.trim() && values.longitude.trim() ? `geo:${values.latitude.trim()},${values.longitude.trim()}` : "";
  }
}

function normalizedHex(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, Math.max(0, radius));
  context.fill();
}

function drawModule(context: CanvasRenderingContext2D, style: QrModuleStyle, x: number, y: number, cell: number) {
  const inset = cell * 0.08;
  switch (style) {
    case "square":
      context.fillRect(x, y, cell + .15, cell + .15);
      break;
    case "rounded":
      roundedRect(context, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * .28);
      break;
    case "dots":
      context.beginPath();
      context.arc(x + cell / 2, y + cell / 2, cell * .42, 0, Math.PI * 2);
      context.fill();
      break;
    case "diamond":
      context.save();
      context.translate(x + cell / 2, y + cell / 2);
      context.rotate(Math.PI / 4);
      roundedRect(context, -cell * .34, -cell * .34, cell * .68, cell * .68, cell * .08);
      context.restore();
      break;
    case "bars":
      roundedRect(context, x + cell * .06, y + cell * .27, cell * .88, cell * .46, cell * .2);
      break;
  }
}

function isFinderCell(row: number, column: number, modules: number) {
  return (row <= 6 && column <= 6)
    || (row <= 6 && column >= modules - 7)
    || (row >= modules - 7 && column <= 6);
}

function clearOrFill(context: CanvasRenderingContext2D, transparent: boolean, color: string, x: number, y: number, width: number, height: number, radius: number) {
  if (transparent) {
    context.clearRect(x, y, width, height);
    return;
  }
  context.fillStyle = color;
  roundedRect(context, x, y, width, height, radius);
}

function drawFinder(context: CanvasRenderingContext2D, style: QrEyeStyle, x: number, y: number, cell: number, color: string, background: string, transparent: boolean) {
  const size = cell * 7;
  const gap = cell;
  const inner = cell * 3;

  if (style === "circle") {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
    if (transparent) {
      context.save();
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.arc(x + size / 2, y + size / 2, size / 2 - gap, 0, Math.PI * 2);
      context.fill();
      context.restore();
    } else {
      context.fillStyle = background;
      context.beginPath();
      context.arc(x + size / 2, y + size / 2, size / 2 - gap, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = color;
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, inner / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  const outerRadius = style === "square" ? 0 : style === "rounded" ? cell * .8 : cell * 1.7;
  const middleRadius = style === "square" ? 0 : style === "rounded" ? cell * .45 : cell * 1.15;
  const innerRadius = style === "square" ? 0 : style === "rounded" ? cell * .35 : cell * .8;
  context.fillStyle = color;
  roundedRect(context, x, y, size, size, outerRadius);
  clearOrFill(context, transparent, background, x + gap, y + gap, size - gap * 2, size - gap * 2, middleRadius);
  context.fillStyle = color;
  roundedRect(context, x + gap * 2, y + gap * 2, inner, inner, innerRadius);
}

async function loadImage(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

export async function generateQr(input: GenerateQrInput): Promise<string> {
  const foreground = normalizedHex(input.foreground, "#07150e");
  const background = normalizedHex(input.background, "#ffffff");
  const eyeColor = normalizedHex(input.eyeColor, foreground);
  const qr = QRCode.create(input.content, { errorCorrectionLevel: input.logoData ? "H" : input.errorCorrection });
  const modules = qr.modules.size;
  const frameInset = input.frameStyle === "none" ? 0 : 12;
  const labelHeight = input.frameStyle === "label" ? 48 : 0;
  const qrArea = input.size - frameInset * 2;
  const canvas = document.createElement("canvas");
  canvas.width = input.size;
  canvas.height = input.size + labelHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar el lienzo del QR");

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!input.transparent || input.frameStyle !== "none") {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  const cell = qrArea / (modules + input.margin * 2);
  const origin = frameInset + input.margin * cell;
  context.fillStyle = foreground;
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (!qr.modules.get(row, column) || isFinderCell(row, column, modules)) continue;
      drawModule(context, input.moduleStyle, origin + column * cell, origin + row * cell, cell);
    }
  }

  drawFinder(context, input.eyeStyle, origin, origin, cell, eyeColor, background, input.transparent && input.frameStyle === "none");
  drawFinder(context, input.eyeStyle, origin + (modules - 7) * cell, origin, cell, eyeColor, background, input.transparent && input.frameStyle === "none");
  drawFinder(context, input.eyeStyle, origin, origin + (modules - 7) * cell, cell, eyeColor, background, input.transparent && input.frameStyle === "none");

  if (input.logoData) {
    const image = await loadImage(input.logoData);
    const plateSize = qrArea * .24;
    const logoSize = plateSize * .76;
    const centerX = frameInset + qrArea / 2;
    const centerY = frameInset + qrArea / 2;
    context.fillStyle = background;
    roundedRect(context, centerX - plateSize / 2, centerY - plateSize / 2, plateSize, plateSize, plateSize * .16);
    context.drawImage(image, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize);
  }

  if (input.frameStyle !== "none") {
    context.strokeStyle = eyeColor;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, input.size - 3, input.size - 3);
  }

  if (input.frameStyle === "label") {
    context.fillStyle = eyeColor;
    context.fillRect(0, input.size, input.size, labelHeight);
    context.fillStyle = input.transparent ? "#ffffff" : background;
    context.font = `600 ${Math.max(13, input.size * .043)}px Bahnschrift, Segoe UI, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText((input.frameLabel || "ESCANEA AQUÍ").slice(0, 36), input.size / 2, input.size + labelHeight / 2);
  }

  return canvas.toDataURL("image/png");
}
