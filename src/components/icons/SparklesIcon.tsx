import React from 'react';
import { Sparkles } from 'lucide-react';

const SparklesIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Sparkles className={className} />
);

export default SparklesIcon;
