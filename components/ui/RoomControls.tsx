
import React from 'react';
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, PhoneXMarkIcon, ChatBubbleLeftEllipsisIcon } from './icons';

interface RoomControlsProps {
    isMuted: boolean;
    isCameraOff: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onLeave: () => void;
    onToggleChat: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className }) => (
    <button
        onClick={onClick}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${className}`}
    >
        {children}
    </button>
);


const RoomControls: React.FC<RoomControlsProps> = ({ isMuted, isCameraOff, onToggleMute, onToggleCamera, onLeave, onToggleChat }) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-50 p-4 flex justify-center items-center">
            <div className="flex space-x-4">
                <ControlButton onClick={onToggleMute} className={isMuted ? 'bg-red-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}>
                    {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
                </ControlButton>
                <ControlButton onClick={onToggleCamera} className={isCameraOff ? 'bg-red-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}>
                    {isCameraOff ? <VideoOffIcon className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
                </ControlButton>
                <ControlButton onClick={onToggleChat} className="bg-gray-600 text-white hover:bg-gray-500">
                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                </ControlButton>
                <ControlButton onClick={onLeave} className="bg-red-600 text-white hover:bg-red-700">
                    <PhoneXMarkIcon className="w-6 h-6" />
                </ControlButton>
            </div>
        </div>
    );
};

export default RoomControls;
