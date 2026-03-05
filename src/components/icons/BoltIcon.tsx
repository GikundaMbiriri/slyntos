import React from 'react';
import { Zap } from 'lucide-react';

const BoltIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Zap className={className} />
);

export default BoltIcon;
