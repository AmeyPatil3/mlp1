import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface SessionNotesPanelProps {
    roomId: string;
    onClose: () => void;
}

interface Appointment {
    _id: string;
    user?: {
        fullName: string;
        profileImage?: string;
    };
    notes?: string;
}

const parseSoapNotes = (compiledNotes: string) => {
    const subjectiveMatch = compiledNotes.match(/### Subjective\n([\s\S]*?)(?=\n\n###|$)/);
    const objectiveMatch = compiledNotes.match(/### Objective\n([\s\S]*?)(?=\n\n###|$)/);
    const assessmentMatch = compiledNotes.match(/### Assessment\n([\s\S]*?)(?=\n\n###|$)/);
    const planMatch = compiledNotes.match(/### Plan\n([\s\S]*?)(?=\n\n###|$)/);

    if (!subjectiveMatch && !objectiveMatch && !assessmentMatch && !planMatch) {
        // Fallback for raw non-SOAP notes
        return {
            subjective: compiledNotes,
            objective: '',
            assessment: '',
            plan: ''
        };
    }

    return {
        subjective: subjectiveMatch ? subjectiveMatch[1].trim() : '',
        objective: objectiveMatch ? objectiveMatch[1].trim() : '',
        assessment: assessmentMatch ? assessmentMatch[1].trim() : '',
        plan: planMatch ? planMatch[1].trim() : ''
    };
};

const SessionNotesPanel: React.FC<SessionNotesPanelProps> = ({ roomId, onClose }) => {
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editSubjective, setEditSubjective] = useState('');
    const [editObjective, setEditObjective] = useState('');
    const [editAssessment, setEditAssessment] = useState('');
    const [editPlan, setEditPlan] = useState('');

    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        let isMounted = true;
        const fetchAppointment = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get(`/appointments/room/${roomId}`);
                if (!isMounted) return;

                const apt = res.data?.appointment;
                setAppointment(apt);
                if (apt?.notes) {
                    const soap = parseSoapNotes(apt.notes);
                    setEditSubjective(soap.subjective);
                    setEditObjective(soap.objective);
                    setEditAssessment(soap.assessment);
                    setEditPlan(soap.plan);
                }
            } catch (e: any) {
                if (!isMounted) return;
                console.error("Failed to fetch appointment context:", e);
                setError(e?.response?.data?.message || "No appointment session matches this call.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchAppointment();
        return () => { isMounted = false; };
    }, [roomId]);

    const handleSaveNotes = async () => {
        if (!appointment) return;

        setSaving(true);
        const compiledNotes = `### Subjective\n${editSubjective}\n\n### Objective\n${editObjective}\n\n### Assessment\n${editAssessment}\n\n### Plan\n${editPlan}`;

        try {
            const res = await api.put(`/appointments/${appointment._id}`, {
                notes: compiledNotes
            });

            if (res.data?.success) {
                setToastType("success");
                setToastMessage("Clinical notes saved successfully!");
                setTimeout(() => setToastMessage(null), 3000);
            }
        } catch (e) {
            console.error("Failed to save session records:", e);
            setToastType("error");
            setToastMessage("Failed to save records.");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    const isSoapRecorded = editSubjective || editObjective || editAssessment || editPlan;

    return (
        <div className="w-80 h-full bg-gray-950/95 border-l border-gray-800 flex flex-col z-30 animate-slide-in relative">
            
            {/* Slide-out alert toast */}
            {toastMessage && (
                <div className={`absolute top-4 left-4 right-4 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-lg z-50 animate-fade-in flex items-center gap-1.5 ${
                    toastType === 'error' ? 'bg-red-600 border border-red-500' : 'bg-emerald-600 border border-emerald-500'
                }`}>
                    <span>{toastType === 'error' ? '⚠️' : '✓'}</span> {toastMessage}
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
                <div className="flex items-center gap-2">
                    <span className="text-xl">✍️</span>
                    <h3 className="text-white font-bold tracking-tight text-sm">Session Clinical Notes</h3>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-gray-500 font-medium">Acquiring appointment context...</span>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-3xl mb-2">⚠️</span>
                    <h4 className="text-white font-semibold text-sm mb-1">Session Not Found</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">{error}</p>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto p-4 space-y-5 min-h-0">
                    {/* Client Info Banner */}
                    <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800/40 flex items-center gap-3">
                        <img 
                            src={appointment?.user?.profileImage || "https://i.pravatar.cc/150"} 
                            alt="Client Avatar" 
                            className="w-10 h-10 rounded-full border border-gray-800/60 object-cover"
                        />
                        <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Currently Booking</span>
                            <span className="text-white font-bold text-sm block leading-tight">{appointment?.user?.fullName || "Client"}</span>
                        </div>
                    </div>

                    {/* SOAP segments edit section */}
                    <div className="space-y-4 pt-1">

                        {/* Subjective */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Subjective (S)</label>
                            <textarea
                                value={editSubjective}
                                onChange={(e) => setEditSubjective(e.target.value)}
                                placeholder="Client's thoughts, experiences, and verbal reports"
                                className="w-full h-16 bg-gray-900/50 border border-gray-800/60 hover:border-gray-800 focus:border-amber-500 rounded-xl p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none transition-all"
                            />
                        </div>

                        {/* Objective */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Objective (O)</label>
                            <textarea
                                value={editObjective}
                                onChange={(e) => setEditObjective(e.target.value)}
                                placeholder="Observable metrics, appearance, demeanor, and clinical data"
                                className="w-full h-16 bg-gray-900/50 border border-gray-800/60 hover:border-gray-800 focus:border-amber-500 rounded-xl p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none transition-all"
                            />
                        </div>

                        {/* Assessment */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Assessment (A)</label>
                            <textarea
                                value={editAssessment}
                                onChange={(e) => setEditAssessment(e.target.value)}
                                placeholder="Therapeutic evaluation, symptoms synthesis, progress details"
                                className="w-full h-16 bg-gray-900/50 border border-gray-800/60 hover:border-gray-800 focus:border-amber-500 rounded-xl p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none transition-all"
                            />
                        </div>

                        {/* Plan */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Plan (P)</label>
                            <textarea
                                value={editPlan}
                                onChange={(e) => setEditPlan(e.target.value)}
                                placeholder="Future therapeutic activities, homework assignments, next session"
                                className="w-full h-16 bg-gray-900/50 border border-gray-800/60 hover:border-gray-800 focus:border-amber-500 rounded-xl p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Save Buttons Panel */}
            {!loading && !error && (
                <div className="p-4 border-t border-gray-800 bg-gray-950 flex flex-col gap-2">
                    <button
                        onClick={handleSaveNotes}
                        disabled={saving || !isSoapRecorded}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-800 text-white disabled:text-gray-500 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md focus:outline-none flex items-center justify-center gap-1.5"
                    >
                        {saving ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving Notes...
                            </>
                        ) : (
                            <>💾 Save Clinical Notes</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SessionNotesPanel;
