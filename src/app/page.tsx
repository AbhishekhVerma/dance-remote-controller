import Link from 'next/link';
import { MonitorPlay, Smartphone } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-zinc-950 text-white">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dance Remote</h1>
          <p className="text-zinc-400">Control your practice videos from anywhere in the room.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Link 
            href="/display" 
            className="flex items-center p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-blue-500 hover:bg-zinc-800/50 transition-all group"
          >
            <div className="p-4 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <MonitorPlay size={32} />
            </div>
            <div className="ml-6 text-left">
              <h2 className="text-xl font-semibold mb-1">Host Display</h2>
              <p className="text-sm text-zinc-400">Select this on the laptop showing the video.</p>
            </div>
          </Link>

          <Link 
            href="/remote" 
            className="flex items-center p-6 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-green-500 hover:bg-zinc-800/50 transition-all group"
          >
            <div className="p-4 bg-green-500/10 text-green-500 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
              <Smartphone size={32} />
            </div>
            <div className="ml-6 text-left">
              <h2 className="text-xl font-semibold mb-1">Remote Control</h2>
              <p className="text-sm text-zinc-400">Select this on your phone to control the video.</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
