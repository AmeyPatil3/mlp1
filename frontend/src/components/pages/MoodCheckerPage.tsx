import React from 'react';
import MoodApp from '../../mood/MoodApp';

const MoodCheckerPage: React.FC = () => {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-900">Mood Monitor AI</h1>
                <p className="mt-2 text-lg text-gray-600">
                    Real-time AI-powered facial expression analysis and suggestions for your well-being.
                </p>
            </div>

            <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <MoodApp />
            </div>
        </div>
    );
};

export default MoodCheckerPage;


