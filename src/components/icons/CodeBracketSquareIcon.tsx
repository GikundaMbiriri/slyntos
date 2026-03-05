import React from 'react';
import { Code2 } from 'lucide-react';

const CodeBracketSquareIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <Code2 className={className} />
);

export default CodeBracketSquareIcon;
