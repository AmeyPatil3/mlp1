import React, { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';

export interface StickyNote {
    id: string;
    text: string;
    color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple';
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
    creatorName: string;
    heartsCount: number;
}

interface FloatingHeart {
    id: string;
    x: number; // percentage coordinate
    y: number; // percentage coordinate
}

interface SupportWallProps {
    roomId: string;
    socket: Socket | null;
    stickies: StickyNote[];
    onAddSticky: (text: string, color: StickyNote['color']) => void;
    onMoveSticky: (id: string, x: number, y: number) => void;
    onHeartSticky: (id: string) => void;
    onDeleteSticky: (id: string) => void;
    senderName: string;
}

const colorThemes = {
    yellow: 'bg-amber-100/95 border-amber-300 text-amber-900 shadow-md shadow-amber-200/20 hover:border-amber-400',
    pink: 'bg-rose-100/95 border-rose-300 text-rose-900 shadow-md shadow-rose-200/20 hover:border-rose-400',
    blue: 'bg-sky-100/95 border-sky-300 text-sky-900 shadow-md shadow-sky-200/20 hover:border-sky-400',
    green: 'bg-emerald-100/95 border-emerald-300 text-emerald-900 shadow-md shadow-emerald-200/20 hover:border-emerald-400',
    purple: 'bg-purple-100/95 border-purple-300 text-purple-900 shadow-md shadow-purple-200/20 hover:border-purple-400',
};

const SupportWall: React.FC<SupportWallProps> = ({
    roomId,
    socket,
    stickies,
    onAddSticky,
    onMoveSticky,
    onHeartSticky,
    onDeleteSticky,
    senderName,
}) => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [selectedColor, setSelectedColor] = useState<StickyNote['color']>('yellow');
    const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
    
    const boardRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef<{
        id: string;
        startX: number; // raw drag start clientX
        startY: number; // raw drag start clientY
        startPercentX: number; // original sticky percentage coordinates
        startPercentY: number;
    } | null>(null);

    // Dynamic heart floating tracker: clear floating hearts after animations end (1000ms)
    useEffect(() => {
        if (floatingHearts.length === 0) return;
        const timer = setTimeout(() => {
            setFloatingHearts(prev => prev.slice(1));
        }, 1000);
        return () => clearTimeout(timer);
    }, [floatingHearts]);

    // Handle heart visual emission locally
    const handleHeartClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onHeartSticky(id);

        const target = stickies.find(s => s.id === id);
        if (target) {
            triggerHeartAnimation(target.x, target.y);
        }
    };

    const triggerHeartAnimation = (x: number, y: number) => {
        const heart: FloatingHeart = {
            id: `heart-${Date.now()}-${Math.random()}`,
            x: x + 8 + (Math.random() * 4 - 2), // centered with minor wind drift
            y: y - 2, // starts slightly above sticky note
        };
        setFloatingHearts(prev => [...prev, heart]);
    };

    // Watch for incoming hearts via socket to display floating hearts dynamically for all users
    useEffect(() => {
        if (!socket) return;

        const handleHearted = (payload: { id: string; heartsCount: number }) => {
            const note = stickies.find(s => s.id === payload.id);
            if (note) {
                triggerHeartAnimation(note.x, note.y);
            }
        };

        socket.on('sticky_hearted', handleHearted);
        return () => {
            socket.off('sticky_hearted', handleHearted);
        };
    }, [socket, stickies]);

    // Handle drag initiation
    const handleDragStart = (id: string, e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        const sticky = stickies.find(s => s.id === id);
        if (!sticky) return;

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length === 0) return;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        draggingRef.current = {
            id,
            startX: clientX,
            startY: clientY,
            startPercentX: sticky.x,
            startPercentY: sticky.y,
        };

        if ('touches' in e) {
            document.addEventListener('touchmove', handleDragMove, { passive: false });
            document.addEventListener('touchend', handleDragEnd);
        } else {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        }
    };

    // Handle active drag movement with boundary lock
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!draggingRef.current || !boardRef.current) return;
        
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length === 0) return;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            // Prevent scrolling on touch devices while dragging notes
            e.preventDefault();
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const boardRect = boardRef.current.getBoundingClientRect();
        
        // Calculate delta drag distance in pixels
        const deltaX = clientX - draggingRef.current.startX;
        const deltaY = clientY - draggingRef.current.startY;

        // Convert pixel delta to board percentage metrics
        const deltaPercentX = (deltaX / boardRect.width) * 100;
        const deltaPercentY = (deltaY / boardRect.height) * 100;

        // Formulate target coordinates
        let newX = draggingRef.current.startPercentX + deltaPercentX;
        let newY = draggingRef.current.startPercentY + deltaPercentY;

        // Hard boundary locking within the 100% whiteboard canvas space (allowing for 18% width/height card dimensions)
        newX = Math.max(0.5, Math.min(81.5, newX));
        newY = Math.max(0.5, Math.min(81.5, newY));

        onMoveSticky(draggingRef.current.id, newX, newY);
    };

    // Release drag
    const handleDragEnd = () => {
        draggingRef.current = null;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
    };

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, []);

    const handleSubmitNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        onAddSticky(noteText.trim(), selectedColor);
        setNoteText('');
        setIsCreateOpen(false);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Ambient Lighting accentuating canvas border */}
            <div className="absolute top-[-5%] left-[-5%] w-[180px] h-[180px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

            {/* Board Header controls */}
            <div className="px-5 py-4.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between z-20 flex-shrink-0">
                <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-200 text-base leading-tight">Collaborative Support Wall</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Leave anonymous notes of encouragement</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95 duration-200"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Post Note
                </button>
            </div>

            {/* Main Interactive Canvas Board */}
            <div
                ref={boardRef}
                className="flex-1 relative overflow-hidden select-none"
                style={{
                    backgroundImage: 'radial-gradient(#334155 1.2px, transparent 1.2px)',
                    backgroundSize: '20px 20px',
                    backgroundColor: '#0f172a',
                }}
            >
                {/* Floating Heart Render Track Overlay */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                    {floatingHearts.map(heart => (
                        <div
                            key={heart.id}
                            className="absolute text-xl animate-float-heart"
                            style={{
                                left: `${heart.x}%`,
                                top: `${heart.y}%`,
                                transform: 'translate(-50%, -100%)',
                            }}
                        >
                            ❤️
                        </div>
                    ))}
                </div>

                {/* Empty State Instructions */}
                {stickies.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none z-10">
                        <div className="text-4xl mb-3 opacity-30 select-none">✏️</div>
                        <p className="text-sm font-semibold text-slate-400 max-w-xs leading-relaxed">
                            Support Board is clean. Click "Post Note" to leave an uplifting message for your peers!
                        </p>
                    </div>
                )}

                {/* Render Interactive Sticky Notes */}
                {stickies.map((note) => (
                    <div
                        key={note.id}
                        className={`absolute w-[18%] min-w-[130px] max-w-[180px] aspect-square border rounded-2xl p-3 flex flex-col justify-between shadow-lg cursor-grab active:cursor-grabbing group transition-transform duration-100 z-20 ${colorThemes[note.color]}`}
                        style={{
                            left: `${note.x}%`,
                            top: `${note.y}%`,
                        }}
                        onMouseDown={(e) => handleDragStart(note.id, e)}
                        onTouchStart={(e) => handleDragStart(note.id, e)}
                        onDoubleClick={(e) => handleHeartClick(note.id, e)}
                    >
                        {/* Note Body Text */}
                        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                            <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap select-text cursor-default">
                                {note.text}
                            </p>
                        </div>

                        {/* Note Footer Action items */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 select-none text-[10px] font-bold opacity-80 flex-shrink-0">
                            <span className="text-black/40 truncate max-w-[65%]" title={`By ${note.creatorName}`}>
                                {note.creatorName}
                            </span>
                            
                            <div className="flex items-center space-x-1.5">
                                {/* Like heart Button */}
                                <button
                                    onClick={(e) => handleHeartClick(note.id, e)}
                                    className="flex items-center gap-0.5 hover:scale-125 transition-transform text-rose-600 focus:outline-none"
                                    title="Double click card or click here to like!"
                                >
                                    <span>❤️</span>
                                    <span className="text-slate-800 text-[10px]">{note.heartsCount || 0}</span>
                                </button>

                                {/* Delete post note */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSticky(note.id);
                                    }}
                                    className="text-black/30 hover:text-red-600 transition-colors focus:outline-none ml-1 opacity-0 group-hover:opacity-100 duration-200"
                                    title="Delete note"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Note modal overlay panel */}
            {isCreateOpen && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center p-4 z-40">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl relative animate-fade-in">
                        <h4 className="font-bold text-slate-100 text-sm mb-3">Create Encouraging Note</h4>
                        
                        <form onSubmit={handleSubmitNote} className="space-y-4">
                            {/* Text Area */}
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Type your supportive words here..."
                                maxLength={100}
                                required
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none font-medium"
                                autoFocus
                            />

                            {/* Color Selector cards */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select Card Theme</label>
                                <div className="flex gap-2">
                                    {(['yellow', 'pink', 'blue', 'green', 'purple'] as StickyNote['color'][]).map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-7 h-7 rounded-full border transition-all relative ${
                                                color === 'yellow' ? 'bg-amber-200 border-amber-300' :
                                                color === 'pink' ? 'bg-rose-200 border-rose-300' :
                                                color === 'blue' ? 'bg-sky-200 border-sky-300' :
                                                color === 'green' ? 'bg-emerald-200 border-emerald-300' :
                                                'bg-purple-200 border-purple-300'
                                            } ${selectedColor === color ? 'ring-2 ring-indigo-500 scale-110 shadow-lg border-white' : 'hover:scale-105'}`}
                                            aria-label={`${color} card`}
                                        >
                                            {selectedColor === color && (
                                                <span className="absolute inset-0 flex items-center justify-center text-slate-800 text-[10px]">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions buttons */}
                            <div className="flex justify-end space-x-2 pt-2 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateOpen(false);
                                        setNoteText('');
                                    }}
                                    className="bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-300 px-4 py-2.5 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 transition-all active:scale-98"
                                >
                                    Post Note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportWall;
