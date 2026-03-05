import React from 'react';
import { Mic } from 'lucide-react';

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Mic className={className} />
);

export default MicrophoneIcon;
