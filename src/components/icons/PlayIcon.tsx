import React from 'react';
import { Play } from 'lucide-react';

const PlayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Play className={className} />
);

export default PlayIcon;
