import { Link } from 'react-router-dom';

interface ModuleHeaderProps {
  title: string;
  description: string;
}

export function ModuleHeader({ title, description }: ModuleHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        to="/"
        className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
      >
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
