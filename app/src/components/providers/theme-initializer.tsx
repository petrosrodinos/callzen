import { useTheme } from "@/hooks/use-theme";

// Applies the stored light/dark preference on every page, not only where the theme switch is rendered.
export function ThemeInitializer() {
  useTheme();
  return null;
}
