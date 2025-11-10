
import React from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon, VideoCameraIcon } from './icons';
import type { Room } from '../../types';

interface RoomCardProps {
    room: Room;
}

const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300">
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center mb-2">
                    <div className="p-2 bg-blue-100 rounded-full">
                        <VideoCameraIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="ml-2 text-sm font-semibold text-blue-800">{room.name}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">{room.topic}</h3>
                
                <div className="flex items-center text-gray-500 mt-4">
                    <UsersIcon className="w-5 h-5 mr-2" />
                    <span>{typeof room.participantsCount === 'number' ? room.participantsCount : 0} / {room.maxParticipants || 10} participants</span>
                </div>

                <div className="mt-auto pt-6">
                    <Link
                        to={`/app/member/room/${room.roomId}`}
                        className="w-full block text-center bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors duration-300"
                    >
                        Join Room
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RoomCard;
