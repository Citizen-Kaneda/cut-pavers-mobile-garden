import VideoPlayer from '@/components/VideoPlayer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <VideoPlayer 
        videoSrc="/pano-2.mp4" 
        className="w-full h-screen"
      />
    </div>
  );
};

export default Index;
