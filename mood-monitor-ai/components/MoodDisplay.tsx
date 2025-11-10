
import React from 'react';
import { Mood } from '../types';
import Loader from './Loader';
import { LightbulbIcon, MoodIcon } from './icons';

interface MoodDisplayProps {
  mood: Mood | null;
  suggestions: string[];
  isLoading: boolean;
  isCameraOn: boolean;
}

const MoodDisplay: React.FC<MoodDisplayProps> = ({ mood, suggestions, isLoading, isCameraOn }) => {
  return (
    <div className="w-full lg:w-2/5 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-gray-700 min-h-[300px] flex flex-col justify-between">
      <div>
        <h2 className="text-2xl font-bold text-cyan-300 mb-4">Your Mood Analysis</h2>
        <div className="flex items-center justify-center p-4 bg-gray-900/50 rounded-lg min-h-[80px]">
          {isLoading ? (
            <Loader text="Analyzing..." />
          ) : mood ? (
            <div className="text-center">
              <p className="text-lg text-gray-300">Current Mood:</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <MoodIcon mood={mood} className="text-5xl" />
                <p className="text-4xl font-semibold text-white">{mood}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">{isCameraOn ? 'Point the camera at your face.' : 'Start the camera to see your mood.'}</p>
          )}
        </div>
      </div>
      
      {suggestions.length > 0 && !isLoading && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-cyan-300 mb-3 flex items-center gap-2">
            <LightbulbIcon className="w-6 h-6" />
            Wellness Suggestions
          </h3>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            {suggestions.map((tip, index) => (
              <li key={index} className="transition-opacity duration-300 ease-in-out">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MoodDisplay;
