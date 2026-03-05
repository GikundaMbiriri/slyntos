import React from 'react';
import { Rocket } from 'lucide-react';

const RocketIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Rocket className={className} />
);

export default RocketIcon;
