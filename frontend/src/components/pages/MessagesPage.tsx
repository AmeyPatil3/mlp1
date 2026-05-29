import React, { useEffect, useState, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

type ClientUser = {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
};

type Contact = {
    id: string;
    fullName: string;
    email: string;
    profileImage?: string;
    role: 'client' | 'therapist';
};

type Message = {
    id: string;
    sender: {
        id?: string;
        _id?: string;
        fullName?: string;
        profileImage?: string;
        role?: string;
    };
    message: string;
    createdAt: string;
};

type Appointment = {
    _id: string;
    user: ClientUser;
    therapist: {
        _id: string;
        user: ClientUser;
    };
    status: string;
};

const MessagesPage: React.FC = () => {
    const { auth } = useAuth();
    const location = useLocation();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roomUnreadCounts, setRoomUnreadCounts] = useState<Record<string, number>>({});
    const [isClinicalPopupOpen, setIsClinicalPopupOpen] = useState(false);
    const [loadingQuickNotes, setLoadingQuickNotes] = useState(false);
    const [quickNotes, setQuickNotes] = useState<any[]>([]);

    const parseSoap = (raw: string) => {
        const get = (key: string) => {
            const m = raw.match(new RegExp(`### ${key}\\n([\\s\\S]*?)(?=\\n\\n###|$)`));
            return m ? m[1].trim() : '';
        };
        const hasKeys = /### (Subjective|Objective|Assessment|Plan)/.test(raw);
        if (!hasKeys) return { subjective: raw, objective: '', assessment: '', plan: '' };
        return { subjective: get('Subjective'), objective: get('Objective'), assessment: get('Assessment'), plan: get('Plan') };
    };

    const handleOpenQuickRecords = async () => {
        if (!selectedContact) return;
        setIsClinicalPopupOpen(true);
        setLoadingQuickNotes(true);
        try {
            const [notesRes, appointmentsRes] = await Promise.all([
                api.get('/clinical-notes', { params: { clientId: selectedContact.id } }),
                api.get('/appointments', { params: { page: 1, limit: 100 } })
            ]);

            const standaloneItems = (notesRes.data?.notes || []).map((n: any) => ({
                id: n._id,
                type: 'standalone',
                date: n.sessionDate,
                title: n.title || 'Standalone Record',
                notes: n.notes || '',
                digitalSignature: n.digitalSignature || ''
            }));

            const appointmentItems = (appointmentsRes.data?.appointments || [])
                .filter((a: any) => a.user?._id === selectedContact.id && a.notes)
                .map((a: any) => ({
                    id: a._id,
                    type: 'appointment',
                    date: a.scheduledDate,
                    title: 'Appointment Note',
                    notes: a.notes || ''
                }));

            const combined = [...standaloneItems, ...appointmentItems].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setQuickNotes(combined);
        } catch (err) {
            console.error('Failed to load quick clinical records:', err);
        } finally {
            setLoadingQuickNotes(false);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const activeRoomIdRef = useRef<string | null>(null);

    // Sync activeRoomId state to ref for socket closure accessibility
    useEffect(() => {
        activeRoomIdRef.current = activeRoomId;
    }, [activeRoomId]);

    // Helper to calculate private room ID client-side
    const getContactRoomId = (contactId: string) => {
        if (!auth?.user?._id) return '';
        const sortedIds = [auth.user._id, contactId].sort();
        return `chat-${sortedIds[0]}-${sortedIds[1]}`;
    };

    // ─── Fetch and poll unread message counts ─────────────────────────────────
    useEffect(() => {
        const fetchUnreadCounts = async () => {
            try {
                const res = await api.get('/rooms/unread-count');
                setRoomUnreadCounts(res.data?.roomUnreadCounts || {});
            } catch (err) {
                console.error('Failed to fetch unread counts:', err);
            }
        };
        fetchUnreadCounts();
        const poll = setInterval(fetchUnreadCounts, 15000);
        return () => clearInterval(poll);
    }, []);

    // ─── Fetch appointments to gather contact list ───────────────────────────
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoadingContacts(true);
                const res = await api.get('/appointments', { params: { page: 1, limit: 100 } });
                setAppointments(res.data?.appointments || []);
            } catch (err) {
                console.error('Failed to load appointments for contacts list:', err);
            } finally {
                setLoadingContacts(false);
            }
        };
        fetchAppointments();
    }, []);

    // ─── Compile contacts list based on booked sessions ──────────────────────
    const contacts = useMemo(() => {
        const seen = new Set<string>();
        const list: Contact[] = [];

        if (auth?.user?.role === 'user') {
            // Member gathers therapists
            appointments.forEach(apt => {
                const t = apt.therapist;
                if (t && t.user && !seen.has(t.user._id)) {
                    seen.add(t.user._id);
                    list.push({
                        id: t.user._id,
                        fullName: t.user.fullName,
                        profileImage: t.user.profileImage,
                        email: t.user.email,
                        role: 'therapist'
                    });
                }
            });
        } else if (auth?.user?.role === 'therapist') {
            // Therapist gathers clients
            appointments.forEach(apt => {
                const u = apt.user;
                if (u && !seen.has(u._id)) {
                    seen.add(u._id);
                    list.push({
                        id: u._id,
                        fullName: u.fullName,
                        profileImage: u.profileImage,
                        email: u.email,
                        role: 'client'
                    });
                }
            });
        }
        return list;
    }, [appointments, auth]);

    // Filter contacts based on search query
    const filteredContacts = useMemo(() => {
        return contacts.filter(c =>
            c.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [contacts, searchQuery]);

    // ─── Auto-select contact from navigation state ───────────────────────────
    useEffect(() => {
        if (location.state && (location.state as any).contactId && contacts.length > 0) {
            const targetContactId = (location.state as any).contactId;
            const foundContact = contacts.find(c => c.id === targetContactId);
            if (foundContact) {
                setSelectedContact(foundContact);
            }
        }
    }, [location.state, contacts]);

    // ─── Connect Socket.IO on mount ──────────────────────────────────────────
    useEffect(() => {
        const authData = localStorage.getItem('auth');
        const token = authData ? JSON.parse(authData).token : null;
        if (!token) return;

        const socketUrl = (process.env.VITE_SOCKET_URL as string) || 'http://localhost:5001';
        const newSocket = io(socketUrl, {
            auth: { token },
            transports: ['websocket']
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('new_message', (payload: any) => {
            // Bypasses local echo if sender socket ID is self
            if (payload.sender?.id === socketRef.current?.id) return;
            
            // If the message is for a room we are not currently viewing, increment its count in real-time
            if (payload.room && payload.room !== activeRoomIdRef.current) {
                setRoomUnreadCounts(prev => ({
                    ...prev,
                    [payload.room]: (prev[payload.room] || 0) + 1
                }));
                return;
            }

            // Format to fit the Message type structure
            const incomingMsg: Message = {
                id: payload.id || String(Math.random()),
                sender: {
                    _id: payload.sender?._id || payload.sender?.id,
                    fullName: payload.sender?.name,
                    profileImage: payload.sender?.profileImage,
                    role: payload.sender?.role
                },
                message: payload.message,
                createdAt: payload.createdAt || new Date().toISOString()
            };
            setMessages(prev => [...prev, incomingMsg]);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // ─── Reactive socket join/rejoin on room change or reconnect ──────────────
    useEffect(() => {
        if (!socket || !activeRoomId) return;

        const joinRoom = () => {
            socket.emit('join_room', { roomId: activeRoomId });
        };

        // Join immediately
        joinRoom();

        // Listen for reconnects to auto-rejoin
        socket.on('connect', joinRoom);

        return () => {
            socket.off('connect', joinRoom);
        };
    }, [socket, activeRoomId]);

    // ─── Open chat room on selecting a contact ────────────────────────────────
    useEffect(() => {
        if (!selectedContact) return;

        // Clear local unread counts for this contact instantly
        const contactRoomId = getContactRoomId(selectedContact.id);
        setRoomUnreadCounts(prev => ({
            ...prev,
            [contactRoomId]: 0
        }));

        // Reset quick clinical records states on client shift
        setIsClinicalPopupOpen(false);
        setQuickNotes([]);

        let isMounted = true;
        const initChatRoom = async () => {
            try {
                // 1. Post to secure backend to get/create private deterministic chat room
                const res = await api.post('/rooms/private-chat', { partnerId: selectedContact.id });
                if (!isMounted) return;

                const room = res.data?.room;
                if (!room) return;

                setActiveRoomId(room._id);

                // 2. Load room messages history
                const messagesRes = await api.get(`/rooms/${room._id}/messages`, { params: { page: 1, limit: 100 } });
                if (!isMounted) return;
                
                // Map historical backend messages to fit the local Message type
                const history: Message[] = (messagesRes.data?.messages || []).map((m: any) => ({
                    id: m._id,
                    sender: {
                        _id: m.sender?._id || m.sender,
                        fullName: m.sender?.fullName,
                        profileImage: m.sender?.profileImage,
                        role: m.sender?.role
                    },
                    message: m.message,
                    createdAt: m.createdAt
                }));
                setMessages(history);

                // 3. Emit join_room on Socket.IO
                if (socketRef.current) {
                    socketRef.current.emit('join_room', { roomId: room._id });
                }
            } catch (err) {
                console.error('Failed to initialize private chat:', err);
            }
        };

        // Reset state and run initializer
        setMessages([]);
        setActiveRoomId(null);
        initChatRoom();

        return () => {
            isMounted = false;
        };
    }, [selectedContact]);

    // ─── Auto-scroll to bottom of messages container ─────────────────────────
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ─── Send new message ───────────────────────────────────────────────────
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !activeRoomId || !socket) return;

        // Send via Socket.IO
        socket.emit('send_message', {
            roomId: activeRoomId,
            message: inputText.trim()
        });

        // Optimistically append local echo locally (to show instantly for "You")
        const localEcho: Message = {
            id: String(Math.random()),
            sender: {
                _id: auth?.user?._id,
                fullName: auth?.user?.fullName,
                profileImage: auth?.user?.profileImage,
                role: auth?.user?.role
            },
            message: inputText.trim(),
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, localEcho]);
        setInputText('');
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] w-full rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-lg">
            
            {/* Left Sidebar Panel - Contacts */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col bg-white">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Chats</h2>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {loadingContacts && (
                        <div className="flex justify-center items-center py-10 gap-2">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-gray-400 font-medium">Loading chats…</span>
                        </div>
                    )}

                    {!loadingContacts && filteredContacts.length === 0 && (
                        <div className="text-center py-10 px-4">
                            <span className="text-3xl block mb-2">💬</span>
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                {searchQuery ? 'No contacts match search.' : 'No active sessions booked. Book a session to start messaging.'}
                            </p>
                        </div>
                    )}

                    {!loadingContacts && filteredContacts.map(c => {
                        const isSelected = selectedContact?.id === c.id;
                        const contactRoomId = getContactRoomId(c.id);
                        const unreadCount = roomUnreadCounts[contactRoomId] || 0;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelectedContact(c)}
                                className={`w-full flex items-center gap-3.5 p-4 text-left hover:bg-gray-50/50 transition-colors focus:outline-none ${
                                    isSelected ? 'bg-blue-50/80 hover:bg-blue-50/80' : ''
                                }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={c.profileImage || `https://i.pravatar.cc/150?u=${c.id}`}
                                        alt={c.fullName}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"
                                    />
                                    {unreadCount > 0 && c.role === 'therapist' && (
                                        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-md shadow-red-500/50 flex-shrink-0"></span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-800 text-xs truncate">{c.fullName}</p>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {unreadCount > 0 && (
                                                <span className={`${c.role === 'therapist' ? 'bg-red-500 shadow-md shadow-red-500/30' : 'bg-blue-600'} text-white text-[9px] font-bold h-4 min-w-4 px-1.5 rounded-full flex items-center justify-center animate-pulse flex-shrink-0`}>
                                                    {unreadCount}
                                                </span>
                                            )}
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                c.role === 'therapist' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-green-50 text-green-700 border border-green-100'
                                            }`}>
                                                {c.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Panel - Chat Panel */}
            <div className="flex-1 flex flex-col bg-gray-50/40 relative">
                {!selectedContact ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-sm shadow-md">
                            <span className="text-5xl block mb-4">🔐</span>
                            <h3 className="font-bold text-gray-800 text-base leading-tight">Private Message Center</h3>
                            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                                Select a booked therapist or client from the panel to start a secure, private one-on-one text message clinical channel.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img
                                    src={selectedContact.profileImage || `https://i.pravatar.cc/150?u=${selectedContact.id}`}
                                    alt={selectedContact.fullName}
                                    className="w-9 h-9 rounded-full object-cover border-2 border-gray-100"
                                />
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm leading-tight">{selectedContact.fullName}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Secure one-on-one message thread</p>
                                </div>
                            </div>

                            {auth?.user?.role === 'therapist' && (
                                <button
                                    onClick={() => handleOpenQuickRecords()}
                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none flex-shrink-0"
                                >
                                    <span>📋</span> Quick Notes
                                </button>
                            )}
                        </div>

                        {/* Chat Messages Panel */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.length === 0 && !activeRoomId && (
                                <div className="flex justify-center items-center py-10 gap-2">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-gray-400 font-medium">Connecting secure channel…</span>
                                </div>
                            )}

                            {activeRoomId && messages.length === 0 && (
                                <div className="text-center py-10 px-4 text-gray-400">
                                    <span className="text-2xl block mb-2">👋</span>
                                    <p className="text-xs font-medium">No messages recorded in this chat room yet.</p>
                                    <p className="text-[10px] mt-1">Send a message below to start the conversation!</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => {
                                const isSelf = String(msg.sender?._id) === String(auth?.user?._id);
                                const timeStr = new Date(msg.createdAt).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                });

                                return (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className="flex items-center gap-2 max-w-[70%]">
                                            {!isSelf && (
                                                <img
                                                    src={selectedContact.profileImage || `https://i.pravatar.cc/150?u=${selectedContact.id}`}
                                                    alt={selectedContact.fullName}
                                                    className="w-6 h-6 rounded-full object-cover self-end mb-1 border"
                                                />
                                            )}
                                            <div>
                                                <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed break-words ${
                                                    isSelf
                                                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm shadow-blue-500/10'
                                                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                                }`}>
                                                    {msg.message}
                                                </div>
                                                <span className={`text-[9px] text-gray-400 font-bold block mt-1 px-1 ${
                                                    isSelf ? 'text-right' : 'text-left'
                                                }`}>
                                                    {timeStr}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Footer */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-3">
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder={`Send a message to ${selectedContact.fullName}…`}
                                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || !activeRoomId}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-xl text-xs transition-colors shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                            >
                                <span>📤</span> Send
                            </button>
                        </form>
                        {/* Floating Quick Clinical Records Popup */}
                        {isClinicalPopupOpen && (
                            <div className="absolute top-16 right-6 w-96 max-h-[75vh] z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-fade-in">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">📋</span>
                                        <h3 className="font-bold text-gray-800 text-xs truncate">Records: {selectedContact.fullName}</h3>
                                    </div>
                                    <button
                                        onClick={() => setIsClinicalPopupOpen(false)}
                                        className="text-gray-400 hover:text-gray-600 font-bold focus:outline-none text-xs"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {loadingQuickNotes ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[11px] text-gray-400 font-medium">Loading history…</span>
                                        </div>
                                    ) : quickNotes.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            <span className="text-2xl block mb-1">📭</span>
                                            <p className="text-[11px] font-semibold">No notes recorded yet.</p>
                                        </div>
                                    ) : (
                                        quickNotes.map(n => {
                                            const soap = parseSoap(n.notes);
                                            return (
                                                <div key={n.id} className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm space-y-2.5 hover:border-gray-200 transition-all text-left">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                                n.type === 'appointment' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                            }`}>
                                                                {n.type === 'appointment' ? 'SOAP Note' : 'Standalone'}
                                                            </span>
                                                            <h4 className="font-bold text-gray-800 text-xs mt-1.5 leading-tight">{n.title}</h4>
                                                        </div>
                                                        <span className="text-[9px] text-gray-400 font-bold">
                                                            {new Date(n.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-gray-100">
                                                        {[
                                                            { key: 'S', val: soap.subjective },
                                                            { key: 'O', val: soap.objective },
                                                            { key: 'A', val: soap.assessment },
                                                            { key: 'P', val: soap.plan }
                                                        ].map(({ key, val }) => (
                                                            <div key={key} className="space-y-0.5">
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">{key}</span>
                                                                <p className="text-[10px] text-gray-700 leading-relaxed font-medium line-clamp-3 whitespace-pre-wrap">{val || '—'}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Official Attestation Card in Pop-up */}
                                                    {n.digitalSignature && (
                                                        <div className="mt-2.5 border border-dashed border-gray-200 rounded-xl p-2 bg-gray-50/50 flex flex-col items-center">
                                                            <div className="flex items-center gap-1 mb-1.5 self-start text-[9px] font-bold text-gray-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                </svg>
                                                                <span>Digitally signed by</span>
                                                            </div>
                                                            <div className="w-32 h-12 bg-white border border-gray-100 rounded flex items-center justify-center overflow-hidden p-0.5">
                                                                <img 
                                                                    src={n.digitalSignature} 
                                                                    alt="Signature" 
                                                                    className="max-w-full max-h-full object-contain" 
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MessagesPage;
