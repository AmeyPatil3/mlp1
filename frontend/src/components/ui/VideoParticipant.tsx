
import React, { useEffect, useRef } from 'react';
import type { Participant } from '../../types';
import { UserIcon, MicOffIcon } from './icons';
import ReactionOverlay from './ReactionOverlay';
import AudioVisualizer from './AudioVisualizer';

interface VideoParticipantProps {
    participant: Participant;
    isLocal: boolean;
    stream?: MediaStream;
}

const VideoParticipant: React.FC<VideoParticipantProps> = ({ participant, isLocal, stream }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const hasActiveVideo = stream && !participant.isCameraOff;
        if (hasActiveVideo) {
            // Stream identity guard to prevent infinite re-binding and resets
            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            if (video.paused) {
                const play = async () => {
                    try {
                        await video.play();
                    } catch (e) {
                        console.warn('Video play failed:', e);
                    }
                };
                play();
            }
        } else {
            if (video.srcObject !== null) {
                video.srcObject = null;
            }
        }
    }, [stream, participant.isCameraOff]);

    const showVideo = !!(stream && !participant.isCameraOff);

    return (
        <div className="bg-gray-800 rounded-lg relative overflow-hidden flex items-center justify-center aspect-video shadow-lg border border-gray-700/50">
            {/* Always mount video element to avoid ref unmounting race conditions */}
            <video
                ref={videoRef}
                className={`w-full h-full object-cover absolute inset-0 ${showVideo ? 'block' : 'hidden'}`}
                muted={isLocal}
                autoPlay
                playsInline
            />

            {/* Avatar placeholder visible when video is off */}
            <div className={`w-full h-full bg-black flex items-center justify-center absolute inset-0 ${showVideo ? 'hidden' : 'block'}`}>
                <UserIcon className="w-16 h-16 text-gray-600 animate-pulse" />
            </div>

            {/* Hardware-accelerated dynamic floating reaction overlays */}
            <ReactionOverlay participantId={participant.id} />

            {/* Live active speaker waveform visualizer overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-10">
                <AudioVisualizer stream={stream} isMuted={participant.isMuted} />
            </div>

            <div className="absolute bottom-0 left-0 bg-black bg-opacity-60 px-3 py-1.5 rounded-tr-lg z-30 border-r border-t border-gray-800">
                <span className="text-white text-xs font-semibold">{participant.name}</span>
            </div>

            {participant.isMuted && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 p-2 rounded-full z-30 border border-gray-800 shadow">
                    <MicOffIcon className="w-4 h-4 text-red-500" />
                </div>
            )}
        </div>
    );
};

export default VideoParticipant;
