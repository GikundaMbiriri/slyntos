import React from 'react';
import { Square } from 'lucide-react';

const StopIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Square className={className} />
);

export default StopIcon;
