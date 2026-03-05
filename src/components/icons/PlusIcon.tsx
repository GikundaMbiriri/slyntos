import React from 'react';
import { Plus } from 'lucide-react';

const PlusIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Plus className={className} />
);

export default PlusIcon;
