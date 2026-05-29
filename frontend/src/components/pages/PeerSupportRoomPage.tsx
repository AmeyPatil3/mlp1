import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Participant, ChatMessage as ChatMessageType } from '../../types';
import VideoParticipant from '../ui/VideoParticipant';
import RoomControls from '../ui/RoomControls';
import SessionNotesPanel from '../ui/SessionNotesPanel';
import ChatPanel from '../ui/ChatPanel';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';
import SupportWall, { StickyNote } from '../ui/SupportWall';
import { useAuth } from '../../context/AuthContext';

const PeerSupportRoomPage: React.FC = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState<Participant[]>([]);

    const { auth } = useAuth();
    const senderName = (auth?.user?.isAnonymousEnabled && auth?.user?.anonymousAlias)
        ? auth.user.anonymousAlias
        : (auth?.user?.fullName || 'Anonymous');

    const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(false);
    const [stickies, setStickies] = useState<StickyNote[]>([]);

    // Local user's state
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    // Chat state
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isNotesVisible, setIsNotesVisible] = useState(false);
    const [isPrivateRoom, setIsPrivateRoom] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const roomMongoIdRef = useRef<string | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
    const selfIdRef = useRef<string | null>(null);
    const iceCandidatesBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    const rtcConfig = useMemo<RTCConfiguration>(() => {
        const baseIce: RTCIceServer[] = [
            { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }
        ];
        const turnUrl = (process.env.VITE_TURN_URL as string) || '';
        const turnUser = (process.env.VITE_TURN_USERNAME as string) || '';
        const turnCred = (process.env.VITE_TURN_CREDENTIAL as string) || '';
        if (turnUrl && turnUser && turnCred) {
            baseIce.push({ urls: turnUrl, username: turnUser, credential: turnCred });
        } else {
            baseIce.push({ urls: 'turn:relay.metered.live:80', username: 'free', credential: 'free' });
            baseIce.push({ urls: 'turn:relay.metered.live:443', username: 'free', credential: 'free' });
        }
        return { iceServers: baseIce } as RTCConfiguration;
    }, []);

    const toId = (value: any): string => String(value);

    useEffect(() => {
        let isMounted = true;
        let activeSocket: Socket | null = null;
        const joinRoom = async () => {
            try {
                // Get token from localStorage for socket auth
                const authData = localStorage.getItem('auth');
                const token = authData ? JSON.parse(authData).token : null;
                if (!token) return;

                // Prompt for camera/mic access immediately so local video is available
                await ensureLocalStream().catch(() => { });
                if (!isMounted) return;

                // Fetch the room directly by ID or UUID from the backend single-room endpoint
                const res = await api.get(`/rooms/${roomId}`);
                if (!isMounted) return;
                
                const room = res.data?.room;
                if (!room) return;
                roomMongoIdRef.current = room._id;
                setIsPrivateRoom(!!room.isPrivate);

                // Ensure API join
                await api.post(`/rooms/${room._id}/join`).catch(() => { });
                if (!isMounted) return;

                const socket = io((process.env.VITE_SOCKET_URL as string) || 'http://localhost:5001', {
                    auth: { token },
                    transports: ['websocket']
                });
                
                if (!isMounted) {
                    socket.disconnect();
                    return;
                }
                
                activeSocket = socket;
                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('Socket connected successfully with ID:', socket.id);
                    socket.emit('join_room', { roomId: room._id });
                });

                socket.on('connect_error', (err) => {
                    console.error('Socket connect_error:', err.message, err);
                });

                socket.on('disconnect', (reason) => {
                    console.warn('Socket disconnected due to:', reason);
                });

                socket.on('error', (err: any) => {
                    console.error('Socket error received from server:', err);
                });

                socket.on('room_participants', (payload: any) => {
                    if (!isMounted) return;
                    console.log('Received room participants:', payload);
                    const selfId = toId(payload.selfId);
                    selfIdRef.current = selfId;

                    const others: Participant[] = (payload.participants || [])
                        .filter((p: any) => toId(p.id) !== selfId)
                        .map((p: any) => ({
                            id: toId(p.id),
                            name: p.name,
                            isMuted: false,
                            isCameraOff: false
                        }));

                    // Keep unique participants
                    const uniqueOthers = others.filter((item, index, self) => 
                        self.findIndex(t => t.id === item.id) === index
                    );
                    setParticipants(uniqueOthers);

                    console.log('Self ID:', selfId, 'Others:', uniqueOthers.map(p => p.id));
                    if (selfId) {
                        ensureLocalStream()
                            .catch(err => {
                                console.warn('Could not initialize local stream for call initiation:', err);
                                return null;
                            })
                            .then(() => {
                                uniqueOthers.forEach(p => {
                                    if (selfId < p.id) {
                                        console.log('Initiating offer to', p.id, 'because', selfId, '<', p.id);
                                        createAndSendOffer(p.id);
                                    }
                                });
                            });
                    }
                });

                socket.on('user_joined', (payload: any) => {
                    if (!isMounted) return;
                    const newUserId = toId(payload.user.id);
                    if (newUserId === selfIdRef.current || newUserId === socket.id) return;

                    setParticipants(prev => {
                        if (prev.some(p => p.id === newUserId)) return prev;
                        return [...prev, {
                            id: newUserId,
                            name: payload.user.name,
                            isMuted: false,
                            isCameraOff: false
                        }];
                    });

                    const selfId = selfIdRef.current;
                    if (selfId && selfId < newUserId) {
                        console.log('Initiating offer to joined user', newUserId, 'because', selfId, '<', newUserId);
                        ensureLocalStream()
                            .catch(err => {
                                console.warn('Could not initialize local stream for user joined:', err);
                                return null;
                            })
                            .then(() => createAndSendOffer(newUserId));
                    } else {
                        console.log('Waiting for offer from joined user', newUserId, 'because', selfId, '>=', newUserId);
                    }
                });

                socket.on('user_left', (payload: any) => {
                    if (!isMounted) return;
                    const leftId = toId(payload.user.id);
                    setParticipants(prev => prev.filter(p => p.id !== leftId));
                    const pc = peerConnectionsRef.current.get(leftId);
                    if (pc) {
                        pc.close();
                        peerConnectionsRef.current.delete(leftId);
                    }
                    remoteStreamsRef.current.delete(leftId);
                });

                socket.on('new_message', (payload: any) => {
                    if (!isMounted) return;
                    // Ignore messages sent by ourselves since they are added locally instantly
                    if (payload.sender?.id === socket.id) return;
                    setMessages(prev => ([...prev, {
                        id: payload.id,
                        senderName: payload.sender?.name || 'User',
                        text: payload.message,
                        isLocal: false
                    }]));
                });

                socket.on('video_call_offer', async (payload: any) => {
                    const fromUserId: string = toId(payload?.from?.id);
                    const offer: RTCSessionDescriptionInit = payload?.offer;
                    if (!fromUserId || !offer) return;
                    console.log('Received offer from', fromUserId, offer);
                    try {
                        await ensureLocalStream();
                    } catch (err) {
                        console.warn('Could not initialize local stream for incoming offer:', err);
                    }
                    const pc = getOrCreatePeerConnection(fromUserId);
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));

                    const buffered = iceCandidatesBuffer.current.get(fromUserId);
                    if (buffered) {
                        console.log('Processing buffered ICE candidates for', fromUserId, buffered.length);
                        for (const candidate of buffered) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error('Failed to add buffered ICE candidate:', e);
                            }
                        }
                        iceCandidatesBuffer.current.delete(fromUserId);
                    }

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    console.log('Sending answer to', fromUserId, answer);
                    emitSocket('video_call_answer', { roomId: roomMongoIdRef.current, answer, targetUserId: fromUserId });
                });

                socket.on('video_call_answer', async (payload: any) => {
                    const fromUserId: string = toId(payload?.from?.id);
                    const answer: RTCSessionDescriptionInit = payload?.answer;
                    if (!fromUserId || !answer) return;
                    console.log('Received answer from', fromUserId, answer);
                    const pc = peerConnectionsRef.current.get(fromUserId);
                    if (!pc) return;
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                });

                socket.on('ice_candidate', async (payload: any) => {
                    const fromUserId: string = toId(payload?.from?.id);
                    const candidate: RTCIceCandidateInit = payload?.candidate;
                    if (!fromUserId || !candidate) return;
                    console.log('Received ICE candidate from', fromUserId, candidate);
                    const pc = peerConnectionsRef.current.get(fromUserId);
                    if (!pc) {
                        console.log('Buffering ICE candidate for', fromUserId);
                        if (!iceCandidatesBuffer.current.has(fromUserId)) {
                            iceCandidatesBuffer.current.set(fromUserId, []);
                        }
                        iceCandidatesBuffer.current.get(fromUserId)!.push(candidate);
                        return;
                    }
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error('Failed to add ICE candidate:', e);
                    }
                });

                socket.on('receive_reaction', (payload: { senderId: string; reactionType: string }) => {
                    if (!isMounted) return;
                    console.log('Received reaction from', payload.senderId, payload.reactionType);
                    const event = new CustomEvent(`reaction-${payload.senderId}`, {
                        detail: { reactionType: payload.reactionType }
                    });
                    window.dispatchEvent(event);
                });

                // Support Wall sticky note synchronizers
                socket.on('sticky_sync', (syncedStickies: StickyNote[]) => {
                    if (!isMounted) return;
                    setStickies(syncedStickies);
                });

                socket.on('sticky_created', (newSticky: StickyNote) => {
                    if (!isMounted) return;
                    setStickies(prev => {
                        if (prev.some(s => s.id === newSticky.id)) return prev;
                        return [...prev, newSticky];
                    });
                });

                socket.on('sticky_moved', (payload: { id: string; x: number; y: number }) => {
                    if (!isMounted) return;
                    setStickies(prev => prev.map(s => {
                        if (s.id === payload.id) {
                            return { ...s, x: payload.x, y: payload.y };
                        }
                        return s;
                    }));
                });

                socket.on('sticky_hearted', (payload: { id: string; heartsCount: number }) => {
                    if (!isMounted) return;
                    setStickies(prev => prev.map(s => {
                        if (s.id === payload.id) {
                            return { ...s, heartsCount: payload.heartsCount };
                        }
                        return s;
                    }));
                });

                socket.on('sticky_deleted', (payload: { id: string }) => {
                    if (!isMounted) return;
                    setStickies(prev => prev.filter(s => s.id !== payload.id));
                });


            } catch (e) {
                // noop
            }
        };
        joinRoom();
        const handleBeforeUnload = () => {
            const roomId = roomMongoIdRef.current;
            if (roomId) {
                navigator.sendBeacon?.(
                    `${(process.env.VITE_API_URL as string) || 'http://localhost:5001'}/api/rooms/${roomId}/leave`,
                    new Blob([], { type: 'application/json' })
                );
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            isMounted = false;
            leaveRoomApi();
            if (activeSocket) {
                activeSocket.disconnect();
            }
            if (socketRef.current === activeSocket) {
                socketRef.current = null;
            }
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            setLocalStream(null);
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            remoteStreamsRef.current.clear();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [roomId]);

    const handleSendMessage = (text: string) => {
        const newMessage: ChatMessageType = {
            id: `msg-${Date.now()}`,
            senderName: 'You',
            text,
            isLocal: true,
        };
        setMessages(prev => [...prev, newMessage]);
        const socket = socketRef.current;
        if (socket) {
            const roomMongoId = roomMongoIdRef.current;
            if (roomMongoId) {
                socket.emit('send_message', { roomId: roomMongoId, message: text });
            }
        }
    };

    const handleAddSticky = (text: string, color: StickyNote['color']) => {
        const id = `sticky-${Date.now()}-${Math.random()}`;
        const newSticky: StickyNote = {
            id,
            text,
            color,
            x: 20 + Math.random() * 40,
            y: 20 + Math.random() * 40,
            creatorName: senderName,
            heartsCount: 0
        };

        setStickies(prev => [...prev, newSticky]);

        const socket = socketRef.current;
        const roomMongoId = roomMongoIdRef.current;
        if (socket && roomMongoId) {
            socket.emit('sticky_create', { roomId: roomMongoId, sticky: newSticky });
        }
    };

    const handleMoveSticky = (id: string, x: number, y: number) => {
        setStickies(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, x, y };
            }
            return s;
        }));

        const socket = socketRef.current;
        const roomMongoId = roomMongoIdRef.current;
        if (socket && roomMongoId) {
            socket.emit('sticky_move', { roomId: roomMongoId, stickyId: id, x, y });
        }
    };

    const handleHeartSticky = (id: string) => {
        const socket = socketRef.current;
        const roomMongoId = roomMongoIdRef.current;
        if (socket && roomMongoId) {
            socket.emit('sticky_heart', { roomId: roomMongoId, stickyId: id });
        }
    };

    const handleDeleteSticky = (id: string) => {
        const socket = socketRef.current;
        const roomMongoId = roomMongoIdRef.current;
        if (socket && roomMongoId) {
            socket.emit('sticky_delete', { roomId: roomMongoId, stickyId: id });
        }
    };

    const ensureLocalStream = async (): Promise<MediaStream | null> => {
        if (localStreamRef.current) return localStreamRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsMuted(!stream.getAudioTracks().some(t => t.enabled));
            setIsCameraOff(!stream.getVideoTracks().some(t => t.enabled));
            return stream;
        } catch (err) {
            console.warn('getUserMedia audio and video failed, trying audio only:', err);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                localStreamRef.current = stream;
                setLocalStream(stream);
                setIsMuted(!stream.getAudioTracks().some(t => t.enabled));
                setIsCameraOff(true);
                return stream;
            } catch (err2) {
                console.error('getUserMedia audio-only also failed:', err2);
                return null;
            }
        }
    };

    const getOrCreatePeerConnection = (remoteUserId: string): RTCPeerConnection => {
        let pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) return pc;
        pc = new RTCPeerConnection(rtcConfig);
        peerConnectionsRef.current.set(remoteUserId, pc);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc!.addTrack(track, localStreamRef.current as MediaStream);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to', remoteUserId, event.candidate);
                emitSocket('ice_candidate', { roomId: roomMongoIdRef.current, candidate: event.candidate.toJSON(), targetUserId: remoteUserId });
            }
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (stream) {
                console.log('Received remote stream from', remoteUserId, stream);
                remoteStreamsRef.current.set(remoteUserId, stream);
                setParticipants(prev => [...prev]);
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc?.connectionState;
            console.log('Peer connection state changed for', remoteUserId, 'to', state);
            if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                remoteStreamsRef.current.delete(remoteUserId);
            }
        };

        return pc;
    };

    const createAndSendOffer = async (remoteUserId: string) => {
        try {
            await ensureLocalStream();
        } catch (err) {
            console.warn('Could not ensure local stream before creating offer:', err);
        }
        const pc = getOrCreatePeerConnection(remoteUserId);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        console.log('Sending offer to', remoteUserId, offer);
        emitSocket('video_call_offer', { roomId: roomMongoIdRef.current, offer, targetUserId: remoteUserId });
    };

    const emitSocket = (event: string, payload: any) => {
        const socket = socketRef.current;
        if (socket) socket.emit(event, payload);
    };

    const leaveRoomApi = async () => {
        const roomMongoId = roomMongoIdRef.current;
        try {
            if (roomMongoId) {
                await api.post(`/rooms/${roomMongoId}/leave`);
            }
        } catch (_) { }
    };

    const allParticipants = [
        { id: 'local-user', name: 'You', isMuted, isCameraOff },
        ...participants
    ];

    const getGridClass = (count: number) => {
        if (count <= 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 9) return 'grid-cols-3';
        return 'grid-cols-4';
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex-grow flex flex-col relative">
                <div className="flex-grow p-4 flex flex-col lg:flex-row gap-4 h-[calc(100%-5.5rem)] overflow-hidden">
                    {/* Collaborative Support Wall */}
                    {isWhiteboardVisible && (
                        <div className="w-full lg:w-3/5 h-[50vh] lg:h-full flex-shrink-0 animate-fade-in">
                            <SupportWall
                                roomId={roomId || ''}
                                socket={socketRef.current}
                                stickies={stickies}
                                onAddSticky={handleAddSticky}
                                onMoveSticky={handleMoveSticky}
                                onHeartSticky={handleHeartSticky}
                                onDeleteSticky={handleDeleteSticky}
                                senderName={senderName}
                            />
                        </div>
                    )}

                    {/* Video grid container */}
                    <div className="flex-grow h-full overflow-y-auto pr-1">
                        <div className={`grid gap-4 ${isWhiteboardVisible ? 'grid-cols-1 sm:grid-cols-2' : getGridClass(allParticipants.length)}`}>
                            {allParticipants.map((p, index) => {
                                const stream = index === 0 ? localStream || undefined : remoteStreamsRef.current.get(p.id) || undefined;
                                return (
                                    <VideoParticipant
                                        key={p.id}
                                        participant={p}
                                        isLocal={index === 0}
                                        stream={stream}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                <RoomControls
                    isMuted={isMuted}
                    isCameraOff={isCameraOff}
                    isWhiteboardActive={isWhiteboardVisible}
                    onToggleWhiteboard={() => setIsWhiteboardVisible(prev => !prev)}
                    onSendReaction={(type) => {
                        const socket = socketRef.current;
                        const roomMongoId = roomMongoIdRef.current;
                        if (socket && roomMongoId) {
                            socket.emit('send_reaction', { roomId: roomMongoId, reactionType: type });
                            // Trigger local overlay instantly
                            const event = new CustomEvent(`reaction-local-user`, {
                                detail: { reactionType: type }
                            });
                            window.dispatchEvent(event);
                        }
                    }}
                    onToggleMute={() => {
                        const next = !isMuted;
                        setIsMuted(next);
                        const stream = localStreamRef.current;
                        if (stream) {
                            stream.getAudioTracks().forEach(t => { t.enabled = !next; });
                        }
                    }}
                    onToggleCamera={() => {
                        const next = !isCameraOff;
                        setIsCameraOff(next);
                        const stream = localStreamRef.current;
                        if (stream) {
                            stream.getVideoTracks().forEach(t => { t.enabled = !next; });
                        }
                    }}
                    onLeave={() => {
                        leaveRoomApi();
                        const socket = socketRef.current;
                        const roomMongoId = roomMongoIdRef.current;
                        if (socket && roomMongoId) {
                            socket.emit('leave_room', { roomId: roomMongoId });
                        }
                        localStreamRef.current?.getTracks().forEach(t => t.stop());
                        localStreamRef.current = null;
                        setLocalStream(null);
                        peerConnectionsRef.current.forEach(pc => pc.close());
                        peerConnectionsRef.current.clear();
                        remoteStreamsRef.current.clear();
                        const isTherapist = auth?.user?.role === 'therapist';
                        navigate(isTherapist ? '/app/therapist' : '/app/member/rooms');
                    }}
                    onToggleChat={() => setIsChatVisible(prev => !prev)}
                    onToggleNotes={isPrivateRoom && auth?.user?.role === 'therapist' ? () => setIsNotesVisible(prev => !prev) : undefined}
                    isNotesActive={isNotesVisible}
                />
            </div>

            {isChatVisible && (
                <ChatPanel
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onClose={() => setIsChatVisible(false)}
                />
            )}

            {isNotesVisible && isPrivateRoom && auth?.user?.role === 'therapist' && (
                <SessionNotesPanel
                    roomId={roomId || ''}
                    onClose={() => setIsNotesVisible(false)}
                />
            )}
        </div>
    );
};

export default PeerSupportRoomPage;
