import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    stream?: MediaStream;
    isMuted?: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isMuted = false }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Keep track of smoothed volume level
    const smoothedVolumeRef = useRef<number>(0);
    // Keep track of animated time/phase
    const timeRef = useRef<number>(0);

    useEffect(() => {
        // Setup Web Audio API if stream is available and has audio tracks
        const hasAudioTracks = stream && stream.getAudioTracks().length > 0;
        
        if (!hasAudioTracks || isMuted) {
            // Clean up Web Audio if muted or no audio tracks
            cleanupAudio();
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;

            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream!);
            sourceRef.current = source;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            source.connect(analyser);

            // Attempt to resume context if suspended (browser security)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
        } catch (err) {
            console.warn('AudioVisualizer Web Audio API setup failed:', err);
        }

        return () => {
            cleanupAudio();
        };
    }, [stream, isMuted]);

    const cleanupAudio = () => {
        if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch (_) {}
            sourceRef.current = null;
        }
        if (analyserRef.current) {
            try { analyserRef.current.disconnect(); } catch (_) {}
            analyserRef.current = null;
        }
        if (audioContextRef.current) {
            if (audioContextRef.current.state !== 'closed') {
                try { audioContextRef.current.close(); } catch (_) {}
            }
            audioContextRef.current = null;
        }
    };

    // Canvas size sync & animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        if (!canvas || !parent) return;

        const resizeCanvas = () => {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        };

        resizeCanvas();
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(parent);

        const dataArray = new Uint8Array(128);

        const animate = () => {
            const currentCanvas = canvasRef.current;
            const ctx = currentCanvas?.getContext('2d');
            if (!currentCanvas || !ctx) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            const width = currentCanvas.width;
            const height = currentCanvas.height;

            // Clear canvas completely
            ctx.clearRect(0, 0, width, height);

            let volume = 0;
            const analyser = analyserRef.current;

            if (analyser && !isMuted) {
                try {
                    analyser.getByteTimeDomainData(dataArray);
                    let sumSquares = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const normalized = (dataArray[i] - 128) / 128;
                        sumSquares += normalized * normalized;
                    }
                    const rms = Math.sqrt(sumSquares / dataArray.length);
                    // Boost the sensitivity a bit for beautiful visual response
                    volume = Math.min(rms * 4.5, 1.0);
                } catch (_) {
                    volume = 0;
                }
            }

            // Smooth the volume transition
            smoothedVolumeRef.current = smoothedVolumeRef.current * 0.75 + volume * 0.25;
            
            // Increment the time index for phase animation
            timeRef.current += 1;

            const finalVolume = smoothedVolumeRef.current;

            // If muted, we draw a flat, clean line. If unmuted but quiet, we draw a gentle breathing idle wave.
            const baseAmplitude = isMuted ? 0 : 0.04;
            const amplitude = finalVolume * 0.9 + baseAmplitude;

            // Render 3 overlapping sine waves
            const waves = [
                { 
                    amplitudeMultiplier: 1.0, 
                    frequency: 0.025, 
                    speed: 0.1, 
                    color: 'rgba(45, 212, 191, 0.75)', // Neon Teal-400
                    glow: true 
                },
                { 
                    amplitudeMultiplier: 0.6, 
                    frequency: 0.04, 
                    speed: -0.07, 
                    color: 'rgba(20, 184, 166, 0.45)', // Teal-500
                    glow: false 
                },
                { 
                    amplitudeMultiplier: 0.35, 
                    frequency: 0.065, 
                    speed: 0.15, 
                    color: 'rgba(13, 148, 136, 0.25)', // Teal-600
                    glow: false 
                }
            ];

            const centerY = height / 2;

            waves.forEach((w) => {
                ctx.beginPath();
                ctx.strokeStyle = w.color;
                ctx.lineWidth = w.glow ? 2.5 : 1.5;
                
                if (w.glow) {
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(45, 212, 191, 0.8)';
                } else {
                    ctx.shadowBlur = 0;
                }

                for (let x = 0; x < width; x++) {
                    const angle = x * w.frequency + timeRef.current * w.speed;
                    // Siri-like windowing function (pinch at edges)
                    const edgeReduction = Math.sin((x / width) * Math.PI);
                    const y = centerY + Math.sin(angle) * (amplitude * w.amplitudeMultiplier) * (height * 0.45) * edgeReduction;

                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            resizeObserver.disconnect();
        };
    }, [isMuted]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

export default AudioVisualizer;
