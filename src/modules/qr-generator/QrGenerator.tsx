import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import {
  AddressBook,
  ArrowLeft as ModernArrowLeft,
  CalendarBlank,
  ChatText,
  Check as ModernCheck,
  Circle as ModernCircle,
  CirclesThree,
  CornersOut,
  DeviceMobile,
  Diamond,
  DownloadSimple,
  EnvelopeSimple,
  FilePdf,
  FileText as ModernFileText,
  FrameCorners,
  ImageSquare,
  Link as ModernLink,
  MapPin as ModernMapPin,
  Palette,
  Phone as ModernPhone,
  QrCode,
  Rows,
  ShareNetwork,
  Square as ModernSquare,
  SquaresFour,
  TextT,
  Trash as ModernTrash,
  UploadSimple,
  VideoCamera,
  WhatsappLogo,
  WifiHigh,
  type Icon as ModernIcon,
} from "@phosphor-icons/react";
import {
  AppWindows,
  ArrowLeft,
  Calendar,
  Check,
  Circle,
  CirclePile,
  Contact,
  DiamondGem,
  Download,
  FileText,
  File,
  Frame,
  Grid3x3,
  Image,
  Link,
  Mail,
  MapPin,
  MessageText,
  Phone,
  ScanBarcode,
  Square,
  Share,
  TextAlignJustify,
  Trash,
  Upload,
  Video,
  Waves,
  Wifi,
} from "pixelarticons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { useAppearance } from "../../appearance";
import {
  buildQrContent,
  generateQr,
  type QrContentType,
  type QrContentValues,
  type QrErrorCorrection,
  type QrEyeStyle,
  type QrFrameStyle,
  type QrModuleStyle,
} from "./qr.service";

interface Props {
  onBack: () => void;
}

type PixelIcon = ComponentType<SVGProps<SVGSVGElement>>;
type DesignTab = "shape" | "colors" | "frame" | "logo";

interface ContentOption {
  id: QrContentType;
  label: string;
  description: string;
  icon: PixelIcon;
  modernIcon: ModernIcon;
}

const contentOptions: ContentOption[] = [
  { id: "url", label: "Enlace", description: "Abre un sitio o archivo publicado", icon: Link, modernIcon: ModernLink },
  { id: "text", label: "Texto", description: "Muestra una nota sin conexión", icon: FileText, modernIcon: ModernFileText },
  { id: "email", label: "E-mail", description: "Prepara un correo", icon: Mail, modernIcon: EnvelopeSimple },
  { id: "phone", label: "Llamada", description: "Marca un número", icon: Phone, modernIcon: ModernPhone },
  { id: "sms", label: "SMS", description: "Prepara un mensaje", icon: MessageText, modernIcon: ChatText },
  { id: "whatsapp", label: "WhatsApp", description: "Abre una conversación", icon: MessageText, modernIcon: WhatsappLogo },
  { id: "wifi", label: "Wi-Fi", description: "Conecta a una red", icon: Wifi, modernIcon: WifiHigh },
  { id: "vcard", label: "Contacto", description: "Guarda una V-card", icon: Contact, modernIcon: AddressBook },
  { id: "event", label: "Evento", description: "Añade una cita", icon: Calendar, modernIcon: CalendarBlank },
  { id: "location", label: "Ubicación", description: "Abre coordenadas", icon: MapPin, modernIcon: ModernMapPin },
  { id: "pdf", label: "PDF", description: "Abre un PDF publicado", icon: File, modernIcon: FilePdf },
  { id: "image", label: "Imagen", description: "Abre una imagen publicada", icon: Image, modernIcon: ImageSquare },
  { id: "video", label: "Video", description: "Abre un video publicado", icon: Video, modernIcon: VideoCamera },
  { id: "app", label: "Aplicación", description: "Abre la tienda o descarga", icon: AppWindows, modernIcon: DeviceMobile },
  { id: "social", label: "Red social", description: "Abre un perfil público", icon: Share, modernIcon: ShareNetwork },
];

