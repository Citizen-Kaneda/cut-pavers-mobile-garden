import React, { useRef, useEffect, useState, useCallback } from 'react';

const MobileVideoPlayer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const filmStripRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0, time: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [firstVideoIntroPlayed, setFirstVideoIntroPlayed] = useState(false);
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const [allVideosLoaded, setAllVideosLoaded] = useState(false);
  
  const lastMoveTime = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });
  const lastTouch = useRef({ x: 0, y: 0, time: 0 });

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

  // Update film strip position
  const updateFilmStripPosition = useCallback(() => {
    if (filmStripRef.current) {
      const translateY = -currentVideoIndex * 100;
      filmStripRef.current.style.transform = `translateY(${translateY}vh)`;
    }
  }, [currentVideoIndex]);

  useEffect(() => {
    updateFilmStripPosition();
  }, [currentVideoIndex, updateFilmStripPosition]);

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
  }, []);

  const updateVideoTime = useCallback((deltaX: number) => {
    const video = videoRefs.current[currentVideoIndex];
    if (!video || !video.duration || isNaN(video.duration)) return;
    
    const sensitivity = video.duration / (window.innerWidth * 1.5);
    const timeChange = deltaX * sensitivity;
    
    const minTime = (currentVideoIndex === 0 && firstVideoIntroPlayed) ? 5 : 0;
    const newTime = Math.max(minTime, Math.min(video.duration, video.currentTime + timeChange));
    
    video.currentTime = newTime;
  }, [currentVideoIndex, firstVideoIntroPlayed]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !allVideosLoaded) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const moveTouch = e.touches[0];
    const now = Date.now();
    const deltaTime = now - lastTouch.current.time;
    
    if (deltaTime > 0) {
      velocity.current.x = (moveTouch.clientX - lastTouch.current.x) / deltaTime;
      velocity.current.y = (moveTouch.clientY - lastTouch.current.y) / deltaTime;
    }
    
    const deltaX = moveTouch.clientX - touchStart.x;
    const deltaY = moveTouch.clientY - touchStart.y;
    
    if (now - lastMoveTime.current < 8) return;
    lastMoveTime.current = now;
    
    // Horizontal scrubbing
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      const incrementalDelta = moveTouch.clientX - lastTouch.current.x;
      updateVideoTime(incrementalDelta);
      
      setTouchStart(prev => ({ 
        ...prev, 
        x: moveTouch.clientX, 
        y: moveTouch.clientY 
      }));
    }
    
    lastTouch.current = { x: moveTouch.clientX, y: moveTouch.clientY, time: now };
  }, [isDragging, touchStart, updateVideoTime, allVideosLoaded]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging || !allVideosLoaded) return;
    
    const endTouch = e.changedTouches[0];
    const deltaX = endTouch.clientX - touchStart.x;
    const deltaY = endTouch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    const velocityThreshold = 0.3;
    const minSwipeDistance = 50;
    const maxSwipeTime = 800;
    
    const absVelocityY = Math.abs(velocity.current.y);
    const isValidSwipe = (deltaTime < maxSwipeTime && Math.abs(deltaY) > minSwipeDistance) || 
                        absVelocityY > velocityThreshold;
    
    // Vertical swipe for video cycling
    if (Math.abs(deltaY) > Math.abs(deltaX) && isValidSwipe) {
      const direction = deltaY < 0 || velocity.current.y < -velocityThreshold;
      
      if (direction && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else if (!direction && currentVideoIndex > 0) {
        setCurrentVideoIndex(currentVideoIndex - 1);
      }
    }
    
    setIsDragging(false);
    velocity.current = { x: 0, y: 0 };
  }, [isDragging, touchStart, currentVideoIndex, videos.length, allVideosLoaded]);

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

  // Handle video loading and first video auto-play
  const handleVideoLoaded = useCallback((index: number) => {
    setLoadedVideos(prev => {
      const newSet = new Set([...prev, index]);
      if (newSet.size === videos.length) {
        setAllVideosLoaded(true);
        console.log('All videos loaded!');
      }
      return newSet;
    });
  }, [videos.length]);

  useEffect(() => {
    if (!allVideosLoaded) return;
    
    const firstVideo = videoRefs.current[0];
    if (firstVideo && currentVideoIndex === 0) {
      const handleTimeUpdate = () => {
        if (firstVideo.currentTime >= 5) {
          firstVideo.pause();
          setFirstVideoIntroPlayed(true);
        }
      };

      firstVideo.addEventListener('timeupdate', handleTimeUpdate);
      firstVideo.currentTime = 0;
      firstVideo.play().catch(console.error);

      return () => {
        firstVideo.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [allVideosLoaded, currentVideoIndex]);

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
        {/* Film strip container */}
        <div 
          ref={filmStripRef}
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            height: `${videos.length * 100}vh`,
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          {videos.map((videoSrc, index) => (
            <div 
              key={index}
              className="w-full h-screen flex-shrink-0"
              style={{ height: '100vh' }}
            >
              <video
                ref={el => videoRefs.current[index] = el}
                src={videoSrc}
                className="w-full h-full object-contain object-top"
                muted
                playsInline
                preload="auto"
                onLoadedData={() => handleVideoLoaded(index)}
                onError={(e) => console.error(`Video ${index} error:`, e)}
                style={{ 
                  touchAction: 'none',
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden'
                }}
              />
            </div>
          ))}
        </div>
        
        {/* Loading indicator */}
        {!allVideosLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading videos... ({loadedVideos.size}/{videos.length})</p>
            </div>
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