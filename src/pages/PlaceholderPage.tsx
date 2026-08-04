import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-sangam-gradient flex items-center justify-center mb-4 shadow-lg shadow-coral-500/20">
        <Construction className="h-8 w-8 text-white" />
      </div>
      <h1 className="font-heading text-xl font-extrabold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-gray-400 text-sm mt-2 max-w-xs">
        {description || 'This feature is coming in the next phase. Stay tuned!'}
      </p>
    </div>
  );
}
