import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="h-[100vh] w-[100vw] flex justify-center items-center">
      <Loader2 className='animate-spin' />
    </div>
  );
};

export default LoadingScreen;