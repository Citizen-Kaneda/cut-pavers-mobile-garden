import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const MobileVideoPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, time: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [firstVideoIntroPlayed, setFirstVideoIntroPlayed] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set([0]));
  const lastMoveTime = useRef(0);
  const animationFrame = useRef<number>();
  const velocity = useRef({ x: 0, y: 0 });
  const lastTouch = useRef({ x: 0, y: 0, time: 0 });
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const prevVideoRef = useRef<HTMLVideoElement>(null);

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
    const startTouch = e.touches[0];
    const now = Date.now();
    
    setTouchStart({ 
      x: startTouch.clientX, 
      y: startTouch.clientY, 
      time: now 
    });
    lastTouch.current = { x: startTouch.clientX, y: startTouch.clientY, time: now };
    velocity.current = { x: 0, y: 0 };
    setIsDragging(true);
    
    // Cancel any ongoing animation
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
  }, []);

  const updateVideoTime = useCallback((deltaX: number, smooth = true) => {
    const video = videoRef.current;
    if (!video || !video.duration || isNaN(video.duration)) return;
    
    // Ultra responsive scrubbing
    const sensitivity = video.duration / (window.innerWidth * 1.5);
    const timeChange = deltaX * sensitivity;
    
    // For first video, prevent scrubbing back to intro once it's been played
    const minTime = (currentVideoIndex === 0 && firstVideoIntroPlayed) ? 5 : 0;
    const newTime = Math.max(minTime, Math.min(video.duration, video.currentTime + timeChange));
    
    if (smooth) {
      // Use requestAnimationFrame for ultra-smooth updates
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      animationFrame.current = requestAnimationFrame(() => {
        video.currentTime = newTime;
      });
    } else {
      video.currentTime = newTime;
    }
  }, [currentVideoIndex, firstVideoIntroPlayed]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !videoRef.current) return;
    
    // Prevent all scrolling and zooming
    e.preventDefault();
    e.stopPropagation();
    
    const moveTouch = e.touches[0];
    const now = Date.now();
    const deltaTime = now - lastTouch.current.time;
    
    // Calculate velocity for smoother interactions
    if (deltaTime > 0) {
      velocity.current.x = (moveTouch.clientX - lastTouch.current.x) / deltaTime;
      velocity.current.y = (moveTouch.clientY - lastTouch.current.y) / deltaTime;
    }
    
    const deltaX = moveTouch.clientX - touchStart.x;
    const deltaY = moveTouch.clientY - touchStart.y;
    
    // Reduced throttling for ultra-smooth response
    if (now - lastMoveTime.current < 8) return; // ~120fps
    lastMoveTime.current = now;
    
    // Immediate horizontal scrubbing detection
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      const incrementalDelta = moveTouch.clientX - lastTouch.current.x;
      updateVideoTime(incrementalDelta);
      
      // Update references for next frame
      setTouchStart(prev => ({ 
        ...prev, 
        x: moveTouch.clientX, 
        y: moveTouch.clientY 
      }));
    }
    
    lastTouch.current = { x: moveTouch.clientX, y: moveTouch.clientY, time: now };
  }, [isDragging, touchStart, updateVideoTime]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    const endTouch = e.changedTouches[0];
    const deltaX = endTouch.clientX - touchStart.x;
    const deltaY = endTouch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // Clean up animation frame
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    // More sensitive gesture detection with velocity consideration
    const velocityThreshold = 0.3;
    const minSwipeDistance = 50; // Reduced for better sensitivity
    const maxSwipeTime = 800; // Increased for more forgiving gestures
    
    const absVelocityY = Math.abs(velocity.current.y);
    const isValidSwipe = (deltaTime < maxSwipeTime && Math.abs(deltaY) > minSwipeDistance) || 
                        absVelocityY > velocityThreshold;
    
    // Vertical swipe for video cycling
    if (Math.abs(deltaY) > Math.abs(deltaX) && isValidSwipe) {
      const direction = deltaY < 0 || velocity.current.y < -velocityThreshold;
      
      if (direction && currentVideoIndex < videos.length - 1 && loadedVideos.has(currentVideoIndex + 1)) {
        // Swipe up or fast upward velocity - next video (only if loaded)
        setIsAnimating(true);
        setSlideOffset(-100);
        setTimeout(() => {
          setCurrentVideoIndex(currentVideoIndex + 1);
          setSlideOffset(0);
          setIsAnimating(false);
        }, 300);
      } else if (!direction && currentVideoIndex > 0 && loadedVideos.has(currentVideoIndex - 1)) {
        // Swipe down or fast downward velocity - previous video (only if loaded)
        setIsAnimating(true);
        setSlideOffset(100);
        setTimeout(() => {
          setCurrentVideoIndex(currentVideoIndex - 1);
          setSlideOffset(0);
          setIsAnimating(false);
        }, 300);
      }
    }
    
    setIsDragging(false);
    velocity.current = { x: 0, y: 0 };
  }, [isDragging, touchStart, currentVideoIndex, videos.length, loadedVideos]);

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
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden'
        }}
      >
        {/* Current video container with sliding animation */}
        <div 
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            transform: `translateY(${slideOffset}%)`,
            visibility: 'visible',
            zIndex: 10
          }}
        >
          <video
            ref={videoRef}
            src={videos[currentVideoIndex]}
            className="w-full h-full object-contain object-top"
            muted
            playsInline
            preload="auto"
            style={{ 
              touchAction: 'none',
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          />
        </div>
        
        {/* Next video - always preloaded but hidden */}
        {currentVideoIndex < videos.length - 1 && (
          <div 
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{
              transform: isAnimating && slideOffset < 0 
                ? `translateY(${100 + slideOffset}%)` 
                : 'translateY(100%)',
              opacity: isAnimating && slideOffset < 0 ? 1 : 0,
              zIndex: isAnimating && slideOffset < 0 ? 15 : 5,
              pointerEvents: isAnimating && slideOffset < 0 ? 'auto' : 'none'
            }}
          >
            <video
              ref={nextVideoRef}
              src={videos[currentVideoIndex + 1]}
              className="w-full h-full object-contain object-top"
              muted
              playsInline
              preload="auto"
              onLoadedData={() => {
                setLoadedVideos(prev => new Set([...prev, currentVideoIndex + 1]));
                console.log('Next video loaded:', currentVideoIndex + 1);
              }}
              style={{ 
                touchAction: 'none',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
          </div>
        )}
        
        {/* Previous video - always preloaded but hidden */}
        {currentVideoIndex > 0 && (
          <div 
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{
              transform: isAnimating && slideOffset > 0 
                ? `translateY(${-100 + slideOffset}%)` 
                : 'translateY(-100%)',
              opacity: isAnimating && slideOffset > 0 ? 1 : 0,
              zIndex: isAnimating && slideOffset > 0 ? 15 : 5,
              pointerEvents: isAnimating && slideOffset > 0 ? 'auto' : 'none'
            }}
          >
            <video
              ref={prevVideoRef}
              src={videos[currentVideoIndex - 1]}
              className="w-full h-full object-contain object-top"
              muted
              playsInline
              preload="auto"
              onLoadedData={() => {
                setLoadedVideos(prev => new Set([...prev, currentVideoIndex - 1]));
                console.log('Previous video loaded:', currentVideoIndex - 1);
              }}
              style={{ 
                touchAction: 'none',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
          </div>
        )}
        
        {/* Video indicator */}
        <div className="absolute top-4 left-4 text-black bg-white/80 px-2 py-1 rounded text-sm">
          {currentVideoIndex + 1} / {videos.length}
        </div>
      </div>
    </div>
  );
};

export default MobileVideoPlayer;