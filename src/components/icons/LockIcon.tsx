import React from 'react';
import { Lock } from 'lucide-react';

const LockIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Lock className={className} />
);

export default LockIcon;
