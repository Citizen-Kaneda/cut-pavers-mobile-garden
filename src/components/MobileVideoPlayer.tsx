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
  const [boundaryHit, setBoundaryHit] = useState<{ direction: 'up' | 'down' | 'left' | 'right' | null; targetIndex: number | null }>({ direction: null, targetIndex: null });
  
  const lastMoveTime = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });
  const lastTouch = useRef({ x: 0, y: 0, time: 0 });

  const videos = [
    '/pano-0.mp4',
    '/pano-1.mp4',
    '/pano-2.mp4',
    '/pano-3.mp4', 
    '/pano-4.mp4',
    '/pano-5.mp4',
    '/pano-6.mp4',
    '/pano-7.mp4',
    '/pano-8.mp4'
  ];

  // Video configuration for navigation and scrubbing
  const videoConfig = {
    0: { 
      scrubDirection: 'vertical', 
      startPosition: 'beginning',
      transitions: { end: 1 }
    },
    1: { 
      scrubDirection: 'horizontal', 
      startPosition: 'middle',
      transitions: { up: 0, down: 2, left: 7, right: 8 },
      transitionPositions: { up: 'end' }
    },
    2: { 
      scrubDirection: 'vertical', 
      startPosition: 'beginning',
      transitions: { beginning: 1, end: 3 }
    },
    3: { 
      scrubDirection: 'vertical', 
      startPosition: 'beginning',
      transitions: { beginning: 2, end: 4 }
    },
    4: { 
      scrubDirection: 'vertical', 
      startPosition: 'beginning',
      transitions: { beginning: 3, end: 5 }
    },
    5: { 
      scrubDirection: 'vertical', 
      startPosition: 'beginning',
      transitions: { beginning: 4, end: 6 }
    },
    6: { 
      scrubDirection: 'vertical', 
      startPosition: 'beginning',
      transitions: {}
    },
    7: { 
      scrubDirection: 'horizontal', 
      startPosition: 'beginning',
      transitions: { beginning: 1 }
    },
    8: { 
      scrubDirection: 'horizontal', 
      startPosition: 'end',
      transitions: { beginning: 1 }
    }
  };

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

  const checkSeamlessTransition = useCallback((video: HTMLVideoElement, currentTime: number) => {
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    const threshold = 0.1; // seconds from start/end to trigger transition
    
    // Check if at beginning and should transition
    if (currentTime <= threshold && 'beginning' in config.transitions && config.transitions.beginning !== undefined) {
      const targetVideoIndex = config.transitions.beginning;
      
      // If this is the first approach to boundary, bounce back and show prompt
      if (boundaryHit.direction !== 'up' || boundaryHit.targetIndex !== targetVideoIndex) {
        video.currentTime = Math.min(video.duration, currentTime + 0.2); // Bounce back 2 frames
        video.pause();
        setBoundaryHit({ direction: 'up', targetIndex: targetVideoIndex });
        return;
      }
      
      // Second approach - make the transition
      const targetVideo = videoRefs.current[targetVideoIndex];
      if (targetVideo) {
        setCurrentVideoIndex(targetVideoIndex);
        setBoundaryHit({ direction: null, targetIndex: null });
        // Set target video to appropriate position
        const targetConfig = videoConfig[targetVideoIndex as keyof typeof videoConfig];
        if (targetConfig.startPosition === 'end') {
          targetVideo.currentTime = targetVideo.duration - threshold;
        } else if (targetConfig.startPosition === 'middle') {
          targetVideo.currentTime = targetVideo.duration / 2;
        }
      }
    }
    
    // Check if at end and should transition
    if (currentTime >= video.duration - threshold && 'end' in config.transitions && config.transitions.end !== undefined) {
      const targetVideoIndex = config.transitions.end;
      
      // If this is the first approach to boundary, bounce back and show prompt
      if (boundaryHit.direction !== 'down' || boundaryHit.targetIndex !== targetVideoIndex) {
        video.currentTime = Math.max(0, currentTime - 0.2); // Bounce back 2 frames
        video.pause();
        setBoundaryHit({ direction: 'down', targetIndex: targetVideoIndex });
        return;
      }
      
      // Second approach - make the transition
      const targetVideo = videoRefs.current[targetVideoIndex];
      if (targetVideo) {
        setCurrentVideoIndex(targetVideoIndex);
        setBoundaryHit({ direction: null, targetIndex: null });
        // Set target video to appropriate position
        const targetConfig = videoConfig[targetVideoIndex as keyof typeof videoConfig];
        if (targetConfig.startPosition === 'middle') {
          targetVideo.currentTime = targetVideo.duration / 2;
        } else {
          targetVideo.currentTime = 0;
        }
      }
    }
  }, [currentVideoIndex, boundaryHit]);

  const updateVideoTime = useCallback((delta: number, isVertical: boolean = false) => {
    const video = videoRefs.current[currentVideoIndex];
    if (!video || !video.duration || isNaN(video.duration)) return;
    
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    const isCorrectDirection = (config.scrubDirection === 'vertical') === isVertical;
    if (!isCorrectDirection) return;
    
    const screenSize = isVertical ? window.innerHeight : window.innerWidth;
    const sensitivity = video.duration / (screenSize * 1.5);
    const timeChange = delta * sensitivity;
    
    const minTime = (currentVideoIndex === 0 && firstVideoIntroPlayed) ? 5 : 0;
    const newTime = Math.max(minTime, Math.min(video.duration, video.currentTime + timeChange));
    
    video.currentTime = newTime;
    
    // Check for seamless transitions at video boundaries
    checkSeamlessTransition(video, newTime);
  }, [currentVideoIndex, firstVideoIntroPlayed, checkSeamlessTransition]);

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
    
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    
    // Handle scrubbing based on video configuration
    if (config.scrubDirection === 'horizontal' && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      const incrementalDelta = moveTouch.clientX - lastTouch.current.x;
      updateVideoTime(incrementalDelta, false);
      
      setTouchStart(prev => ({ 
        ...prev, 
        x: moveTouch.clientX, 
        y: moveTouch.clientY 
      }));
    } else if (config.scrubDirection === 'vertical' && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 5) {
      const incrementalDelta = moveTouch.clientY - lastTouch.current.y;
      updateVideoTime(-incrementalDelta, true); // Negative for natural up/down feel
      
      setTouchStart(prev => ({ 
        ...prev, 
        x: moveTouch.clientX, 
        y: moveTouch.clientY 
      }));
    }
    
    lastTouch.current = { x: moveTouch.clientX, y: moveTouch.clientY, time: now };
  }, [isDragging, touchStart, updateVideoTime, allVideosLoaded, currentVideoIndex]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    velocity.current = { x: 0, y: 0 };
  }, []);

  // Handle navigation button clicks
  const handleNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!allVideosLoaded) return;
    
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    let targetIndex: number | undefined;
    
    switch (direction) {
      case 'up':
        if (currentVideoIndex === 1) {
          targetIndex = (config.transitions as any).up;
        } else if (currentVideoIndex > 0) {
          targetIndex = currentVideoIndex - 1;
        }
        break;
      case 'down':
        if (currentVideoIndex === 1) {
          targetIndex = (config.transitions as any).down;
        } else if (currentVideoIndex < videos.length - 1) {
          targetIndex = currentVideoIndex + 1;
        }
        break;
      case 'left':
        if (currentVideoIndex === 1) {
          targetIndex = (config.transitions as any).left;
        }
        break;
      case 'right':
        if (currentVideoIndex === 1) {
          targetIndex = (config.transitions as any).right;
        }
        break;
    }
    
    if (targetIndex !== undefined) {
      setCurrentVideoIndex(targetIndex);
      setBoundaryHit({ direction: null, targetIndex: null });
      
      // Set target video to appropriate position
      const targetVideo = videoRefs.current[targetIndex];
      const targetConfig = videoConfig[targetIndex as keyof typeof videoConfig];
      if (targetVideo) {
        if (targetConfig.startPosition === 'middle') {
          targetVideo.currentTime = targetVideo.duration / 2;
        } else if (targetConfig.startPosition === 'end') {
          targetVideo.currentTime = targetVideo.duration - 0.1;
        } else {
          targetVideo.currentTime = 0;
        }
      }
    }
  }, [currentVideoIndex, allVideosLoaded, videos.length]);

  // Get navigation arrows for current video
  const getNavigationArrows = useCallback(() => {
    const arrows = [];
    
    switch (currentVideoIndex) {
      case 0: // pano-0: 1 arrow (down to pano-1)
        arrows.push({ direction: 'down' as const, targetIndex: 1 });
        break;
      case 1: // pano-1: 4 arrows
        arrows.push(
          { direction: 'up' as const, targetIndex: 0 },
          { direction: 'down' as const, targetIndex: 2 },
          { direction: 'left' as const, targetIndex: 7 },
          { direction: 'right' as const, targetIndex: 8 }
        );
        break;
      case 2: // pano-2: 2 arrows (up/down)
        arrows.push(
          { direction: 'up' as const, targetIndex: 1 },
          { direction: 'down' as const, targetIndex: 3 }
        );
        break;
      case 3: // pano-3: 2 arrows (up/down)
        arrows.push(
          { direction: 'up' as const, targetIndex: 2 },
          { direction: 'down' as const, targetIndex: 4 }
        );
        break;
      case 4: // pano-4: 2 arrows (up/down)
        arrows.push(
          { direction: 'up' as const, targetIndex: 3 },
          { direction: 'down' as const, targetIndex: 5 }
        );
        break;
      case 5: // pano-5: 2 arrows (up/down)
        arrows.push(
          { direction: 'up' as const, targetIndex: 4 },
          { direction: 'down' as const, targetIndex: 6 }
        );
        break;
      case 7: // pano-7: 1 arrow (right to pano-1)
        arrows.push({ direction: 'right' as const, targetIndex: 1 });
        break;
      case 8: // pano-8: 1 arrow (left to pano-1)
        arrows.push({ direction: 'left' as const, targetIndex: 1 });
        break;
    }
    
    return arrows;
  }, [currentVideoIndex]);

  // Get arrow position styles
  const getArrowPosition = (direction: 'up' | 'down' | 'left' | 'right') => {
    const offset = '144px';
    switch (direction) {
      case 'up':
        return { top: offset, left: '50%', transform: 'translateX(-50%)', rotate: '0deg' };
      case 'down':
        return { bottom: offset, left: '50%', transform: 'translateX(-50%)', rotate: '180deg' };
      case 'left':
        return { left: offset, top: '50%', transform: 'translateY(-50%)', rotate: '-90deg' };
      case 'right':
        return { right: offset, top: '50%', transform: 'translateY(-50%)', rotate: '90deg' };
    }
  };

  // Initialize video positions when switching
  useEffect(() => {
    if (!allVideosLoaded) return;
    
    const video = videoRefs.current[currentVideoIndex];
    if (!video || !video.duration) return;
    
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    
    // Set initial position based on config
    if (config.startPosition === 'middle') {
      video.currentTime = video.duration / 2;
    } else if (config.startPosition === 'end') {
      video.currentTime = video.duration - 0.1;
    } else {
      video.currentTime = 0;
    }
  }, [currentVideoIndex, allVideosLoaded]);

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
        
        {/* Navigation arrows */}
        {allVideosLoaded && getNavigationArrows().map(({ direction, targetIndex }) => {
          const position = getArrowPosition(direction);
          return (
            <button
              key={direction}
              onClick={() => handleNavigation(direction)}
              className="absolute text-white animate-pulse hover:scale-110 transition-transform"
              style={{
                ...position,
                fontSize: direction === 'up' || direction === 'down' ? '99px' : '33px',
                lineHeight: '1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ▲
            </button>
          );
        })}
        
        {/* Scrub direction indicators */}
        {allVideosLoaded && (
          <>
            {videoConfig[currentVideoIndex as keyof typeof videoConfig].scrubDirection === 'vertical' && (
              <>
                <div 
                  className="absolute text-white/50 animate-pulse pointer-events-none"
                  style={{
                    top: '33.33%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '20px',
                    width: '60px',
                    height: '4px',
                    background: 'white',
                    clipPath: 'polygon(0 40%, 100% 40%, 90% 0%, 100% 60%, 0% 60%, 10% 100%)'
                  }}
                />
                <div 
                  className="absolute text-white/50 animate-pulse pointer-events-none"
                  style={{
                    bottom: '33.33%',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(180deg)',
                    fontSize: '20px',
                    width: '60px',
                    height: '4px',
                    background: 'white',
                    clipPath: 'polygon(0 40%, 100% 40%, 90% 0%, 100% 60%, 0% 60%, 10% 100%)'
                  }}
                />
              </>
            )}
            {videoConfig[currentVideoIndex as keyof typeof videoConfig].scrubDirection === 'horizontal' && (
              <>
                <div 
                  className="absolute text-white/50 animate-pulse pointer-events-none"
                  style={{
                    left: '33.33%',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(-90deg)',
                    fontSize: '20px',
                    width: '60px',
                    height: '4px',
                    background: 'white',
                    clipPath: 'polygon(0 40%, 100% 40%, 90% 0%, 100% 60%, 0% 60%, 10% 100%)'
                  }}
                />
                <div 
                  className="absolute text-white/50 animate-pulse pointer-events-none"
                  style={{
                    right: '33.33%',
                    top: '50%',
                    transform: 'translateY(-50%) rotate(90deg)',
                    fontSize: '20px',
                    width: '60px',
                    height: '4px',
                    background: 'white',
                    clipPath: 'polygon(0 40%, 100% 40%, 90% 0%, 100% 60%, 0% 60%, 10% 100%)'
                  }}
                />
              </>
            )}
          </>
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