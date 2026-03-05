import React from 'react';
import { XCircle } from 'lucide-react';

const XCircleIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <XCircle className={className} />
);

export default XCircleIcon;
