export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon ? <Icon className="mb-4 h-10 w-10 text-surface-200" /> : null}
      <h3 className="text-base font-display font-bold text-gray-900">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-surface-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
