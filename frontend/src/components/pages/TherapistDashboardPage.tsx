import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDaysIcon, UsersIcon } from '../ui/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
                {icon}
            </div>
            <div className="ml-4">
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    </div>
);

type PopulatedUser = {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
};

type PopulatedTherapistUser = {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
};

type PopulatedTherapist = {
    _id: string;
    user: PopulatedTherapistUser;
};

type Appointment = {
    _id: string;
    user: PopulatedUser;
    therapist: PopulatedTherapist;
    scheduledDate: string;
    duration: number;
    status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
    type: 'video' | 'audio' | 'chat';
    notes?: string;
    meetingLink?: string;
};

const TherapistDashboardPage: React.FC = () => {
    const { auth } = useAuth();
    const displayName = auth?.user?.fullName || 'Therapist';
    const navigate = useNavigate();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    type MessageNotification = {
        roomId: string;
        senderId: string;
        senderName: string;
        senderImage?: string;
        messageText: string;
    };
    const [msgNotification, setMsgNotification] = useState<MessageNotification | null>(null);

    useEffect(() => {
        const authData = localStorage.getItem('auth');
        const token = authData ? JSON.parse(authData).token : null;
        if (!token) return;

        const socketUrl = (process.env.VITE_SOCKET_URL as string) || 'http://localhost:5001';
        const socket = io(socketUrl, {
            auth: { token },
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('Therapist dashboard socket connected successfully');
        });

        socket.on('new_message_notification', (data: any) => {
            setUnreadCount(prev => prev + 1);

            setMsgNotification({
                roomId: data.roomId,
                senderId: data.sender?._id,
                senderName: data.sender?.name || 'Client',
                senderImage: data.sender?.profileImage,
                messageText: data.message || ''
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (msgNotification) {
            const timer = setTimeout(() => setMsgNotification(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [msgNotification]);

    // SOAP notes states
    const [selectedAptForNotes, setSelectedAptForNotes] = useState<Appointment | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // Editable SOAP segments
    const [editSubjective, setEditSubjective] = useState<string>('');
    const [editObjective, setEditObjective] = useState<string>('');
    const [editAssessment, setEditAssessment] = useState<string>('');
    const [editPlan, setEditPlan] = useState<string>('');

    const parseSoapNotes = (compiledNotes: string) => {
        const subjectiveMatch = compiledNotes.match(/### Subjective\n([\s\S]*?)(?=\n\n###|$)/);
        const objectiveMatch = compiledNotes.match(/### Objective\n([\s\S]*?)(?=\n\n###|$)/);
        const assessmentMatch = compiledNotes.match(/### Assessment\n([\s\S]*?)(?=\n\n###|$)/);
        const planMatch = compiledNotes.match(/### Plan\n([\s\S]*?)(?=\n\n###|$)/);

        if (!subjectiveMatch && !objectiveMatch && !assessmentMatch && !planMatch) {
            return { subjective: compiledNotes, objective: '', assessment: '', plan: '' };
        }

        return {
            subjective: subjectiveMatch ? subjectiveMatch[1].trim() : '',
            objective: objectiveMatch ? objectiveMatch[1].trim() : '',
            assessment: assessmentMatch ? assessmentMatch[1].trim() : '',
            plan: planMatch ? planMatch[1].trim() : ''
        };
    };

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    useEffect(() => {
        let isMounted = true;
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get('/appointments', { params: { page: 1, limit: 100 } });
                if (!isMounted) return;
                const items: Appointment[] = res.data?.appointments || [];
                const sorted = items.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
                const active = sorted.filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in-progress');
                setAppointments(active);
            } catch (e: any) {
                if (!isMounted) return;
                setError(e?.response?.data?.message || 'Failed to load appointments');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        const fetchUnread = async () => {
            try {
                const res = await api.get('/rooms/unread-count');
                if (!isMounted) return;
                setUnreadCount(res.data?.unreadCount || 0);
            } catch (_e) {
                if (!isMounted) return;
                setUnreadCount(0);
            }
        };
        fetchAppointments();
        fetchUnread();

        const pollInterval = setInterval(fetchUnread, 15000);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, []);

    const formatTimeRange = (isoDate: string, durationMinutes: number) => {
        const start = new Date(isoDate);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${fmt(start)} - ${fmt(end)}`;
    };

    const todaysCount = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d = today.getDate();
        const start = new Date(y, m, d, 0, 0, 0, 0).getTime();
        const end = new Date(y, m, d + 1, 0, 0, 0, 0).getTime();
        return appointments.filter(a => {
            const t = new Date(a.scheduledDate).getTime();
            return t >= start && t < end && (a.status === 'scheduled' || a.status === 'confirmed');
        }).length;
    }, [appointments]);

    const handleSaveSoapNotes = async () => {
        const compiledNotes = `### Subjective\n${editSubjective}\n\n### Objective\n${editObjective}\n\n### Assessment\n${editAssessment}\n\n### Plan\n${editPlan}`;

        try {
            if (!selectedAptForNotes) return;
            const res = await api.put(`/appointments/${selectedAptForNotes._id}`, { notes: compiledNotes });

            if (res.data && res.data.success) {
                setAppointments(prev => prev.map(a => {
                    if (a._id === selectedAptForNotes._id) {
                        return { ...a, notes: compiledNotes };
                    }
                    return a;
                }));
                setToastType('success');
                setToastMessage('Clinical SOAP notes saved successfully!');
                setSelectedAptForNotes(null);
            }
        } catch (e: any) {
            console.error('Failed to save clinical records:', e);
            setToastType('error');
            setToastMessage(e?.response?.data?.message || 'Failed to save clinical records.');
        }
    };

    return (
        <div>
            {/* Toast */}
            {toastMessage && (
                <div className={`fixed top-6 right-6 text-white font-semibold py-3.5 px-6 rounded-xl shadow-2xl z-50 animate-fade-in flex items-center gap-2 ${
                    toastType === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                    <span className="text-sm">{toastType === 'error' ? '⚠️' : '✓'}</span> {toastMessage}
                </div>
            )}

            {/* Real-time Message Notification Toast */}
            {msgNotification && (
                <div 
                    onClick={() => {
                        navigate('/app/therapist/messages', { state: { contactId: msgNotification.senderId } });
                        setMsgNotification(null);
                    }}
                    className="fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 text-white p-4.5 rounded-2xl shadow-2xl z-50 flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/50 hover:shadow-blue-500/20 max-w-sm cursor-pointer animate-fade-in"
                    style={{
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <div className="relative flex-shrink-0">
                        {msgNotification.senderImage ? (
                            <img 
                                src={msgNotification.senderImage} 
                                alt={msgNotification.senderName} 
                                className="w-12 h-12 rounded-full object-cover border border-slate-700 shadow-inner"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-lg shadow-blue-500/25">
                                {msgNotification.senderName.charAt(0)}
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold tracking-wider text-blue-400 uppercase">New Message</span>
                            <span className="text-[10px] text-slate-400 font-medium">Just now</span>
                        </div>
                        <p className="font-bold text-slate-100 text-sm mt-0.5 truncate">{msgNotification.senderName}</p>
                        <p className="text-xs text-slate-300 font-medium mt-0.5 truncate leading-relaxed">
                            {msgNotification.messageText}
                        </p>
                        <div className="mt-1.5 flex items-center text-[10px] font-bold text-blue-400 group">
                            <span>Reply Now</span>
                            <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setMsgNotification(null);
                        }}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none self-start"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="mb-12">
                <h1 className="text-4xl font-bold text-gray-900">Welcome, {displayName}</h1>
                <p className="mt-2 text-lg text-gray-600">Here's a summary of your activity today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <StatCard title="Today's Appointments" value={String(todaysCount)} icon={<CalendarDaysIcon className="w-8 h-8 text-blue-600" />} />
                <StatCard title="New Messages" value={String(unreadCount)} icon={<UsersIcon className="w-8 h-8 text-blue-600" />} />
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Upcoming Appointments</h2>
                            <p className="text-xs text-gray-500 mt-1">Manage scheduled, confirmed or active sessions</p>
                        </div>
                    </div>

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-gray-500 font-medium">Loading appointments...</p>
                        </div>
                    )}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                    {!loading && !error && (
                        <ul className="space-y-4">
                            {appointments.length === 0 && (
                                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <span className="text-4xl block mb-2">🗓️</span>
                                    <h3 className="text-gray-700 font-bold text-sm">No Appointments Scheduled</h3>
                                    <p className="text-xs text-gray-400 mt-1">When clients book therapy sessions with you, they will appear here.</p>
                                </div>
                            )}
                            {appointments.map((apt) => (
                                <li key={apt._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-gray-50 hover:bg-gray-100/70 border border-gray-100 hover:border-gray-200 rounded-2xl gap-4 transition-all duration-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-800 text-sm">{apt.user?.fullName || 'Client'}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                apt.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                apt.status === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {apt.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                            <span>📅</span>
                                            {new Date(apt.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', weekday: 'short' })}
                                            <span>•</span>
                                            <span>🕒</span>
                                            {formatTimeRange(apt.scheduledDate, apt.duration || 60)}
                                        </p>
                                        {apt.notes && (
                                            <div className="mt-2.5 inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                                <span>📝</span> SOAP Note Recorded
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-3 self-end sm:self-auto flex-shrink-0">
                                        {(() => {
                                            const joinLink = apt.meetingLink ? apt.meetingLink.replace('app/member/room/', 'app/therapist/room/') : '';
                                            const enabled = Boolean(joinLink) && apt.status !== 'cancelled' && apt.status !== 'completed' && apt.status !== 'no-show';
                                            return (
                                                <a
                                                    href={enabled ? joinLink : '#'}
                                                    target={enabled ? '_blank' : undefined}
                                                    rel={enabled ? 'noopener noreferrer' : undefined}
                                                    className={`bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-blue-700 text-xs transition-all shadow-md shadow-blue-500/10 ${enabled ? '' : 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-400 hover:bg-gray-200'}`}
                                                    onClick={(e) => { if (!enabled) e.preventDefault(); }}
                                                >
                                                    {enabled ? 'Join Call' : (apt.status === 'completed' ? 'Completed' : (apt.status === 'cancelled' ? 'Cancelled' : 'Awaiting Link'))}
                                                </a>
                                            );
                                        })()}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* SOAP Notes Overlay Modal */}
            {selectedAptForNotes && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden relative flex flex-col my-8">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center space-x-2.5">
                                <span className="text-xl">📝</span>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-base leading-tight">Clinical SOAP Notes</h3>
                                    <p className="text-[11px] text-gray-500 font-semibold">Record structured clinical summaries for {selectedAptForNotes.user?.fullName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAptForNotes(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold focus:outline-none"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-950 font-medium leading-relaxed">
                                Fill in each SOAP segment below to record the clinical session notes. All details are safely stored under the client's records history.
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {[
                                    { label: 'Subjective (S)', value: editSubjective, setter: setEditSubjective, placeholder: "Client's thoughts, experiences, and verbal reports" },
                                    { label: 'Objective (O)', value: editObjective, setter: setEditObjective, placeholder: 'Observable metrics, demeanor, and physical symptoms' },
                                    { label: 'Assessment (A)', value: editAssessment, setter: setEditAssessment, placeholder: 'Clinical analysis, diagnosis, progress notes' },
                                    { label: 'Plan (P)', value: editPlan, setter: setEditPlan, placeholder: 'Agreed interventions, homework, follow-up steps' }
                                ].map(({ label, value, setter, placeholder }) => (
                                    <div key={label} className="flex flex-col">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">{label}</label>
                                        <textarea
                                            value={value}
                                            onChange={(e) => setter(e.target.value)}
                                            placeholder={placeholder}
                                            className="flex-1 w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[140px] font-medium resize-y leading-relaxed"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedAptForNotes(null)}
                                className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSoapNotes}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm flex items-center gap-2"
                            >
                                💾 Save Note
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TherapistDashboardPage;
