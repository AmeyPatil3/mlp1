
import React, { useEffect, useRef } from 'react';
import type { Participant } from '../../types';
import { UserIcon, MicOffIcon } from './icons';

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
        if (stream && !participant.isCameraOff) {
            video.srcObject = stream;
            const play = async () => {
                try { await video.play(); } catch (_) {}
            };
            play();
        } else {
            video.srcObject = null;
        }
    }, [stream, participant.isCameraOff]);

    return (
        <div className="bg-gray-800 rounded-lg relative overflow-hidden flex items-center justify-center aspect-video">
            {stream && !participant.isCameraOff ? (
                <video ref={videoRef} className="w-full h-full object-cover" muted={isLocal} playsInline />
            ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                    <UserIcon className="w-16 h-16 text-gray-600" />
                </div>
            )}

            <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 px-3 py-1.5 rounded-tr-lg">
                <span className="text-white text-sm font-medium">{participant.name}</span>
            </div>

            {participant.isMuted && (
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 p-2 rounded-full">
                    <MicOffIcon className="w-5 h-5 text-red-500" />
                </div>
            )}
        </div>
    );
};

export default VideoParticipant;
