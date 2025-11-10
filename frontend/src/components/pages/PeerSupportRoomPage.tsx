
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Participant, ChatMessage as ChatMessageType } from '../../types';
import VideoParticipant from '../ui/VideoParticipant';
import RoomControls from '../ui/RoomControls';
import ChatPanel from '../ui/ChatPanel';
import { io, Socket } from 'socket.io-client';
import api from '../../services/api';

const generateMockParticipants = (count: number): Participant[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `user-${i + 2}`,
        name: `Anonymous User ${i + 1}`,
        isMuted: Math.random() > 0.5,
        isCameraOff: Math.random() > 0.7,
    }));
};

const PeerSupportRoomPage: React.FC = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState<Participant[]>([]);
    
    // Local user's state
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    // Chat state
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const roomMongoIdRef = useRef<string | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

    const rtcConfig = useMemo<RTCConfiguration>(() => {
        const baseIce: RTCIceServer[] = [
            { urls: [ 'stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478' ] }
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
        const joinRoom = async () => {
            try {
                // Get token from localStorage for socket auth
                const authData = localStorage.getItem('auth');
                const token = authData ? JSON.parse(authData).token : null;
                if (!token) return;

                // Prompt for camera/mic access immediately so local video is available
                await ensureLocalStream().catch(() => {});

                // Resolve Mongo room _id by roomId
                const res = await api.get('/rooms', { params: { page: 1, limit: 50 } });
                const rooms = res.data?.rooms || [];
                const room = rooms.find((r: any) => {
                    const rid = String(roomId);
                    return r.roomId === rid || String(r._id) === rid;
                });
                if (!room) return;
                roomMongoIdRef.current = room._id;

                // Ensure API join
                await api.post(`/rooms/${room._id}/join`).catch(() => {});

                const socket = io((process.env.VITE_SOCKET_URL as string) || 'http://localhost:5001', {
                    auth: { token },
                    transports: ['websocket']
                });
                socketRef.current = socket;

                socket.on('connect', () => {
                    socket.emit('join_room', { roomId: room._id });
                });

                socket.on('room_participants', (payload: any) => {
                    if (!isMounted) return;
                    console.log('Received room participants:', payload);
                    const others: Participant[] = (payload.participants || []).map((p: any) => ({
                        id: toId(p.id),
                        name: p.name,
                        isMuted: false,
                        isCameraOff: false
                    }));
                    setParticipants(others);
                    // Do NOT initiate offers here to avoid glare.
                    // Existing users will initiate offers when they receive 'user_joined'.
                    // Deterministic initiator: the user with lexicographically smaller ID initiates to the other
                    const selfId = toId(payload.selfId);
                    console.log('Self ID:', selfId, 'Others:', others.map(p => p.id));
                    if (selfId) {
                        ensureLocalStream().then(() => {
                            others.forEach(p => {
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
                    setParticipants(prev => ([...prev, {
                        id: toId(payload.user.id),
                        name: payload.user.name,
                        isMuted: false,
                        isCameraOff: false
                    }]));
                    // Create offer to the newly joined user
                    ensureLocalStream().then(() => createAndSendOffer(toId(payload.user.id)));
                });

                socket.on('user_left', (payload: any) => {
                    if (!isMounted) return;
                    const leftId = toId(payload.user.id);
                    setParticipants(prev => prev.filter(p => p.id !== leftId));
                    // Cleanup peer and remote stream
                    const pc = peerConnectionsRef.current.get(leftId);
                    if (pc) {
                        pc.close();
                        peerConnectionsRef.current.delete(leftId);
                    }
                    remoteStreamsRef.current.delete(leftId);
                });

                socket.on('new_message', (payload: any) => {
                    if (!isMounted) return;
                    setMessages(prev => ([...prev, {
                        id: payload.id,
                        senderName: payload.sender?.name || 'User',
                        text: payload.message,
                        isLocal: false
                    }]));
                });

                // WebRTC signaling handlers
                socket.on('video_call_offer', async (payload: any) => {
                    const fromUserId: string = toId(payload?.from?.id);
                    const offer: RTCSessionDescriptionInit = payload?.offer;
                    if (!fromUserId || !offer) return;
                    console.log('Received offer from', fromUserId, offer);
                    await ensureLocalStream();
                    const pc = getOrCreatePeerConnection(fromUserId);
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
                    if (!pc) return;
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error('Failed to add ICE candidate:', e);
                    }
                });

                // Initial welcome
                setMessages([
                    { id: 'system-1', senderName: 'System', text: `Welcome to the chat!`, isLocal: false }
                ]);
            } catch (e) {
                // noop
            }
        };
        joinRoom();
        const handleBeforeUnload = () => {
            // Best-effort leave for history tracking
            const roomId = roomMongoIdRef.current;
            if (roomId) {
                navigator.sendBeacon?.(
                    `http://localhost:5001/api/rooms/${roomId}/leave`,
                    new Blob([], { type: 'application/json' })
                );
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            isMounted = false;
            // Record leave on unmount
            leaveRoomApi();
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            // Cleanup media and peers
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            remoteStreamsRef.current.clear();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [roomId]);

     // Effect to simulate receiving messages from other participants
    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].isLocal) {
            const timer = setTimeout(() => {
                const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
                if (randomParticipant) {
                    const reply: ChatMessageType = {
                        id: `msg-${Date.now()}`,
                        senderName: randomParticipant.name,
                        text: 'Thank you for sharing that.',
                        isLocal: false,
                    };
                    setMessages(prev => [...prev, reply]);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [messages, participants]);
    
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
            // We need the mongo _id room; fetch cached from last effect by refetching lightweight
            const roomMongoId = roomMongoIdRef.current;
            if (roomMongoId) {
                socket.emit('send_message', { roomId: roomMongoId, message: text });
            }
        }
    };

    // Media helpers and WebRTC
    const ensureLocalStream = async (): Promise<MediaStream> => {
        if (localStreamRef.current) return localStreamRef.current;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        localStreamRef.current = stream;
        // Initialize local mute/camera flags from actual tracks
        setIsMuted(!stream.getAudioTracks().some(t => t.enabled));
        setIsCameraOff(!stream.getVideoTracks().some(t => t.enabled));
        return stream;
    };

    const getOrCreatePeerConnection = (remoteUserId: string): RTCPeerConnection => {
        let pc = peerConnectionsRef.current.get(remoteUserId);
        if (pc) return pc;
        pc = new RTCPeerConnection(rtcConfig);
        peerConnectionsRef.current.set(remoteUserId, pc);

        // Attach local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc!.addTrack(track, localStreamRef.current as MediaStream);
            });
        }

        // ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to', remoteUserId, event.candidate);
                emitSocket('ice_candidate', { roomId: roomMongoIdRef.current, candidate: event.candidate.toJSON(), targetUserId: remoteUserId });
            }
        };

        // Track remote stream
        pc.ontrack = (event) => {
            const [stream] = event.streams;
            if (stream) {
                console.log('Received remote stream from', remoteUserId, stream);
                remoteStreamsRef.current.set(remoteUserId, stream);
                // Force refresh by toggling state reference
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

        pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state changed for', remoteUserId, 'to', pc.iceConnectionState);
        };

        return pc;
    };

    const createAndSendOffer = async (remoteUserId: string) => {
        await ensureLocalStream();
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
        } catch (_) {}
    };
    
    const allParticipants = [
        { id: 'local-user', name: 'You', isMuted, isCameraOff },
        ...participants
    ];

    const gridCols = `grid-cols-${Math.min(Math.ceil(Math.sqrt(allParticipants.length)), 4)}`;

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex-grow flex flex-col relative">
                <div className="flex-grow p-4">
                    <div className={`grid gap-4 h-full ${gridCols} grid-rows-${Math.ceil(allParticipants.length / Math.ceil(Math.sqrt(allParticipants.length)))}`}>
                        {allParticipants.map((p, index) => {
                            const stream = index === 0 ? localStreamRef.current || undefined : remoteStreamsRef.current.get(p.id) || undefined;
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

                <RoomControls
                    isMuted={isMuted}
                    isCameraOff={isCameraOff}
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
                        // Record leave in backend
                        leaveRoomApi();
                        const socket = socketRef.current;
                        const roomMongoId = roomMongoIdRef.current;
                        if (socket && roomMongoId) {
                            socket.emit('leave_room', { roomId: roomMongoId });
                        }
                        localStreamRef.current?.getTracks().forEach(t => t.stop());
                        localStreamRef.current = null;
                        peerConnectionsRef.current.forEach(pc => pc.close());
                        peerConnectionsRef.current.clear();
                        remoteStreamsRef.current.clear();
                        navigate('/app/member/rooms');
                    }}
                    onToggleChat={() => setIsChatVisible(prev => !prev)}
                />
            </div>

            {isChatVisible && (
                <ChatPanel 
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onClose={() => setIsChatVisible(false)}
                />
            )}
        </div>
    );
};

export default PeerSupportRoomPage;
