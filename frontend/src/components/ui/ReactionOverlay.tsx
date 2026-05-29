import React, { useEffect, useRef } from 'react';

interface ReactionOverlayProps {
    participantId: string;
}

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    scale: number;
    emoji: string;
    rotation: number;
    rotationSpeed: number;
}

const emojiMap: Record<string, string> = {
    support: '❤️',
    calm: '🧘',
    strength: '💪',
    hug: '🤝',
};

const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ participantId }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number | null>(null);

    const spawnParticle = (type: string) => {
        const emoji = emojiMap[type] || '❤️';
        const canvas = canvasRef.current;
        if (!canvas) return;

        const newParticle: Particle = {
            id: Date.now() + Math.random(),
            // Start at the bottom-center of the card with minor random offsets
            x: canvas.width / 2 + (Math.random() - 0.5) * 40,
            y: canvas.height - 20,
            // Slight horizontal drift
            vx: (Math.random() - 0.5) * 2,
            // Floating upwards velocity
            vy: -3 - Math.random() * 3,
            alpha: 1.0,
            scale: 0.8 + Math.random() * 0.5,
            emoji,
            rotation: (Math.random() - 0.5) * 0.2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
        };

        particlesRef.current.push(newParticle);

        // Start animation loop if not already running
        if (animationFrameRef.current === null) {
            animate();
        }
    };

    const animate = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const particles = particlesRef.current;

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            // Physics: apply horizontal drift and rising motion
            p.x += p.vx;
            p.y += p.vy;
            p.vy *= 0.98; // Drag
            p.alpha -= 0.015; // Fade out
            p.rotation += p.rotationSpeed;

            // Remove particle if it goes off-screen or fades out
            if (p.alpha <= 0 || p.y < -30) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            // Render emoji text
            ctx.font = `${Math.round(28 * p.scale)}px Apple Color Emoji, Segoe UI Emoji, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();
        }

        // Loop or stop animation
        if (particles.length > 0) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            animationFrameRef.current = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    useEffect(() => {
        const handleReaction = (e: Event) => {
            const customEvent = e as CustomEvent<{ reactionType: string }>;
            const type = customEvent.detail?.reactionType;
            if (type) {
                spawnParticle(type);
            }
        };

        const eventName = `reaction-${participantId}`;
        window.addEventListener(eventName, handleReaction);

        // Adjust canvas dimensions on resize / layout mount
        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        const resizeCanvas = () => {
            if (canvas && parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };

        resizeCanvas();
        const resizeObserver = new ResizeObserver(resizeCanvas);
        if (parent) resizeObserver.observe(parent);

        return () => {
            window.removeEventListener(eventName, handleReaction);
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            resizeObserver.disconnect();
        };
    }, [participantId]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            style={{ mixBlendMode: 'screen' }}
        />
    );
};

export default ReactionOverlay;
