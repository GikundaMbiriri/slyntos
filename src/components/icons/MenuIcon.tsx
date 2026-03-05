import React from 'react';
import { Menu } from 'lucide-react';

const MenuIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Menu className={className} />
);

export default MenuIcon;
