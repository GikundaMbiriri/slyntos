import React from 'react';
import { MessageSquare } from 'lucide-react';

const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <MessageSquare className={className} />
);

export default ChatBubbleLeftRightIcon;
