import React from 'react';

const RoomCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
             <div className="flex items-center mb-4">
                <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="ml-2 h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="flex items-center text-gray-500 mt-4">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mr-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="mt-auto pt-6">
                <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
        </div>
    );
};

export default RoomCardSkeleton;
