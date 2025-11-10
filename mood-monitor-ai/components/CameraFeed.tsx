
import React, { useEffect, RefObject } from 'react';

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement>;
  isCameraOn: boolean;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ videoRef, isCameraOn }) => {
  return (
    <div className="relative w-full aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100" />
      {!isCameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
          <svg className="w-16 h-16 text-gray-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.55a1 1 0 011.45.89V16.11a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-400">Camera is off</p>
          <p className="text-xs text-gray-500 mt-1">Click "Start Analysis" to begin</p>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
