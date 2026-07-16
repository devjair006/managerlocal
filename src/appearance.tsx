import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

export type ThemePreference = "dark" | "light" | "system";
export type IconStyle = "pixel" | "modern";
export const MIN_WINDOW_OPACITY = 58;

export interface AppearancePreferences {
  theme: ThemePreference;
  iconStyle: IconStyle;
  accent: string;
  opacity: number;
}

export const accentOptions = [
  { value: "#00E68A", label: "Verde local" },
  { value: "#4F8CFF", label: "Azul eléctrico" },
  { value: "#D99A3D", label: "Ámbar" },
  { value: "#D96C75", label: "Coral" },
  { value: "#9B7EDE", label: "Violeta" },
] as const;

const STORAGE_KEY = "managerlocal.appearance";
const defaults: AppearancePreferences = {
  theme: "dark",
  iconStyle: "pixel",
  accent: accentOptions[0].value,
  opacity: 100,
};

interface AppearanceContextValue {
  preferences: AppearancePreferences;
  setTheme: (theme: ThemePreference, origin?: { x: number; y: number }) => void;
  updatePreference: <Key extends keyof AppearancePreferences>(key: Key, value: AppearancePreferences[Key]) => void;
  resetAppearance: () => void;
}

interface ViewTransitionHandle {
  finished: Promise<void>;
}

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionHandle;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function loadAppearance(): AppearancePreferences {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<AppearancePreferences>;
    return {
      theme: parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system" ? parsed.theme : defaults.theme,
      iconStyle: parsed.iconStyle === "modern" || parsed.iconStyle === "pixel" ? parsed.iconStyle : defaults.iconStyle,
      accent: accentOptions.some((option) => option.value === parsed.accent) ? parsed.accent! : defaults.accent,
      opacity: typeof parsed.opacity === "number" ? Math.min(100, Math.max(MIN_WINDOW_OPACITY, parsed.opacity)) : defaults.opacity,
    };
  } catch {
    return defaults;
  }
}

function resolveTheme(theme: ThemePreference, systemIsDark: boolean) {
  return theme === "system" ? (systemIsDark ? "dark" : "light") : theme;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AppearancePreferences>(loadAppearance);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyAppearance() {
      const resolvedTheme = resolveTheme(preferences.theme, media.matches);
      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.dataset.themePreference = preferences.theme;
      document.documentElement.dataset.iconStyle = preferences.iconStyle;
      document.documentElement.style.setProperty("--px-accent", preferences.accent);
    }

    applyAppearance();
    media.addEventListener("change", applyAppearance);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return () => media.removeEventListener("change", applyAppearance);
  }, [preferences]);

  function setTheme(theme: ThemePreference, origin?: { x: number; y: number }) {
    const root = document.documentElement;
    const transitionDocument = document as TransitionDocument;
    const nextTheme = resolveTheme(theme, window.matchMedia("(prefers-color-scheme: dark)").matches);
    const currentTheme = root.dataset.theme;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (root.dataset.themeTransition === "active") return;

    if (!transitionDocument.startViewTransition || reduceMotion || currentTheme === nextTheme) {
      setPreferences((current) => ({ ...current, theme }));
      return;
    }

    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty("--theme-transition-x", `${x}px`);
    root.style.setProperty("--theme-transition-y", `${y}px`);
    root.style.setProperty("--theme-transition-radius", `${Math.ceil(radius)}px`);
    root.dataset.themeTransition = "active";

    try {
      const transition = transitionDocument.startViewTransition(() => {
        flushSync(() => setPreferences((current) => ({ ...current, theme })));
        root.dataset.theme = nextTheme;
        root.dataset.themePreference = theme;
      });

      void transition.finished
        .catch(() => undefined)
        .finally(() => {
          delete root.dataset.themeTransition;
        });
    } catch {
      delete root.dataset.themeTransition;
      setPreferences((current) => ({ ...current, theme }));
    }
  }

  const value = useMemo<AppearanceContextValue>(() => ({
    preferences,
    setTheme,
    updatePreference: (key, value) => setPreferences((current) => ({ ...current, [key]: value })),
    resetAppearance: () => setPreferences(defaults),
  }), [preferences]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance debe usarse dentro de AppearanceProvider");
  return context;
}
