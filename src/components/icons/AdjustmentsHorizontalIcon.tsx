import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

const AdjustmentsHorizontalIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <SlidersHorizontal className={className} />
);

export default AdjustmentsHorizontalIcon;
