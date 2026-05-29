
import React from 'react';
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, PhoneXMarkIcon, ChatBubbleLeftEllipsisIcon } from './icons';

interface RoomControlsProps {
    isMuted: boolean;
    isCameraOff: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onLeave: () => void;
    onToggleChat: () => void;
    onSendReaction?: (type: string) => void;
    isWhiteboardActive?: boolean;
    onToggleWhiteboard?: () => void;
    isNotesActive?: boolean;
    onToggleNotes?: () => void;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; title?: string }> = ({ onClick, children, className, title }) => (
    <button
        onClick={onClick}
        title={title}
        className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 ${className}`}
    >
        {children}
    </button>
);


const RoomControls: React.FC<RoomControlsProps> = ({ isMuted, isCameraOff, onToggleMute, onToggleCamera, onLeave, onToggleChat, onSendReaction, isWhiteboardActive, onToggleWhiteboard, isNotesActive, onToggleNotes }) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-950/70 backdrop-blur-md p-4 flex justify-center items-center z-40 border-t border-gray-800/30">
            
            {/* Elegant Floating Reactions Bar */}
            {onSendReaction && (
                <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-gray-950 bg-opacity-80 backdrop-blur-md px-5 py-2 rounded-full border border-gray-700/50 shadow-2xl z-40">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1 select-none">Send love:</span>
                    <button
                        onClick={() => onSendReaction('support')}
                        className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200 focus:outline-none filter hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                        title="❤️ Support"
                        type="button"
                    >
                        ❤️
                    </button>
                    <button
                        onClick={() => onSendReaction('calm')}
                        className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200 focus:outline-none filter hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                        title="🧘 Calm"
                        type="button"
                    >
                        🧘
                    </button>
                    <button
                        onClick={() => onSendReaction('strength')}
                        className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200 focus:outline-none filter hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                        title="💪 Strength"
                        type="button"
                    >
                        💪
                    </button>
                    <button
                        onClick={() => onSendReaction('hug')}
                        className="text-2xl hover:scale-125 active:scale-90 transition-transform duration-200 focus:outline-none filter hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                        title="🤝 Hug"
                        type="button"
                    >
                        🤝
                    </button>
                </div>
            )}

            <div className="flex space-x-4">
                <ControlButton onClick={onToggleMute} className={isMuted ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600 shadow-md'}>
                    {isMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
                </ControlButton>
                <ControlButton onClick={onToggleCamera} className={isCameraOff ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-700 text-white hover:bg-gray-600 shadow-md'}>
                    {isCameraOff ? <VideoOffIcon className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
                </ControlButton>
                {onToggleWhiteboard && (
                    <ControlButton onClick={onToggleWhiteboard} className={isWhiteboardActive ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30' : 'bg-gray-700 text-white hover:bg-gray-600 shadow-md'}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </ControlButton>
                )}
                {onToggleNotes && (
                    <ControlButton 
                        onClick={onToggleNotes} 
                        className={isNotesActive ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/30' : 'bg-gray-700 text-white hover:bg-gray-600 shadow-md'}
                        title="Session Notes"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </ControlButton>
                )}
                <ControlButton onClick={onToggleChat} className="bg-gray-700 text-white hover:bg-gray-600 shadow-md">
                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                </ControlButton>
                <ControlButton onClick={onLeave} className="bg-red-600 text-white hover:bg-red-700 shadow-lg">
                    <PhoneXMarkIcon className="w-6 h-6" />
                </ControlButton>
            </div>
        </div>
    );
};

export default RoomControls;
