import React from 'react';
import { Briefcase } from 'lucide-react';

const BriefcaseIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Briefcase className={className} />
);

export default BriefcaseIcon;
