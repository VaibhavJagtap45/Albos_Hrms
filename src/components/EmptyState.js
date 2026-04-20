export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[28px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-[0_18px_40px_rgba(109,40,217,0.28)]">
        {Icon ? <Icon className="h-7 w-7" /> : null}
      </div>
      <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-purple-600">
        Nothing to show
      </span>
      <h3 className="mt-4 text-xl font-display font-bold text-gray-900">{title}</h3>
      {description ? <p className="mt-3 max-w-md text-sm leading-6 text-surface-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
