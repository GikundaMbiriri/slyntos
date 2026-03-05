import React, { useState, useEffect } from 'react';
import { play, stop, setTempo, BeatStyle } from '../services/beatService';
import SlyntosLogo from './icons/SlyntosLogo';
import PlayIcon from './icons/PlayIcon';
import StopIcon from './icons/StopIcon';

const BeatMakerPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempoState] = useState(120);
  const [style, setStyle] = useState<BeatStyle>('hiphop');

  useEffect(() => {
    // Cleanup function to stop the beat when the component unmounts
    return () => {
      stop();
    };
  }, []);

  const handlePlayToggle = () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
    } else {
      play(style, tempo);
      setIsPlaying(true);
    }
  };

  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTempo = parseInt(e.target.value, 10);
    setTempoState(newTempo);
    // Directly update tempo in service if playing
    if (isPlaying) {
      setTempo(newTempo);
    }
  };
  
  // Effect to handle tempo changes while playing
  useEffect(() => {
    if (isPlaying) {
      play(style, tempo);
    }
  }, [tempo, isPlaying, style]);


  const handleStyleChange = (newStyle: BeatStyle) => {
    setStyle(newStyle);
    if (isPlaying) {
      play(newStyle, tempo);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center bg-slate-800 rounded-lg overflow-hidden border border-slate-700/50 text-slate-200 p-4 sm:p-8">
      <div className="w-full max-w-md text-center">
        <div className="relative mb-8">
          <div 
            className={`w-40 h-40 mx-auto transition-transform duration-150 ${isPlaying ? 'animate-pulse' : ''}`}
            style={{ animationDuration: `${(60 / tempo) * 2}s` }}
          >
            <SlyntosLogo />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">Beat Maker</h1>
        <p className="text-slate-400 mb-8">Create simple drum loops. Pro feature.</p>

        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 space-y-6">
          {/* Style Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Style</label>
            <div className="flex justify-center gap-2">
              {(['hiphop', 'rock', 'electronic'] as BeatStyle[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStyleChange(s)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors capitalize ${
                    style === s ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tempo Slider */}
          <div>
            <label htmlFor="tempo" className="block text-sm font-medium text-slate-400 mb-2">
              Tempo: <span className="font-bold text-white">{tempo}</span> BPM
            </label>
            <input
              id="tempo"
              type="range"
              min="60"
              max="180"
              value={tempo}
              onChange={handleTempoChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Play/Stop Button */}
          <button
            onClick={handlePlayToggle}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity"
          >
            {isPlaying ? <StopIcon className="w-10 h-10" /> : <PlayIcon className="w-10 h-10 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BeatMakerPage;