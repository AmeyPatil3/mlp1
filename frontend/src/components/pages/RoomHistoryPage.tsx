
import React, { useState, useEffect } from 'react';
import { ClockIcon } from '../ui/icons';
import api from '../../services/api';
import type { Room } from '../../types';

const RoomHistoryPage: React.FC = () => {
    const [history, setHistory] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await api.get('/rooms/history');
                const list = data?.rooms || [];
                setHistory(list);
            } catch (err) {
                setError('Failed to load room history.');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900">Room History</h1>
                <p className="mt-2 text-lg text-gray-600">A record of the peer support rooms you've joined.</p>
            </div>

            <div className="bg-white rounded-xl shadow-md">
                 {loading && <p className="p-6 text-center">Loading history...</p>}
                 {error && <p className="p-6 text-center text-red-500">{error}</p>}
                
                {!loading && !error && (
                    <ul className="divide-y divide-gray-200">
                        {history.length > 0 ? history.map((item) => (
                            <li key={item._id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                               <div className="flex items-center">
                                    <div className="p-2 bg-gray-100 rounded-full">
                                        <ClockIcon className="w-6 h-6 text-gray-500"/>
                                    </div>
                                    <div className="ml-4">
                                         <p className="font-semibold text-gray-800">{item.name}</p>
                                         <p className="text-sm text-gray-500">Topic: {item.topic}</p>
                                    </div>
                               </div>
                               <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                                   Rejoin
                               </button>
                            </li>
                        )) : (
                            <p className="p-6 text-center text-gray-500">You haven't joined any rooms yet.</p>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default RoomHistoryPage;
