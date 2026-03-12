const COLOR_PRESETS: { light: string; dark: string }[] = [
  { light: "#22c55e", dark: "#4ade80" }, // green
  { light: "#10b981", dark: "#34d399" }, // emerald
  { light: "#14b8a6", dark: "#2dd4bf" }, // teal
  { light: "#06b6d4", dark: "#22d3ee" }, // cyan
  { light: "#0ea5e9", dark: "#7dd3fc" }, // sky
  { light: "#6366f1", dark: "#818cf8" }, // indigo
  { light: "#8b5cf6", dark: "#a78bfa" }, // violet
  { light: "#a855f7", dark: "#c084fc" }, // purple
  { light: "#ec4899", dark: "#f472b6" }, // pink
  { light: "#ef4444", dark: "#f87171" }, // red
  { light: "#f97316", dark: "#fb923c" }, // orange
  { light: "#eab308", dark: "#facc15" }, // yellow
  { light: "#a3e635", dark: "#bef264" }, // lime
  { light: "#0284c7", dark: "#38bdf8" }, // sky-600
  { light: "#6b7280", dark: "#9ca3af" }, // gray
  { light: "#78716c", dark: "#a8a29e" }, // stone
];

interface CategoryColorPickerProps {
  selectedLight: string;
  selectedDark: string;
  onSelect: (light: string, dark: string) => void;
}

export default function CategoryColorPicker({
  selectedLight,
  selectedDark,
  onSelect,
}: CategoryColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">Color</label>
      <div className="grid grid-cols-8 gap-2">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = preset.light === selectedLight && preset.dark === selectedDark;
          return (
            <button
              key={preset.light}
              type="button"
              onClick={() => onSelect(preset.light, preset.dark)}
              className={`w-8 h-8 rounded-full transition-all ${
                isSelected
                  ? "ring-2 ring-offset-2 ring-emerald ring-offset-surface-primary scale-110"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: preset.light }}
              aria-label={`Color ${preset.light}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export { COLOR_PRESETS };
