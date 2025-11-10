import React, { useState } from 'react';
import Modal from './Modal';
import { LockClosedIcon } from './icons';
import api from '../../services/api';

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated?: (roomId: string) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || name.trim().length < 3) {
            setError('Room name must be at least 3 characters.');
            return;
        }
        if (!topic || topic.trim().length < 5) {
            setError('Topic must be at least 5 characters.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const res = await api.post('/rooms', {
                name,
                topic,
                description: topic,
                maxParticipants: 10,
                tags: [],
                isPrivate: false,
                password: password || undefined
            });
            const room = res.data?.room;
            // Reset form
            setName('');
            setTopic('');
            setPassword('');
            if (onCreated && room) onCreated(room._id);
            onClose();
        } catch (err: any) {
            const apiMessage = err?.response?.data?.message;
            const apiErrors = err?.response?.data?.errors;
            if (apiErrors && Array.isArray(apiErrors)) {
                setError(apiErrors.map((e: any) => e.msg).join(', '));
            } else if (apiMessage) {
                setError(apiMessage);
            } else {
                setError('Failed to create room');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a Private Room">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="room-name" className="block text-sm font-medium text-gray-700">Room Name</label>
                    <input
                        type="text"
                        id="room-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Evening Wind-Down"
                    />
                </div>
                <div>
                    <label htmlFor="room-topic" className="block text-sm font-medium text-gray-700">Topic</label>
                    <input
                        type="text"
                        id="room-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Managing work stress"
                    />
                </div>
                <div className="relative">
                    <label htmlFor="room-password" className="block text-sm font-medium text-gray-700">Password (Optional)</label>
                    <div className="relative mt-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="password"
                            id="room-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Make it secure"
                        />
                    </div>
                </div>
                {error && (
                    <div className="text-red-600 text-sm">{error}</div>
                )}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={!name || !topic || submitting}
                        className="w-full bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                        {submitting ? 'Creating...' : 'Create and Join Room'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateRoomModal;
