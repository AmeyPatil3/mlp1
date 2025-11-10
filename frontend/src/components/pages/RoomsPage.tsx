import React, { useState, useEffect } from 'react';
import RoomCard from '../ui/RoomCard';
import { PlusIcon } from '../ui/icons';
import api from '../../services/api';
import type { Room } from '../../types';
import RoomCardSkeleton from '../ui/skeletons/RoomCardSkeleton';
import CreateRoomModal from '../ui/CreateRoomModal';
import { useNavigate } from 'react-router-dom';

const RoomsPage: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const fetchRooms = async () => {
            setLoading(true);
            try {
                const response = await api.get('/rooms', { params: { page: 1, limit: 50 } });
                if (!isMounted) return;
                const data = response.data?.rooms || [];
                setRooms(data);
            } catch (err) {
                console.error('Rooms fetch error:', err);
                setError('Could not fetch rooms. Please try again.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    const handleCreated = (roomMongoId: string) => {
        // After creating, navigate to room page after joining via API
        const go = async () => {
            try {
                await api.post(`/rooms/${roomMongoId}/join`);
                // Fetch the room to get its roomId
                const room = rooms.find(r => r._id === roomMongoId);
                if (room) {
                    navigate(`/app/member/room/${room.roomId}`);
                } else {
                    // Fallback: refetch rooms and then navigate
                    const response = await api.get('/rooms', { params: { page: 1, limit: 50 } });
                    const data: Room[] = response.data?.rooms || [];
                    const created = data.find(r => r._id === roomMongoId);
                    if (created) navigate(`/app/member/room/${created.roomId}`);
                }
                setIsCreateRoomModalOpen(false);
            } catch (e) {
                console.error('Join after create failed', e);
            }
        };
        go();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">Live Global Rooms</h1>
                    <p className="mt-2 text-lg text-gray-600">Join a room to connect with peers anonymously.</p>
                </div>
                <button 
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="flex items-center bg-blue-600 text-white font-semibold py-3 px-5 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create Private Room
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    Array.from({ length: 3 }).map((_, index) => <RoomCardSkeleton key={index} />)
                ) : rooms.length > 0 ? (
                    rooms.map(room => (
                        <RoomCard key={room._id} room={room} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-16">
                        <p className="text-gray-500 text-lg">No rooms available at the moment.</p>
                    </div>
                )}
            </div>

            <CreateRoomModal
                isOpen={isCreateRoomModalOpen}
                onClose={() => setIsCreateRoomModalOpen(false)}
                onCreated={handleCreated}
            />
        </div>
    );
};

export default RoomsPage;