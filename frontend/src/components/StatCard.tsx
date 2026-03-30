interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent: "cyan" | "emerald" | "amber" | "rose";
  icon: React.ReactNode;
}

export default function StatCard({ title, value, subtitle, accent, icon }: StatCardProps) {
  return (
    <div className={`stat-card ${accent}`}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `var(--accent-${accent}-glow, rgba(100,100,100,0.15))` }}
        >
          <span style={{ color: `var(--accent-${accent})` }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      {subtitle && (
        <p className="text-xs mt-2" style={{ color: `var(--accent-${accent})` }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
