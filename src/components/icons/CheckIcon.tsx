import React from 'react';
import { Check } from 'lucide-react';

const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Check className={className} />
);

export default CheckIcon;
