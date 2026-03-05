import React from 'react';
import { Link } from 'lucide-react';

const LinkIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Link className={className} />
);

export default LinkIcon;
