import React from 'react';
import { Download } from 'lucide-react';

const DownloadIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Download className={className} />
);

export default DownloadIcon;
