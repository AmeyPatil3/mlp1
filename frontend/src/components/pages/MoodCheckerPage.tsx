import React from 'react';

const MoodCheckerPage: React.FC = () => {
    const aiUrl = import.meta.env.VITE_MOOD_AI_URL as string | undefined;

    return (
        <div className="h-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Mood Checker</h1>
                <p className="mt-2 text-gray-600">
                    This opens the standalone Mood Monitor AI experience. Start its server and we’ll embed it here.
                </p>
            </div>

            {!aiUrl ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
                    <p className="font-medium">Configuration needed</p>
                    <p className="text-sm mt-1">
                        Set <code className="font-mono">VITE_MOOD_AI_URL</code> in your environment to embed the Mood Monitor AI app.
                        For example: <code className="font-mono">http://localhost:7860</code>.
                    </p>
                </div>
            ) : (
                <div className="w-full h-[70vh] md:h-[78vh] bg-white rounded-xl shadow overflow-hidden">
                    <iframe
                        src={aiUrl}
                        title="Mood Monitor AI"
                        className="w-full h-full"
                        allow="camera; microphone; clipboard-read; clipboard-write"
                    />
                </div>
            )}
        </div>
    );
};

export default MoodCheckerPage;


