import React from 'react';
import { Clock } from 'lucide-react';

const ClockIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Clock className={className} />
);

export default ClockIcon;
