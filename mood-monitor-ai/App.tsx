
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mood } from './types';
import { analyzeFacialExpression, getPreventiveMeasures } from './services/geminiService';
import CameraFeed from './components/CameraFeed';
import MoodDisplay from './components/MoodDisplay';
import { CameraIcon, StopIcon } from './components/icons';

const App: React.FC = () => {
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsCameraOn(false);
    setStream(null);
    setCurrentMood(null);
    setSuggestions([]);
    setIsLoading(false);
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    setCurrentMood(null);
    setSuggestions([]);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      setStream(mediaStream);
      setIsCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access the camera. Please check permissions and try again.");
    }
  };

  const handleToggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    
    if (context) {
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      if (base64Image) {
        try {
          const moodAnalysis = await analyzeFacialExpression(base64Image);
          if (moodAnalysis.mood !== currentMood) {
            setCurrentMood(moodAnalysis.mood);
            if (moodAnalysis.mood !== Mood.Unknown && moodAnalysis.mood !== Mood.Neutral) {
                const newSuggestions = await getPreventiveMeasures(moodAnalysis.mood);
                setSuggestions(newSuggestions);
            } else {
                setSuggestions([]);
            }
          }
        } catch (apiError) {
          console.error("API Error:", apiError);
          setError("Failed to analyze mood. Please try again later.");
        }
      }
    }
    setIsLoading(false);
  }, [currentMood]);

  useEffect(() => {
    if (isCameraOn && stream) {
      intervalRef.current = setInterval(analyzeFrame, 5000); // Analyze every 5 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCameraOn, stream, analyzeFrame]);

  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 font-sans">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            Mood Monitor AI
          </h1>
          <p className="mt-2 text-lg text-gray-400">Real-time mood analysis for better well-being.</p>
        </header>

        <main className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="w-full lg:w-3/5 flex flex-col items-center">
            <CameraFeed videoRef={videoRef} isCameraOn={isCameraOn} />
            <button
              onClick={handleToggleCamera}
              className={`mt-6 inline-flex items-center justify-center gap-2 px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                isCameraOn 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'
              }`}
            >
              {isCameraOn ? <StopIcon className="w-5 h-5"/> : <CameraIcon className="w-5 h-5"/>}
              {isCameraOn ? 'Stop Analysis' : 'Start Analysis'}
            </button>
            {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
          </div>

          <MoodDisplay 
            mood={currentMood} 
            suggestions={suggestions} 
            isLoading={isLoading} 
            isCameraOn={isCameraOn}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