const linkedResourceLabels = {
  pdf: "Enlace del PDF",
  image: "Enlace de la imagen",
  video: "Enlace del video",
  app: "Enlace de la aplicación",
  social: "Enlace del perfil",
} satisfies Record<"pdf" | "image" | "video" | "app" | "social", string>;

const moduleStyles: Array<{ id: QrModuleStyle; label: string; icon: PixelIcon; modernIcon: ModernIcon }> = [
  { id: "square", label: "Cuadrado", icon: Grid3x3, modernIcon: SquaresFour },
  { id: "rounded", label: "Suave", icon: CirclePile, modernIcon: CirclesThree },
  { id: "dots", label: "Puntos", icon: Circle, modernIcon: ModernCircle },
  { id: "diamond", label: "Diamante", icon: DiamondGem, modernIcon: Diamond },
  { id: "bars", label: "Barras", icon: TextAlignJustify, modernIcon: Rows },
];

const eyeStyles: Array<{ id: QrEyeStyle; label: string; icon: PixelIcon; modernIcon: ModernIcon }> = [
  { id: "square", label: "Cuadrado", icon: Square, modernIcon: ModernSquare },
  { id: "rounded", label: "Redondeado", icon: Frame, modernIcon: CornersOut },
  { id: "circle", label: "Circular", icon: Circle, modernIcon: ModernCircle },
  { id: "soft", label: "Suave", icon: ScanBarcode, modernIcon: QrCode },
];

const frameStyles: Array<{ id: QrFrameStyle; label: string; description: string; icon: PixelIcon; modernIcon: ModernIcon }> = [
  { id: "none", label: "Sin marco", description: "Solo el código y su zona segura", icon: ScanBarcode, modernIcon: QrCode },
  { id: "border", label: "Borde", description: "Contorno limpio alrededor del QR", icon: Frame, modernIcon: FrameCorners },
  { id: "label", label: "Con texto", description: "Añade una llamada bajo el código", icon: FileText, modernIcon: TextT },
];

