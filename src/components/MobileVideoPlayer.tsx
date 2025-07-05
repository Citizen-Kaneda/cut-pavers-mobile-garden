import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const MobileVideoPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [firstVideoIntroPlayed, setFirstVideoIntroPlayed] = useState(false);

  const videos = [
    '/pano-0.mp4?v=3',
    '/pano-1.mp4?v=3',
    '/pano-2.mp4?v=3',
    '/pano-3.mp4?v=3', 
    '/pano-4.mp4?v=3',
    '/pano-5.mp4?v=3',
    '/pano-6.mp4?v=3',
    '/pano-7.mp4?v=3',
    '/pano-8.mp4?v=3',
    '/pano-9.mp4?v=3'
  ];

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(true);
    console.log('Touch start:', touch.clientX, touch.clientY);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !videoRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Prevent default scrolling
    e.preventDefault();
    
    // Horizontal swipe for timeline scrubbing
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const video = videoRef.current;
      if (video.duration && !isNaN(video.duration)) {
        const sensitivity = video.duration / window.innerWidth; // More responsive scrubbing
        const timeChange = deltaX * sensitivity;
        
        // For first video, prevent scrubbing back to intro once it's been played
        const minTime = (currentVideoIndex === 0 && firstVideoIntroPlayed) ? 5 : 0;
        const newTime = Math.max(minTime, Math.min(video.duration, video.currentTime + timeChange));
        
        video.currentTime = newTime;
        console.log('Scrubbing to:', newTime, 'delta:', deltaX);
      }
      // Update touch start for continuous scrubbing
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [isDragging, touchStart, currentVideoIndex, firstVideoIntroPlayed]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    console.log('Touch end - deltaX:', deltaX, 'deltaY:', deltaY);
    
    // Vertical swipe for video cycling (only if not scrubbing)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      if (deltaY < 0 && currentVideoIndex < videos.length - 1) {
        // Swipe up - next video
        setCurrentVideoIndex(prev => prev + 1);
        console.log('Next video');
      } else if (deltaY > 0 && currentVideoIndex > 0) {
        // Swipe down - previous video
        setCurrentVideoIndex(prev => prev - 1);
        console.log('Previous video');
      }
    }
    
    setIsDragging(false);
  }, [isDragging, touchStart, currentVideoIndex, videos.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Auto-play first video and pause at 5 seconds
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (currentVideoIndex === 0 && video.currentTime >= 5) {
        video.pause();
        setFirstVideoIntroPlayed(true);
      }
    };

    const handleLoadedData = () => {
      console.log('Video loaded:', videos[currentVideoIndex]);
      // Start first video automatically
      if (currentVideoIndex === 0) {
        video.currentTime = 0;
        video.play().catch((error) => {
          console.error('Auto-play failed:', error);
        });
      }
    };

    const handleError = (e: any) => {
      console.error('Video error:', e, 'for video:', videos[currentVideoIndex]);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, [currentVideoIndex, videos]);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#e0e1b9' }}>
      <div 
        ref={containerRef}
        className="relative w-full h-screen overflow-hidden"
      >
        <video
          ref={videoRef}
          src={videos[currentVideoIndex]}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ touchAction: 'none' }}
        />
        
        {/* Video indicator */}
        <div className="absolute top-4 left-4 text-black bg-white/80 px-2 py-1 rounded text-sm">
          {currentVideoIndex + 1} / {videos.length}
        </div>
      </div>
    </div>
  );
};

export default MobileVideoPlayer;