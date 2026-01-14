import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 w-full h-full min-h-[300px]">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-purple-500 border-b-transparent border-l-transparent animate-spin"></div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-slate-800 animate-pulse">Analyzing Document...</h3>
        <p className="text-sm text-slate-500">Extracting structured insights with Gemini</p>
      </div>
    </div>
  );
};