function localDateInput(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function createInitialValues(): QrContentValues {
  const start = new Date(Date.now() + 60 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    url: "https://",
    text: "",
    email: "",
    subject: "",
    emailBody: "",
    phone: "",
    smsMessage: "",
    whatsappPhone: "",
    whatsappMessage: "",
    wifiName: "",
    wifiPassword: "",
    wifiSecurity: "WPA",
    wifiHidden: false,
    firstName: "",
    lastName: "",
    organization: "",
    jobTitle: "",
    contactPhone: "",
    contactEmail: "",
    contactWebsite: "",
    eventTitle: "",
    eventLocation: "",
    eventStart: localDateInput(start),
    eventEnd: localDateInput(end),
    eventDescription: "",
    latitude: "",
    longitude: "",
  };
}

function QrField({ label, hint, wide = false, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return <label className={wide ? "qr-field wide" : "qr-field"}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="qr-color-field"><span>{label}</span><div><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><input value={value.toUpperCase()} maxLength={7} onChange={(event) => onChange(event.target.value)} aria-label={`${label} hexadecimal`} /></div></label>;
}

export function QrGenerator({ onBack }: Props) {
  const { preferences } = useAppearance();
  const [contentType, setContentType] = useState<QrContentType>("url");
  const [values, setValues] = useState<QrContentValues>(createInitialValues);
  const [designTab, setDesignTab] = useState<DesignTab>("shape");
  const [size, setSize] = useState(420);
  const [margin, setMargin] = useState(3);
  const [moduleStyle, setModuleStyle] = useState<QrModuleStyle>("square");
  const [eyeStyle, setEyeStyle] = useState<QrEyeStyle>("square");
  const [frameStyle, setFrameStyle] = useState<QrFrameStyle>("none");
  const [frameLabel, setFrameLabel] = useState("ESCANEA AQUÍ");
  const [foreground, setForeground] = useState("#07150E");
  const [background, setBackground] = useState("#FFFFFF");
  const [eyeColor, setEyeColor] = useState("#00A965");
  const [transparent, setTransparent] = useState(false);
  const [errorCorrection, setErrorCorrection] = useState<QrErrorCorrection>("Q");
  const [logoData, setLogoData] = useState("");
  const [logoName, setLogoName] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const useModernIcons = preferences.iconStyle === "modern";
  const BackIcon = useModernIcons ? ModernArrowLeft : ArrowLeft;
  const SelectedIcon = useModernIcons ? ModernCheck : Check;
  const ShapeIcon = useModernIcons ? SquaresFour : Grid3x3;
  const ColorIcon = useModernIcons ? Palette : Waves;
  const FrameIcon = useModernIcons ? FrameCorners : Frame;
  const LogoIcon = useModernIcons ? ImageSquare : Image;
  const DeleteIcon = useModernIcons ? ModernTrash : Trash;
  const UploadIcon = useModernIcons ? UploadSimple : Upload;
  const DownloadIcon = useModernIcons ? DownloadSimple : Download;
  const EmptyQrIcon = useModernIcons ? QrCode : ScanBarcode;

  const activeContent = contentOptions.find((option) => option.id === contentType) ?? contentOptions[0];
  const payload = useMemo(() => buildQrContent(contentType, values), [contentType, values]);

  function updateValue<Key extends keyof QrContentValues>(key: Key, value: QrContentValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (!payload.trim()) {
        setResult("");
        setError("");
        return;
      }
      try {
        setResult(await generateQr({
          content: payload,
          size,
          foreground,
          background,
          eyeColor,
          transparent,
          margin,
          moduleStyle,
          eyeStyle,
          frameStyle,
          frameLabel,
          errorCorrection,
          logoData: logoData || undefined,
        }));
        setError("");
      } catch (cause) {
        setResult("");
        setError(cause instanceof Error ? cause.message : "No se pudo generar el QR");
      }
    }, 140);
    return () => window.clearTimeout(timeout);
  }, [background, errorCorrection, eyeColor, eyeStyle, foreground, frameLabel, frameStyle, logoData, margin, moduleStyle, payload, size, transparent]);

  function download() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result;
    anchor.download = `qr-${contentType}.png`;
    anchor.click();
  }

  function chooseLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El logo debe ser una imagen PNG, JPG o WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("El logo no puede superar 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoData(String(reader.result ?? ""));
      setLogoName(file.name);
      setErrorCorrection("H");
      setError("");
    };
    reader.readAsDataURL(file);
  }

  function renderContentFields() {
    switch (contentType) {
      case "url":
        return <QrField label="Dirección web" hint="Usa una URL pública si quieres abrirla desde otro dispositivo." wide><input type="url" value={values.url} onChange={(event) => updateValue("url", event.target.value)} placeholder="https://ejemplo.com" autoFocus /></QrField>;
      case "pdf":
      case "image":
      case "video":
      case "app":
      case "social":
        return <QrField label={linkedResourceLabels[contentType]} hint="El archivo o perfil debe tener una URL pública; una ruta local de Windows no funciona en otro teléfono." wide><input type="url" value={values.url} onChange={(event) => updateValue("url", event.target.value)} placeholder="https://ejemplo.com/recurso" autoFocus /></QrField>;
      case "text":
        return <QrField label="Texto" hint={`${values.text.length}/1200 caracteres`} wide><textarea value={values.text} maxLength={1200} onChange={(event) => updateValue("text", event.target.value)} placeholder="Escribe la información que mostrará el QR" autoFocus /></QrField>;
      case "email":
        return <><QrField label="Correo"><input type="email" value={values.email} onChange={(event) => updateValue("email", event.target.value)} placeholder="nombre@ejemplo.com" autoFocus /></QrField><QrField label="Asunto"><input value={values.subject} onChange={(event) => updateValue("subject", event.target.value)} placeholder="Asunto opcional" /></QrField><QrField label="Mensaje" wide><textarea value={values.emailBody} onChange={(event) => updateValue("emailBody", event.target.value)} placeholder="Mensaje opcional" /></QrField></>;
      case "phone":
        return <QrField label="Número telefónico" hint="Incluye el código de país, por ejemplo +505." wide><input type="tel" value={values.phone} onChange={(event) => updateValue("phone", event.target.value)} placeholder="+505 8888 8888" autoFocus /></QrField>;
      case "sms":
        return <><QrField label="Número"><input type="tel" value={values.phone} onChange={(event) => updateValue("phone", event.target.value)} placeholder="+505 8888 8888" autoFocus /></QrField><QrField label="Mensaje"><input value={values.smsMessage} onChange={(event) => updateValue("smsMessage", event.target.value)} placeholder="Mensaje opcional" /></QrField></>;
      case "whatsapp":
        return <><QrField label="Número de WhatsApp" hint="Solo números y código de país."><input type="tel" value={values.whatsappPhone} onChange={(event) => updateValue("whatsappPhone", event.target.value)} placeholder="50588888888" autoFocus /></QrField><QrField label="Mensaje inicial"><input value={values.whatsappMessage} onChange={(event) => updateValue("whatsappMessage", event.target.value)} placeholder="Hola, quisiera información" /></QrField></>;
      case "wifi":
        return <><QrField label="Nombre de la red"><input value={values.wifiName} onChange={(event) => updateValue("wifiName", event.target.value)} placeholder="Mi Wi-Fi" autoFocus /></QrField><QrField label="Contraseña"><input type="password" value={values.wifiPassword} onChange={(event) => updateValue("wifiPassword", event.target.value)} placeholder="Contraseña" /></QrField><QrField label="Seguridad"><select value={values.wifiSecurity} onChange={(event) => updateValue("wifiSecurity", event.target.value as QrContentValues["wifiSecurity"])}><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">Sin contraseña</option></select></QrField><label className="qr-check"><input type="checkbox" checked={values.wifiHidden} onChange={(event) => updateValue("wifiHidden", event.target.checked)} /><span>Red oculta</span></label></>;
      case "vcard":
        return <><QrField label="Nombre"><input value={values.firstName} onChange={(event) => updateValue("firstName", event.target.value)} placeholder="Nombre" autoFocus /></QrField><QrField label="Apellido"><input value={values.lastName} onChange={(event) => updateValue("lastName", event.target.value)} placeholder="Apellido" /></QrField><QrField label="Empresa"><input value={values.organization} onChange={(event) => updateValue("organization", event.target.value)} placeholder="Empresa" /></QrField><QrField label="Cargo"><input value={values.jobTitle} onChange={(event) => updateValue("jobTitle", event.target.value)} placeholder="Cargo" /></QrField><QrField label="Teléfono"><input type="tel" value={values.contactPhone} onChange={(event) => updateValue("contactPhone", event.target.value)} placeholder="+505..." /></QrField><QrField label="Correo"><input type="email" value={values.contactEmail} onChange={(event) => updateValue("contactEmail", event.target.value)} placeholder="nombre@ejemplo.com" /></QrField><QrField label="Sitio web" wide><input type="url" value={values.contactWebsite} onChange={(event) => updateValue("contactWebsite", event.target.value)} placeholder="https://" /></QrField></>;
      case "event":
        return <><QrField label="Título" wide><input value={values.eventTitle} onChange={(event) => updateValue("eventTitle", event.target.value)} placeholder="Nombre del evento" autoFocus /></QrField><QrField label="Inicio"><input type="datetime-local" value={values.eventStart} onChange={(event) => updateValue("eventStart", event.target.value)} /></QrField><QrField label="Final"><input type="datetime-local" value={values.eventEnd} onChange={(event) => updateValue("eventEnd", event.target.value)} /></QrField><QrField label="Lugar" wide><input value={values.eventLocation} onChange={(event) => updateValue("eventLocation", event.target.value)} placeholder="Dirección o sala" /></QrField><QrField label="Descripción" wide><textarea value={values.eventDescription} onChange={(event) => updateValue("eventDescription", event.target.value)} placeholder="Información opcional" /></QrField></>;
      case "location":
        return <><QrField label="Latitud"><input inputMode="decimal" value={values.latitude} onChange={(event) => updateValue("latitude", event.target.value)} placeholder="12.1364" autoFocus /></QrField><QrField label="Longitud"><input inputMode="decimal" value={values.longitude} onChange={(event) => updateValue("longitude", event.target.value)} placeholder="-86.2514" /></QrField></>;
    }
  }

  return (
    <section className="tool-view qr-tool-view">
      <button className="back-button" onClick={onBack}><BackIcon /> Volver a herramientas</button>
      <div className="tool-heading">
        <ToolPixelIcon toolId="qr-generator" />
        <div><p className="eyebrow">Productividad</p><h1>Estudio QR</h1><p>Crea códigos avanzados, personalizados y completamente locales.</p></div>
      </div>

      <div className="qr-studio">
        <div className="qr-editor">
          <section className="qr-section">
            <div className="qr-section-heading"><span>01</span><div><strong>Tipo de código</strong><small>Elige qué ocurrirá al escanearlo</small></div></div>
            <div className="qr-type-grid">
              {contentOptions.map(({ id, label, description, icon: PixelIconComponent, modernIcon: ModernIconComponent }) => {
                const IconComponent = useModernIcons ? ModernIconComponent : PixelIconComponent;
                return <button key={id} className={contentType === id ? "qr-type active" : "qr-type"} onClick={() => setContentType(id)} title={description}><IconComponent /><span><strong>{label}</strong><small>{description}</small></span>{contentType === id && <SelectedIcon className="qr-selected" />}</button>;
              })}
            </div>
          </section>

          <section className="qr-section">
            <div className="qr-section-heading"><span>02</span><div><strong>Contenido</strong><small>{activeContent.description}</small></div></div>
            <div className="qr-fields">{renderContentFields()}</div>
          </section>

          <section className="qr-section">
            <div className="qr-section-heading"><span>03</span><div><strong>Diseño</strong><small>Personaliza sin perder capacidad de lectura</small></div></div>
            <div className="qr-design-tabs" role="tablist" aria-label="Opciones de diseño">
              <button className={designTab === "shape" ? "active" : ""} onClick={() => setDesignTab("shape")}><ShapeIcon /> Forma</button>
              <button className={designTab === "colors" ? "active" : ""} onClick={() => setDesignTab("colors")}><ColorIcon /> Color</button>
              <button className={designTab === "frame" ? "active" : ""} onClick={() => setDesignTab("frame")}><FrameIcon /> Marco</button>
              <button className={designTab === "logo" ? "active" : ""} onClick={() => setDesignTab("logo")}><LogoIcon /> Logo</button>
            </div>

            <div className="qr-design-panel">
              {designTab === "shape" && <>
                <div className="qr-option-group"><strong>Forma de los módulos</strong><div className="qr-choice-row">{moduleStyles.map(({ id, label, icon: PixelIconComponent, modernIcon: ModernIconComponent }) => { const IconComponent = useModernIcons ? ModernIconComponent : PixelIconComponent; return <button key={id} className={moduleStyle === id ? "active" : ""} onClick={() => setModuleStyle(id)}><IconComponent /><span>{label}</span></button>; })}</div></div>
                <div className="qr-option-group"><strong>Estilo de las esquinas</strong><div className="qr-choice-row">{eyeStyles.map(({ id, label, icon: PixelIconComponent, modernIcon: ModernIconComponent }) => { const IconComponent = useModernIcons ? ModernIconComponent : PixelIconComponent; return <button key={id} className={eyeStyle === id ? "active" : ""} onClick={() => setEyeStyle(id)}><IconComponent /><span>{label}</span></button>; })}</div></div>
                <div className="qr-sliders"><label><span>Tamaño <output>{size}px</output></span><input type="range" min="240" max="800" step="20" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label><label><span>Margen seguro <output>{margin}</output></span><input type="range" min="1" max="6" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></label><label><span>Corrección de errores</span><select value={errorCorrection} onChange={(event) => setErrorCorrection(event.target.value as QrErrorCorrection)} disabled={Boolean(logoData)}><option value="L">Baja · 7%</option><option value="M">Media · 15%</option><option value="Q">Alta · 25%</option><option value="H">Máxima · 30%</option></select></label></div>
              </>}

              {designTab === "colors" && <><div className="qr-color-grid"><ColorField label="Color del código" value={foreground} onChange={setForeground} /><ColorField label="Color de las esquinas" value={eyeColor} onChange={setEyeColor} /><ColorField label="Color del fondo" value={background} onChange={setBackground} /></div><label className="qr-switch"><input type="checkbox" checked={transparent} onChange={(event) => setTransparent(event.target.checked)} /><span>Fondo transparente</span></label><p className="qr-design-note">Mantén suficiente contraste entre el código y el fondo para que cualquier cámara pueda leerlo.</p></>}

              {designTab === "frame" && <><div className="qr-frame-grid">{frameStyles.map(({ id, label, description, icon: PixelIconComponent, modernIcon: ModernIconComponent }) => { const IconComponent = useModernIcons ? ModernIconComponent : PixelIconComponent; return <button key={id} className={frameStyle === id ? "active" : ""} onClick={() => setFrameStyle(id)}><IconComponent /><span><strong>{label}</strong><small>{description}</small></span></button>; })}</div>{frameStyle === "label" && <QrField label="Texto del marco" wide><input value={frameLabel} maxLength={36} onChange={(event) => setFrameLabel(event.target.value)} /></QrField>}</>}

              {designTab === "logo" && <><input ref={logoInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseLogo(event.target.files?.[0])} />{logoData ? <div className="qr-logo-selected"><img src={logoData} alt="Logo seleccionado" /><span><strong>{logoName}</strong><small>Corrección máxima activada automáticamente</small></span><button onClick={() => { setLogoData(""); setLogoName(""); }}><DeleteIcon /> Quitar</button></div> : <button className="qr-logo-picker" onClick={() => logoInputRef.current?.click()}><UploadIcon /><span><strong>Seleccionar logo</strong><small>PNG, JPG o WebP · máximo 2 MB</small></span></button>}<p className="qr-design-note">El logo ocupa una zona segura central. Prueba el código con varios teléfonos antes de imprimirlo.</p></>}
            </div>
          </section>
        </div>

        <aside className="qr-preview-panel">
          <div className="qr-preview-heading"><span>04</span><div><strong>Vista previa</strong><small>Se actualiza automáticamente</small></div></div>
          <div className={transparent ? "qr-canvas checkerboard" : "qr-canvas"}>{result ? <img src={result} alt={`Código QR de tipo ${activeContent.label}`} /> : <div className="qr-empty"><EmptyQrIcon /><span>Completa los datos para generar</span></div>}</div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className="qr-preview-meta"><span><strong>{activeContent.label}</strong><small>{size}px · margen {margin} · corrección {logoData ? "H" : errorCorrection}</small></span><i className={result ? "ready" : ""}>{result ? "Listo" : "Pendiente"}</i></div>
          <button className="primary-button qr-download" disabled={!result} onClick={download}><DownloadIcon /> Guardar PNG</button>
          <p className="privacy-note">Generación local · Sin cuentas · Sin anuncios · Sin subir datos</p>
        </aside>
      </div>
    </section>
  );
}
