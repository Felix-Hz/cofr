interface PiePayload {
  category: string;
  total: number;
  count: number;
  percentage: string;
  fill: string;
  formatted: string;
}

interface Props {
  active?: boolean;
  payload?: Array<{ payload: PiePayload }>;
}

export default function CategoryPieTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-surface-elevated border border-edge-strong rounded-lg shadow-xl px-4 py-3 text-sm backdrop-blur-sm">
      <div className="flex items-center gap-2.5 font-semibold text-content-primary">
        <span
          className="w-2 h-2 rounded-full ring-2 ring-white/20"
          style={{ backgroundColor: data.fill }}
        />
        {data.category}
      </div>
      <div className="mt-1.5 space-y-0.5 text-xs text-content-secondary">
        <div className="flex justify-between gap-6">
          <span>Amount</span>
          <span className="font-medium text-content-primary">{data.formatted}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Transactions</span>
          <span className="font-medium text-content-primary">{data.count}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Share</span>
          <span className="font-medium text-content-primary">{data.percentage}</span>
        </div>
      </div>
    </div>
  );
}
