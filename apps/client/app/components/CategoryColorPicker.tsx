const COLOR_PRESETS: { light: string; dark: string }[] = [
  // Row 1: red → yellow (warm)
  { light: "#ef4444", dark: "#f87171" }, // red
  { light: "#dc2626", dark: "#fca5a5" }, // red-600
  { light: "#f97316", dark: "#fb923c" }, // orange
  { light: "#ea580c", dark: "#fdba74" }, // orange-600
  { light: "#eab308", dark: "#facc15" }, // yellow
  { light: "#ca8a04", dark: "#fde047" }, // yellow-600
  { light: "#a3e635", dark: "#bef264" }, // lime
  { light: "#65a30d", dark: "#d9f99d" }, // lime-600
  // Row 2: green → cyan (natural)
  { light: "#22c55e", dark: "#4ade80" }, // green
  { light: "#10b981", dark: "#34d399" }, // emerald
  { light: "#059669", dark: "#6ee7b7" }, // emerald-600
  { light: "#14b8a6", dark: "#2dd4bf" }, // teal
  { light: "#0d9488", dark: "#5eead4" }, // teal-600
  { light: "#06b6d4", dark: "#22d3ee" }, // cyan
  { light: "#0891b2", dark: "#67e8f9" }, // cyan-600
  { light: "#0ea5e9", dark: "#7dd3fc" }, // sky
  // Row 3: blue → purple (cool)
  { light: "#0284c7", dark: "#38bdf8" }, // sky-600
  { light: "#0369a1", dark: "#7dd3fc" }, // sky-700
  { light: "#2563eb", dark: "#60a5fa" }, // blue
  { light: "#4f46e5", dark: "#a5b4fc" }, // indigo-600
  { light: "#6366f1", dark: "#818cf8" }, // indigo
  { light: "#7c3aed", dark: "#c4b5fd" }, // violet-600
  { light: "#8b5cf6", dark: "#a78bfa" }, // violet
  { light: "#a855f7", dark: "#c084fc" }, // purple
  // Row 4: purple → pink + neutrals
  { light: "#9333ea", dark: "#d8b4fe" }, // purple-600
  { light: "#db2777", dark: "#f9a8d4" }, // pink-600
  { light: "#ec4899", dark: "#f472b6" }, // pink
  { light: "#be185d", dark: "#fda4af" }, // rose
  { light: "#78716c", dark: "#a8a29e" }, // stone
  { light: "#57534e", dark: "#d6d3d1" }, // stone-600
  { light: "#6b7280", dark: "#9ca3af" }, // gray
  { light: "#374151", dark: "#d1d5db" }, // gray-700
];

interface UsedColor {
  light: string;
  dark: string;
  categoryName: string;
}

interface CategoryColorPickerProps {
  selectedLight: string;
  selectedDark: string;
  onSelect: (light: string, dark: string) => void;
  usedColors?: UsedColor[];
}

export default function CategoryColorPicker({
  selectedLight,
  selectedDark,
  onSelect,
  usedColors = [],
}: CategoryColorPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-content-secondary mb-2">Color</label>
      <div className="grid grid-cols-8 gap-2">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = preset.light === selectedLight && preset.dark === selectedDark;
          const usedBy = usedColors.find((u) => u.light === preset.light);
          return (
            <div key={preset.light} className="relative group">
              <button
                type="button"
                onClick={() => onSelect(preset.light, preset.dark)}
                className={`w-8 h-8 rounded-full transition-all ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-emerald ring-offset-surface-primary scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: preset.light }}
                aria-label={`Color ${preset.light}${usedBy ? ` (used by ${usedBy.categoryName})` : ""}`}
              />
              {usedBy && (
                <>
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full pointer-events-none shadow-sm" />
                  <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-[10px] font-medium text-content-heading bg-surface-elevated border border-edge-strong rounded whitespace-nowrap z-10 pointer-events-none shadow-lg">
                    Used by: {usedBy.categoryName}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { COLOR_PRESETS };
