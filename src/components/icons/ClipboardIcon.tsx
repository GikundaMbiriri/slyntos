import React from 'react';
import { Clipboard } from 'lucide-react';

const ClipboardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Clipboard className={className} />
);

export default ClipboardIcon;
