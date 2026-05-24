import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  mediaUrl: string;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ mediaUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(mediaUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Try loading audio metadata
    audio.load();

    // Check duration periodically if it's Infinity initially (common for dynamic Base64 chunks)
    const checkDurationInterval = setInterval(() => {
      if (audio.duration && audio.duration !== Infinity && duration === 0) {
        setDuration(audio.duration);
        clearInterval(checkDurationInterval);
      }
    }, 400);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      clearInterval(checkDurationInterval);
    };
  }, [mediaUrl]);

  // Handle speed changes cleanly
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.warn("Playback blocked by browser audio policy or incomplete stream:", err);
        });
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const value = parseFloat(e.target.value);
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const toggleSpeed = () => {
    setPlaybackRate(prev => {
      if (prev === 1) return 1.5;
      if (prev === 1.5) return 2;
      return 1;
    });
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Generate visual representations for progress tracking
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 w-full bg-black/5 dark:bg-black/10 p-2.5 rounded-lg border border-black/5 select-none my-1">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          type="button"
          className="w-9 h-9 rounded-full bg-emerald-550 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 cursor-pointer shadow transition-all active:scale-95"
          title={isPlaying ? "Pausar" : "Reproducir nota de voz"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current text-white" />
          ) : (
            <Play className="w-4 h-4 fill-current text-white ml-0.5" />
          )}
        </button>

        {/* Custom Progress Scrubber Channel */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="relative flex items-center h-4 w-full">
            {/* Native slider configured on top of standard styling */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.05}
              value={currentTime}
              onChange={handleSliderChange}
              className="w-full accent-emerald-600 h-1.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/30 cursor-pointer outline-none appearance-none"
              style={{
                background: `linear-gradient(to right, #059669 0%, #059669 ${percentage}%, #cbd5e1 ${percentage}%, #cbd5e1 100%)`
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '0:15'}</span>
          </div>
        </div>

        {/* Fast Play Rate Button */}
        <button
          onClick={toggleSpeed}
          type="button"
          className="text-[10px] font-bold bg-slate-200 hover:bg-slate-250 text-slate-700 px-2 py-1 rounded-md transition-all cursor-pointer font-sans shrink-0 min-w-8 text-center"
          title="Velocidad de reproducción"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
};
