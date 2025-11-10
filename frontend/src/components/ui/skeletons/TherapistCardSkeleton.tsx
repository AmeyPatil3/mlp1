import React from 'react';

const TherapistCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="w-full h-56 bg-gray-200 animate-pulse"></div>
            <div className="p-6 flex flex-col flex-grow">
                <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="flex flex-wrap gap-2 mb-4">
                    <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="mt-auto pt-6">
                    <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default TherapistCardSkeleton;
