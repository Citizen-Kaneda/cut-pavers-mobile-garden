import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Smartphone } from 'lucide-react';

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
  const [initialOrientation, setInitialOrientation] = useState<{ alpha: number; beta: number; gamma: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const velocity = useRef({ x: 0, y: 0 });
  const orientationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);

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
    velocity.current = { x: 0, y: 0 };
    setIsDragging(true);
  }, []);

  const checkSeamlessTransition = useCallback((video: HTMLVideoElement, currentTime: number) => {
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    const threshold = 0.1; // seconds from start/end to trigger transition
    
    // Check if at beginning and should transition
    if (currentTime <= threshold && 'beginning' in config.transitions && config.transitions.beginning !== undefined) {
      const targetVideoIndex = config.transitions.beginning;
      const targetVideo = videoRefs.current[targetVideoIndex];
      if (targetVideo) {
        setCurrentVideoIndex(targetVideoIndex);
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
      const targetVideo = videoRefs.current[targetVideoIndex];
      if (targetVideo) {
        setCurrentVideoIndex(targetVideoIndex);
        // Set target video to appropriate position
        const targetConfig = videoConfig[targetVideoIndex as keyof typeof videoConfig];
        if (targetConfig.startPosition === 'middle') {
          targetVideo.currentTime = targetVideo.duration / 2;
        } else {
          targetVideo.currentTime = 0;
        }
      }
    }
  }, [currentVideoIndex]);

  const updateVideoTimeFromTilt = useCallback((tiltDegrees: number, isVertical: boolean = false) => {
    const video = videoRefs.current[currentVideoIndex];
    if (!video || !video.duration || isNaN(video.duration)) return;
    
    const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
    const isCorrectDirection = (config.scrubDirection === 'vertical') === isVertical;
    if (!isCorrectDirection) return;
    
    // Map 30 degrees of tilt to full video duration
    const maxTiltDegrees = 30;
    const clampedTilt = Math.max(-maxTiltDegrees, Math.min(maxTiltDegrees, tiltDegrees));
    const tiltProgress = (clampedTilt + maxTiltDegrees) / (maxTiltDegrees * 2); // 0 to 1
    
    const minTime = (currentVideoIndex === 0 && firstVideoIntroPlayed) ? 5 : 0;
    const maxTime = video.duration;
    const newTime = minTime + (tiltProgress * (maxTime - minTime));
    
    video.currentTime = newTime;
    
    // Don't check for seamless transitions during tilt scrubbing
    // Transitions should only happen through swipe gestures
  }, [currentVideoIndex, firstVideoIntroPlayed]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !allVideosLoaded) return;
    
    const moveTouch = e.touches[0];
    const now = Date.now();
    const deltaTime = now - touchStart.time;
    
    if (deltaTime > 0) {
      velocity.current.x = (moveTouch.clientX - touchStart.x) / deltaTime;
      velocity.current.y = (moveTouch.clientY - touchStart.y) / deltaTime;
    }
  }, [isDragging, touchStart, allVideosLoaded]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging || !allVideosLoaded) return;
    
    const endTouch = e.changedTouches[0];
    const deltaX = endTouch.clientX - touchStart.x;
    const deltaY = endTouch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    const velocityThreshold = 0.3;
    const minSwipeDistance = 50;
    const maxSwipeTime = 800;
    
    const absVelocityX = Math.abs(velocity.current.x);
    const absVelocityY = Math.abs(velocity.current.y);
    const isValidSwipeX = (deltaTime < maxSwipeTime && Math.abs(deltaX) > minSwipeDistance) || 
                          absVelocityX > velocityThreshold;
    const isValidSwipeY = (deltaTime < maxSwipeTime && Math.abs(deltaY) > minSwipeDistance) || 
                          absVelocityY > velocityThreshold;
    
    // Handle pano-0 to pano-1 vertical swipe transition
    if (currentVideoIndex === 0 && isValidSwipeY && deltaY < 0) {
      setCurrentVideoIndex(1);
      return;
    }
    
    // Handle pano-1's four-directional navigation
    if (currentVideoIndex === 1) {
      const pano1Transitions = videoConfig[1].transitions as { up: number; down: number; left: number; right: number };
      
      if (Math.abs(deltaY) > Math.abs(deltaX) && isValidSwipeY) {
        // Vertical swipe
        const direction = deltaY < 0 || velocity.current.y < -velocityThreshold;
        const targetIndex = direction ? pano1Transitions.up : pano1Transitions.down;
        setCurrentVideoIndex(targetIndex);
      } else if (Math.abs(deltaX) > Math.abs(deltaY) && isValidSwipeX) {
        // Horizontal swipe
        const direction = deltaX > 0 || velocity.current.x > velocityThreshold;
        const targetIndex = direction ? pano1Transitions.right : pano1Transitions.left;
        setCurrentVideoIndex(targetIndex);
      }
    }
    
    // Handle pano-7 horizontal swipe back to pano-1
    if (currentVideoIndex === 7 && isValidSwipeX && deltaX > 0) {
      setCurrentVideoIndex(1);
      return;
    }
    
    // Handle pano-8 horizontal swipe back to pano-1
    if (currentVideoIndex === 8 && isValidSwipeX && deltaX < 0) {
      setCurrentVideoIndex(1);
      return;
    }
    
    setIsDragging(false);
    velocity.current = { x: 0, y: 0 };
  }, [isDragging, touchStart, currentVideoIndex, allVideosLoaded]);

  // Initialize video positions when switching and reset orientation calibration
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

    // Reset orientation calibration when switching videos
    if (orientationRef.current) {
      setInitialOrientation(orientationRef.current);
    }
  }, [currentVideoIndex, allVideosLoaded]);

  const requestTiltPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        setPermissionGranted(permission === 'granted');
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    } else {
      // For non-iOS devices or when permission is not required
      setPermissionGranted(true);
    }
  }, []);

  // Request device orientation permission and setup
  useEffect(() => {
    requestTiltPermission();
  }, [requestTiltPermission]);

  // Handle device orientation
  useEffect(() => {
    if (!permissionGranted || !allVideosLoaded) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = event;
      if (alpha === null || beta === null || gamma === null) return;

      orientationRef.current = { alpha, beta, gamma };

      // Set initial orientation when first reading
      if (!initialOrientation) {
        setInitialOrientation({ alpha, beta, gamma });
        return;
      }

      const config = videoConfig[currentVideoIndex as keyof typeof videoConfig];
      
      if (config.scrubDirection === 'vertical') {
        // Use beta (front-to-back tilt) for vertical scrubbing
        const tiltDegrees = beta - initialOrientation.beta;
        updateVideoTimeFromTilt(tiltDegrees, true);
      } else if (config.scrubDirection === 'horizontal') {
        // Use gamma (left-to-right tilt) for horizontal scrubbing  
        const tiltDegrees = gamma - initialOrientation.gamma;
        updateVideoTimeFromTilt(tiltDegrees, false);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, allVideosLoaded, initialOrientation, currentVideoIndex, updateVideoTimeFromTilt]);

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
      <style>
        {`
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
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

        {/* Tilt permission button */}
        {!permissionGranted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button
              onClick={requestTiltPermission}
              className="bg-white text-black px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 text-lg font-medium animate-pulse hover:bg-gray-50 transition-colors"
              style={{
                animation: 'flash 2s infinite'
              }}
            >
              <Smartphone className="w-6 h-6" />
              Press here to enable tilt
            </button>
          </div>
        )}

        {/* Tilt to scrub instruction */}
        {permissionGranted && initialOrientation && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-black bg-white/80 px-3 py-2 rounded text-sm text-center">
            Tilt device to scrub video
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileVideoPlayer;