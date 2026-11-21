// Twelve keys checked with the data-visualisation validator (OKLab ΔE, Machado 2009 colour-blind simulation):
// light and dark both pass the lightness band, contrast and normal-vision floors; dark's worst adjacent
// colour-blind pair is ΔE 7.3, allowed because a category key always sits beside its name. Graphite is the
// deliberate neutral. Existing categories keep whatever colour they were saved with.
const COLOR_PRESETS: { light: string; dark: string; name: string }[] = [
  { light: "#2f56c9", dark: "#6b86ee", name: "cobalt" },
  { light: "#d9541e", dark: "#e0622a", name: "ember" },
  { light: "#0f8a6a", dark: "#22a07a", name: "sea green" },
  { light: "#8a5cd6", dark: "#9a7ee8", name: "violet" },
  { light: "#a8771a", dark: "#b8862a", name: "ochre" },
  { light: "#c2456f", dark: "#d0688c", name: "rose" },
  { light: "#0b84a8", dark: "#2a98bc", name: "cyan" },
  { light: "#6f8a12", dark: "#82a024", name: "olive" },
  { light: "#9b3fa6", dark: "#c060c0", name: "plum" },
  { light: "#5f6270", dark: "#737a90", name: "graphite" },
  { light: "#b3602a", dark: "#c8783f", name: "copper" },
  { light: "#2a6e9e", dark: "#5b94cf", name: "steel" },
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
  isDark?: boolean;
}

export default function CategoryColorPicker({
  selectedLight,
  selectedDark,
  onSelect,
  usedColors = [],
  isDark = false,
}: CategoryColorPickerProps) {
  return (
    <div>
      <label className="label block mb-2">Colour</label>
      <div className="grid grid-cols-6 gap-2 max-w-[18rem]">
        {COLOR_PRESETS.map((preset) => {
          const isSelected = preset.light === selectedLight && preset.dark === selectedDark;
          const displayColor = isDark ? preset.dark : preset.light;
          const usedBy = usedColors.find((u) => u.light === preset.light);
          return (
            <div key={preset.light} className="relative group">
              <button
                type="button"
                onClick={() => onSelect(preset.light, preset.dark)}
                aria-pressed={isSelected}
                className={`relative block w-9 h-9 rounded-sm transition-shadow ${
                  isSelected ? "ring-2 ring-offset-2 ring-accent ring-offset-surface-primary" : ""
                }`}
                style={{ backgroundColor: displayColor }}
                aria-label={`${preset.name}${usedBy ? `, used by ${usedBy.categoryName}` : ""}`}
              >
                {usedBy && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 right-1 size-1.5 bg-surface-primary pointer-events-none"
                  />
                )}
              </button>
              {usedBy && (
                <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-[11px] text-surface-primary bg-content-heading rounded-sm whitespace-nowrap z-10 pointer-events-none">
                  Used by {usedBy.categoryName}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {usedColors.length > 0 && (
        <p className="mt-2 text-[10px] text-content-muted">
          A square on a swatch means another category uses it.
        </p>
      )}
    </div>
  );
}

export { COLOR_PRESETS };
