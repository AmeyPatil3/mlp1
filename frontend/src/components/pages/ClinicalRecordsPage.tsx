import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ClientUser = {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
};

type ClinicalNote = {
    _id: string;
    client: ClientUser;
    sessionDate: string;
    notes: string;
    title?: string;
    appointment?: string | null;
    digitalSignature?: string;
    createdAt: string;
    updatedAt: string;
};

type Appointment = {
    _id: string;
    user: ClientUser;
    scheduledDate: string;
    duration: number;
    status: string;
    notes?: string;
};

// ─── SOAP helpers ─────────────────────────────────────────────────────────────

const parseSoap = (raw: string) => {
    const get = (key: string) => {
        const m = raw.match(new RegExp(`### ${key}\\n([\\s\\S]*?)(?=\\n\\n###|$)`));
        return m ? m[1].trim() : '';
    };
    const hasKeys = /### (Subjective|Objective|Assessment|Plan)/.test(raw);
    if (!hasKeys) return { subjective: raw, objective: '', assessment: '', plan: '' };
    return { subjective: get('Subjective'), objective: get('Objective'), assessment: get('Assessment'), plan: get('Plan') };
};

const compileSoap = (s: string, o: string, a: string, p: string) =>
    `### Subjective\n${s}\n\n### Objective\n${o}\n\n### Assessment\n${a}\n\n### Plan\n${p}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const SoapView: React.FC<{ raw: string }> = ({ raw }) => {
    const soap = parseSoap(raw);
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-gray-50/50 rounded-xl p-4 border border-gray-100">
            {[
                { label: 'Subjective (S)', val: soap.subjective },
                { label: 'Objective (O)', val: soap.objective },
                { label: 'Assessment (A)', val: soap.assessment },
                { label: 'Plan (P)', val: soap.plan },
            ].map(({ label, val }) => (
                <div key={label} className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium whitespace-pre-wrap">{val || 'No details recorded.'}</p>
                </div>
            ))}
        </div>
    );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalMode = 'new' | 'edit';

interface NoteModalProps {
    mode: ModalMode;
    clientName: string;
    initialDate: string;
    initialTitle: string;
    initialSubjective: string;
    initialObjective: string;
    initialAssessment: string;
    initialPlan: string;
    onClose: () => void;
    onSave: (data: { sessionDate: string; title: string; subjective: string; objective: string; assessment: string; plan: string }) => Promise<void>;
    saving: boolean;
    isAppointment?: boolean;
}

const NoteModal: React.FC<NoteModalProps> = ({
    mode, clientName, initialDate, initialTitle,
    initialSubjective, initialObjective, initialAssessment, initialPlan,
    onClose, onSave, saving, isAppointment = false
}) => {
    const [sessionDate, setSessionDate] = useState(initialDate);
    const [title, setTitle] = useState(initialTitle);
    const [subjective, setSubjective] = useState(initialSubjective);
    const [objective, setObjective] = useState(initialObjective);
    const [assessment, setAssessment] = useState(initialAssessment);
    const [plan, setPlan] = useState(initialPlan);

    const fields = [
        { label: 'Subjective (S)', value: subjective, setter: setSubjective, placeholder: "Client's thoughts, experiences, and verbal reports" },
        { label: 'Objective (O)', value: objective, setter: setObjective, placeholder: 'Observable metrics, demeanor, and physical symptoms' },
        { label: 'Assessment (A)', value: assessment, setter: setAssessment, placeholder: 'Clinical analysis, diagnosis, progress notes' },
        { label: 'Plan (P)', value: plan, setter: setPlan, placeholder: 'Agreed interventions, homework, follow-up steps' },
    ];

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col my-8">
                {/* Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xl">📝</span>
                        <div>
                            <h3 className="font-bold text-gray-800 text-base">
                                {isAppointment ? 'Log/Edit SOAP Session Note' : (mode === 'new' ? 'Add Clinical Note' : 'Edit Clinical Note')}
                            </h3>
                            <p className="text-[11px] text-gray-500 font-semibold">
                                {isAppointment ? 'Update session notes' : (mode === 'new' ? 'Log a new clinical session record' : 'Update clinical session record')} for {clientName}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 max-h-[70vh]">
                    {/* Date + Title row */}
                    {!isAppointment ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Session Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={sessionDate}
                                    onChange={e => setSessionDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Note Title <span className="font-normal text-gray-400">(optional)</span></label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. Session 3 – Anxiety CBT"
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs font-semibold text-blue-900 flex items-center gap-2">
                            <span>🗓️</span>
                            <span>
                                Appointment Session Scheduled for: {new Date(initialDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                        </div>
                    )}

                    {/* SOAP fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {fields.map(({ label, value, setter, placeholder }) => (
                            <div key={label} className="flex flex-col">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">{label}</label>
                                <textarea
                                    value={value}
                                    onChange={e => setter(e.target.value)}
                                    placeholder={placeholder}
                                    className="flex-1 w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[130px] font-medium resize-y leading-relaxed"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ sessionDate, title, subjective, objective, assessment, plan })}
                        disabled={saving || (!isAppointment && !sessionDate)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                    >
                        {saving ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                        ) : (
                            <>💾 Save Note</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ClinicalRecordsPage: React.FC = () => {
    const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

    const [modalState, setModalState] = useState<{
        open: boolean;
        mode: ModalMode;
        clientId: string;
        clientName: string;
        editingNoteId?: string;
        editingAppointmentId?: string;
        initialDate: string;
        initialTitle: string;
        initialSubjective: string;
        initialObjective: string;
        initialAssessment: string;
        initialPlan: string;
    } | null>(null);

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ─── Data loading ──────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const [notesRes, aptsRes] = await Promise.all([
                    api.get('/clinical-notes'),
                    api.get('/appointments', { params: { page: 1, limit: 100 } })
                ]);
                if (!mounted) return;
                setClinicalNotes(notesRes.data?.notes || []);
                setAppointments(aptsRes.data?.appointments || []);
            } catch (e: any) {
                if (!mounted) return;
                setError(e?.response?.data?.message || 'Failed to load clinical records');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    // ─── Group by client ───────────────────────────────────────────────────
    const groupedClients = useMemo(() => {
        const groups: {
            [clientId: string]: {
                clientName: string;
                clientImage?: string;
                notes: ClinicalNote[];
                appointments: Appointment[];
            }
        } = {};

        // Gather from clinical notes
        clinicalNotes.forEach(note => {
            const c = note.client;
            if (!c) return;
            if (!groups[c._id]) groups[c._id] = { clientName: c.fullName, clientImage: c.profileImage, notes: [], appointments: [] };
            groups[c._id].notes.push(note);
        });

        // Gather from real appointments (for "Appointment Sessions" view)
        appointments.forEach(apt => {
            const c = apt.user;
            if (!c) return;
            if (!groups[c._id]) groups[c._id] = { clientName: c.fullName, clientImage: c.profileImage, notes: [], appointments: [] };
            groups[c._id].appointments.push(apt);
        });

        return Object.entries(groups)
            .map(([id, data]) => ({ clientId: id, ...data }))
            .sort((a, b) => a.clientName.localeCompare(b.clientName));
    }, [clinicalNotes, appointments]);

    // ─── Format helpers ────────────────────────────────────────────────────
    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const fmtTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const fmtRange = (iso: string, dur: number) => {
        const start = new Date(iso);
        const end = new Date(start.getTime() + dur * 60000);
        const f = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${f(start)} – ${f(end)}`;
    };

    // ─── Open modal ────────────────────────────────────────────────────────
    const openNewNote = (clientId: string, clientName: string) => {
        const now = new Date();
        // Trim seconds to get datetime-local compatible string
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setModalState({
            open: true, mode: 'new', clientId, clientName,
            initialDate: local, initialTitle: '', initialSubjective: '', initialObjective: '', initialAssessment: '', initialPlan: ''
        });
    };

    const openEditNote = (note: ClinicalNote) => {
        const soap = parseSoap(note.notes || '');
        const sessionDateLocal = new Date(new Date(note.sessionDate).getTime() - new Date(note.sessionDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setModalState({
            open: true, mode: 'edit',
            clientId: note.client._id,
            clientName: note.client.fullName,
            editingNoteId: note._id,
            initialDate: sessionDateLocal,
            initialTitle: note.title || '',
            initialSubjective: soap.subjective,
            initialObjective: soap.objective,
            initialAssessment: soap.assessment,
            initialPlan: soap.plan,
        });
    };

    const openEditAppointmentNote = (apt: Appointment) => {
        const soap = parseSoap(apt.notes || '');
        const sessionDateLocal = new Date(new Date(apt.scheduledDate).getTime() - new Date(apt.scheduledDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setModalState({
            open: true, mode: 'edit',
            clientId: apt.user._id,
            clientName: apt.user.fullName,
            editingAppointmentId: apt._id,
            initialDate: sessionDateLocal,
            initialTitle: 'Appointment Session Note',
            initialSubjective: soap.subjective,
            initialObjective: soap.objective,
            initialAssessment: soap.assessment,
            initialPlan: soap.plan,
        });
    };

    // ─── Save ──────────────────────────────────────────────────────────────
    const handleSave = async (data: { sessionDate: string; title: string; subjective: string; objective: string; assessment: string; plan: string }) => {
        if (!modalState) return;
        setSaving(true);
        const compiledNotes = compileSoap(data.subjective, data.objective, data.assessment, data.plan);
        try {
            if (modalState.editingAppointmentId) {
                const res = await api.put(`/appointments/${modalState.editingAppointmentId}`, {
                    notes: compiledNotes,
                });
                if (res.data?.success) {
                    setAppointments(prev => prev.map(a => a._id === modalState.editingAppointmentId ? { ...a, notes: compiledNotes } : a));
                    showToast('Session SOAP note saved successfully!', 'success');
                    setModalState(null);
                }
            } else if (modalState.mode === 'new') {
                const res = await api.post('/clinical-notes', {
                    clientId: modalState.clientId,
                    sessionDate: data.sessionDate,
                    notes: compiledNotes,
                    title: data.title,
                });
                if (res.data?.success) {
                    setClinicalNotes(prev => [res.data.note, ...prev]);
                    showToast('Clinical note saved successfully!', 'success');
                    setModalState(null);
                }
            } else {
                const res = await api.put(`/clinical-notes/${modalState.editingNoteId}`, {
                    sessionDate: data.sessionDate,
                    notes: compiledNotes,
                    title: data.title,
                });
                if (res.data?.success) {
                    setClinicalNotes(prev => prev.map(n => n._id === modalState.editingNoteId ? res.data.note : n));
                    showToast('Clinical note updated!', 'success');
                    setModalState(null);
                }
            }
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Failed to save note.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm('Delete this clinical note? This action cannot be undone.')) return;
        try {
            await api.delete(`/clinical-notes/${noteId}`);
            setClinicalNotes(prev => prev.filter(n => n._id !== noteId));
            showToast('Note deleted.', 'success');
        } catch {
            showToast('Failed to delete note.', 'error');
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 text-white font-semibold py-3.5 px-6 rounded-xl shadow-2xl z-[60] flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    <span>{toast.type === 'error' ? '⚠️' : '✓'}</span> {toast.msg}
                </div>
            )}

            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="text-3xl">📋</span> Client Clinical Records
                </h1>
                <p className="mt-2 text-lg text-gray-600">SOAP session notes grouped by client — independent of scheduled appointments</p>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 font-medium">Loading clinical records…</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>
                    )}

                    {!loading && !error && groupedClients.length === 0 && (
                        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-5xl block mb-3">📋</span>
                            <h3 className="text-gray-700 font-bold text-base">No Client Records Yet</h3>
                            <p className="text-sm text-gray-400 mt-1">Once you have clients with appointments or written clinical notes, they'll appear here.</p>
                        </div>
                    )}

                    {!loading && !error && groupedClients.map(group => {
                        const isExpanded = expandedClientId === group.clientId;
                        const totalNotes = group.notes.length;
                        const totalApts = group.appointments.length;
                        const sessionNotesCount = group.appointments.filter(a => a.notes).length;
                        const totalAll = totalNotes + sessionNotesCount;

                        return (
                            <div key={group.clientId} className="mb-4 border border-gray-100 hover:border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all">
                                {/* Client accordion header */}
                                <button
                                    onClick={() => setExpandedClientId(isExpanded ? null : group.clientId)}
                                    className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50/50 text-left transition-colors focus:outline-none"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <img
                                            src={group.clientImage || `https://i.pravatar.cc/150?u=${group.clientId}`}
                                            alt={group.clientName}
                                            className="w-11 h-11 rounded-full object-cover border-2 border-gray-100"
                                        />
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm leading-tight">{group.clientName}</h3>
                                            <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-2 flex-wrap">
                                                <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                    📋 {totalAll} Total Note{totalAll !== 1 ? 's' : ''}
                                                </span>
                                                <span>•</span>
                                                <span>✍️ {totalNotes} Your Note{totalNotes !== 1 ? 's' : ''}</span>
                                                {sessionNotesCount > 0 && (
                                                    <><span>•</span><span>🎥 {sessionNotesCount} Session SOAP{sessionNotesCount !== 1 ? 's' : ''}</span></>
                                                )}
                                                {totalApts > 0 && (
                                                    <><span>•</span><span className="text-gray-400">🗓 {totalApts} Apt{totalApts !== 1 ? 's' : ''}</span></>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-400 select-none">{isExpanded ? 'Hide' : 'View Records'}</span>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-6 bg-gray-50/40 space-y-6">
                                        
                                        {/* ── Clinical Notes Section ─────────────────────── */}
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-sm">Clinical Notes</h4>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">Session notes written by you for this client</p>
                                                </div>
                                                <button
                                                    onClick={() => openNewNote(group.clientId, group.clientName)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-all"
                                                >
                                                    ➕ Add Note
                                                </button>
                                            </div>

                                            {group.notes.length === 0 ? (
                                                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                                                    <p className="text-xs text-gray-400 font-medium">No clinical notes written yet.</p>
                                                    <button onClick={() => openNewNote(group.clientId, group.clientName)} className="text-xs text-blue-600 hover:text-blue-700 font-bold mt-2 inline-flex items-center gap-1">
                                                        ✍️ Write the first note
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative pl-6 border-l-2 border-indigo-100 ml-4 space-y-6">
                                                    {group.notes
                                                        .slice()
                                                        .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
                                                        .map(note => (
                                                            <div key={note._id} className="relative">
                                                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 shadow-sm" />
                                                                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition-shadow">
                                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                                        <div>
                                                                            {note.title && (
                                                                                <span className="text-xs font-bold text-indigo-600 block mb-0.5">{note.title}</span>
                                                                            )}
                                                                            <h5 className="font-bold text-gray-800 text-sm">
                                                                                {fmtDate(note.sessionDate)} <span className="font-normal text-gray-500">@ {fmtTime(note.sessionDate)}</span>
                                                                            </h5>
                                                                            <p className="text-[10px] text-gray-400 mt-0.5">Last updated: {fmtDate(note.updatedAt)}</p>
                                                                        </div>
                                                                        <div className="flex gap-2 flex-shrink-0">
                                                                            <button
                                                                                onClick={() => openEditNote(note)}
                                                                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-1"
                                                                            >
                                                                                ✍️ Edit
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDelete(note._id)}
                                                                                className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-1"
                                                                            >
                                                                                🗑
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    {note.notes ? <SoapView raw={note.notes} /> : (
                                                                        <p className="text-xs text-gray-400 italic mt-2">No note content recorded.</p>
                                                                    )}

                                                                    {/* Official Attestation Card */}
                                                                    {note.digitalSignature && (
                                                                        <div className="mt-4 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col items-center max-w-sm">
                                                                            <div className="flex items-center gap-1.5 mb-3 self-start text-xs font-bold text-gray-700">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                                </svg>
                                                                                <span>Digitally signed by</span>
                                                                            </div>
                                                                            <div className="w-48 h-20 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-center overflow-hidden p-1">
                                                                                <img 
                                                                                    src={note.digitalSignature} 
                                                                                    alt="Digitally signed by" 
                                                                                    className="max-w-full max-h-full object-contain" 
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* ── Appointment Sessions Section ───────────────── */}
                                        {group.appointments.length > 0 && (
                                            <div className="pt-4 border-t border-gray-100">
                                                <div className="mb-3">
                                                    <h4 className="font-bold text-gray-800 text-sm">Appointment Sessions</h4>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">Scheduled/completed sessions — SOAP notes saved during live calls appear here</p>
                                                </div>
                                                <div className="space-y-3">
                                                    {group.appointments
                                                        .slice()
                                                        .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
                                                        .map(apt => (
                                                            <div key={apt._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-xs font-bold text-gray-700">
                                                                            {fmtDate(apt.scheduledDate)} @ {fmtRange(apt.scheduledDate, apt.duration || 60)}
                                                                        </span>
                                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                                                            apt.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                                            apt.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                                            'bg-gray-100 text-gray-500'
                                                                        }`}>
                                                                            {apt.status}
                                                                        </span>
                                                                        {apt.notes && (
                                                                            <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                                                📝 SOAP Recorded
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => openEditAppointmentNote(apt)}
                                                                        className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center gap-1 transition-colors flex-shrink-0"
                                                                    >
                                                                        ✍️ Edit
                                                                    </button>
                                                                </div>
                                                                {apt.notes && (
                                                                    <div>
                                                                        <SoapView raw={apt.notes} />
                                                                    </div>
                                                                )}
                                                                {!apt.notes && (
                                                                    <p className="text-[11px] text-gray-400">No SOAP note recorded for this session yet.</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Note Modal */}
            {modalState?.open && (
                <NoteModal
                    mode={modalState.mode}
                    clientName={modalState.clientName}
                    initialDate={modalState.initialDate}
                    initialTitle={modalState.initialTitle}
                    initialSubjective={modalState.initialSubjective}
                    initialObjective={modalState.initialObjective}
                    initialAssessment={modalState.initialAssessment}
                    initialPlan={modalState.initialPlan}
                    onClose={() => setModalState(null)}
                    onSave={handleSave}
                    saving={saving}
                />
            )}
        </div>
    );
};

export default ClinicalRecordsPage;
