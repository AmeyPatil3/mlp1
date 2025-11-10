import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mood } from './types';
import { analyzeFacialExpression, getPreventiveMeasures } from './services/geminiService';
import CameraFeed from './components/CameraFeed';
import MoodDisplay from './components/MoodDisplay';
import { CameraIcon, StopIcon } from './components/icons';

const MoodApp: React.FC = () => {
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);

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
    setIsVideoReady(false);
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    setCurrentMood(null);
    setSuggestions([]);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Your browser does not support camera access (getUserMedia). Please try the latest Chrome, Edge, or Safari.");
        return;
      }
      // Attempt with chosen device → facingMode:user → generic video:true, and disable audio
      const attempts: MediaStreamConstraints[] = [];
      if (selectedDeviceId) attempts.push({ video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      attempts.push({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      attempts.push({ video: true, audio: false });

      let mediaStream: MediaStream | null = null;
      let lastErr: unknown = null;
      for (const c of attempts) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(c);
          if (mediaStream) break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!mediaStream) {
        throw lastErr || new Error("Could not start camera");
      }
      setStream(mediaStream);
      setIsCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          if ('onloadedmetadata' in videoRef.current) {
            videoRef.current.onloadedmetadata = async () => {
              try { 
                await videoRef.current?.play(); 
                setIsVideoReady(true);
                // Kick off an immediate analysis once video has data
                analyzeFrame();
              } catch {}
            };
            // Also listen for loadeddata as a fallback
            videoRef.current.addEventListener('loadeddata', () => {
              setIsVideoReady(true);
              analyzeFrame();
            }, { once: true });
          } else {
            await videoRef.current.play();
            setIsVideoReady(true);
            analyzeFrame();
          }
        } catch (playErr) {
          // Some browsers require an additional user gesture
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      const msg = (err as DOMException)?.name === 'NotAllowedError'
        ? "Camera permission denied. Please allow camera access in your browser settings and try again."
        : (err as DOMException)?.name === 'NotFoundError'
          ? "No camera found. Connect a camera or use a device with a camera."
          : "Could not access the camera. Please check permissions and try again.";
      setError(msg);
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
    if (!isVideoReady) return;
    // Avoid analyzing when video metadata not yet available
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      return;
    }
    setIsLoading(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Draw the current frame as-is; UI video is mirrored via CSS
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
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
  }, [currentMood, isVideoReady]);

  useEffect(() => {
    if (isCameraOn && stream) {
      intervalRef.current = setInterval(analyzeFrame, 5000);
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
      stopCamera();
    };
  }, [stopCamera]);

  // Load available video input devices to allow user to select a specific camera (no pre-permission stream)
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter(d => d.kind === 'videoinput');
        setDevices(cams);
        if (cams.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(cams[0].deviceId);
        }
      } catch (e) {
        // no-op
      }
    };
    if (navigator.mediaDevices?.enumerateDevices) {
      loadDevices();
    }
  }, [selectedDeviceId]);

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
            {!isCameraOn && !error && (
              <p className="mt-3 text-xs text-gray-400">
                Click “Start Analysis”, then allow camera permission when prompted.
              </p>
            )}
            {devices.length > 0 && (
              <div className="mt-4 w-full max-w-md flex items-center gap-2">
                <label className="text-sm text-gray-300">Camera:</label>
                <select
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={isCameraOn}
                >
                  {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
                  ))}
                </select>
              </div>
            )}
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

export default MoodApp;


