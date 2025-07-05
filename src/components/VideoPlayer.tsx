import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoSrc: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoSrc, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
  const [showSwipePrompt, setShowSwipePrompt] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!hasPlayedIntro && video.currentTime >= 5) {
        video.pause();
        setHasPlayedIntro(true);
        startInactivityTimer();
      }
    };

    const handleSeeking = () => {
      if (hasPlayedIntro && video.currentTime < 5) {
        video.currentTime = 5;
      }
      resetInactivityTimer();
    };

    const handleInteraction = () => {
      resetInactivityTimer();
      setShowSwipePrompt(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('touchstart', handleInteraction);
    video.addEventListener('mousedown', handleInteraction);

    // Auto-play intro on mount
    if (!hasPlayedIntro) {
      video.currentTime = 0;
      video.play().catch(console.error);
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('touchstart', handleInteraction);
      video.removeEventListener('mousedown', handleInteraction);
    };
  }, [hasPlayedIntro]);

  const startInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    const timer = setTimeout(() => {
      setShowSwipePrompt(true);
    }, 3000); // Show after 3 seconds of inactivity
    setInactivityTimer(timer);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }
    startInactivityTimer();
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-cover"
        controls={hasPlayedIntro}
        muted
        playsInline
      />
      
      {showSwipePrompt && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white text-4xl font-bold animate-pulse bg-black/50 px-6 py-3 rounded-lg">
            SWIPE
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;