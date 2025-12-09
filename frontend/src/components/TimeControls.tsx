"use client";

import React from 'react';

interface TimeControlsProps {
    currentDate: string;
    minDate: string;
    maxDate: string;
    onDateChange: (date: string) => void;
    onNextDay: () => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

const TimeControls: React.FC<TimeControlsProps> = ({
    currentDate,
    minDate,
    maxDate,
    onDateChange,
    onNextDay,
    isPlaying,
    onTogglePlay
}) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <label className="font-bold text-gray-700">Simulation Date:</label>
                <input
                    type="date"
                    value={currentDate}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <button
                    onClick={onNextDay}
                    disabled={isPlaying}
                    className="flex-1 md:flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium disabled:opacity-50"
                >
                    Next Day
                </button>
                <button
                    onClick={onTogglePlay}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-md font-bold text-white transition-colors ${isPlaying
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                >
                    {isPlaying ? 'Pause' : 'Auto Play'}
                </button>
            </div>
        </div>
    );
};

export default TimeControls;
