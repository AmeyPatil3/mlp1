
import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
    message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const { text, senderName, isLocal } = message;

    return (
        <div className={`flex flex-col ${isLocal ? 'items-end' : 'items-start'}`}>
            {!isLocal && <p className="text-xs text-gray-500 mb-1 ml-2">{senderName}</p>}
            <div className={`max-w-xs md:max-w-md rounded-xl px-4 py-2 ${isLocal ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                <p className="text-sm">{text}</p>
            </div>
        </div>
    );
};

export default ChatMessage;
