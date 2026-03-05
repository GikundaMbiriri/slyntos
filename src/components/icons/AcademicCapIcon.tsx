import React from 'react';
import { GraduationCap } from 'lucide-react';

const AcademicCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <GraduationCap className={className} />
);

export default AcademicCapIcon;
