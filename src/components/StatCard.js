import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, tone, subtext }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-surface-300" />
      </div>
      <p className="text-2xl font-display font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-surface-400">{label}</p>
      {subtext ? <p className="mt-1 text-[11px] text-surface-300">{subtext}</p> : null}
    </div>
  );
}
