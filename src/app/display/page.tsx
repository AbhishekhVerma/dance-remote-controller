"use client";

import { useEffect, useRef, useState } from 'react';
import type Peer from 'peerjs';
import ReactPlayer from 'react-player';
import { RemoteCommand } from '../../types';
import { FileVideo, Link as LinkIcon, Play, Pause, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function DisplayPage() {
  const [peerId, setPeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.8);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  
  const playerRef = useRef<ReactPlayer>(null);
  const peerRef = useRef<Peer | null>(null);

  // Initialize PeerJS
  useEffect(() => {
    let active = true;
    const id = Math.floor(1000 + Math.random() * 9000).toString();

    const initPeer = async () => {
      try {
        const { default: PeerJS } = await import('peerjs');
        if (!active) return;

        const peer = new PeerJS(id);
        
        peer.on('open', (id) => {
          if (!active) return;
          setPeerId(id);
          setConnectionStatus('Waiting for remote connection...');
        });

        peer.on('connection', (conn) => {
          if (!active) return;
          setConnectionStatus('Remote connected!');
          
          conn.on('data', (data) => {
            const command = data as RemoteCommand;
            handleCommand(command);
          });

          conn.on('close', () => {
            setConnectionStatus('Remote disconnected. Waiting for connection...');
          });
        });

        peer.on('error', (err) => {
          if (!active) return;
          console.error(err);
          if (err.type === 'unavailable-id') {
             setConnectionStatus('Error: ID collision. Please refresh.');
          } else {
             setConnectionStatus('Connection error. Check console.');
          }
        });

        peerRef.current = peer;
      } catch (err: any) {
        console.error(err);
        if (active) setConnectionStatus(`Fatal Init Error: ${err.message}`);
      }
    };

    initPeer();

    return () => {
      active = false;
      peerRef.current?.destroy();
    };
  }, []);

  const nativeVideoRef = useRef<HTMLVideoElement>(null);

  const [lastCommand, setLastCommand] = useState<string>('None');
  const [cmdQueue, setCmdQueue] = useState<{ cmd: RemoteCommand, timestamp: number } | null>(null);

  const seekTo = (time: number) => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = time;
    } else if (playerRef.current) {
      playerRef.current.seekTo(time, 'seconds');
    }
  };

  const getCurrentTime = () => {
    if (nativeVideoRef.current) {
      return nativeVideoRef.current.currentTime;
    } else if (playerRef.current) {
      return playerRef.current.getCurrentTime();
    }
    return 0;
  };

  const handleCommand = (cmd: RemoteCommand) => {
    // Instead of executing here (which can suffer from stale closures or missing refs),
    // we put it in state and let a useEffect handle it with fresh refs!
    setCmdQueue({ cmd, timestamp: Date.now() });
  };

  // Process incoming commands with guaranteed fresh state and refs
  useEffect(() => {
    if (!cmdQueue) return;
    const { cmd } = cmdQueue;
    setLastCommand(cmd.type);

    switch (cmd.type) {
      case 'PLAY':
        setIsPlaying(true);
        break;
      case 'PAUSE':
        setIsPlaying(false);
        break;
      case 'TOGGLE_PLAY':
        setIsPlaying(prev => !prev);
        break;
      case 'SEEK':
        seekTo(cmd.payload as number);
        break;
      case 'SEEK_RELATIVE':
        seekTo(getCurrentTime() + (cmd.payload as number));
        break;
      case 'SET_SPEED':
        setPlaybackRate(cmd.payload as number);
        break;
      case 'CHANGE_SPEED':
        setPlaybackRate(prev => Math.max(0.25, Math.min(2.0, prev + (cmd.payload as number))));
        break;
      case 'SET_VOLUME':
        setVolume(cmd.payload as number);
        break;
      case 'CHANGE_VOLUME':
        setVolume(prev => Math.max(0, Math.min(1, prev + (cmd.payload as number))));
        break;
      case 'MARK_LOOP_A':
        setLoopA(getCurrentTime());
        setIsLooping(true);
        break;
      case 'MARK_LOOP_B':
        setLoopB(getCurrentTime());
        setIsLooping(true);
        break;
      case 'CLEAR_LOOP':
        setLoopA(null);
        setLoopB(null);
        setIsLooping(false);
        break;
      case 'TOGGLE_LOOP':
        setIsLooping(prev => !prev);
        break;
      case 'GO_TO_LOOP_A':
        if (loopA !== null) {
          seekTo(loopA);
          setIsPlaying(true); // Usually you want it to play when you jump to A
        }
        break;
    }
  }, [cmdQueue, loopA, loopB]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const loadYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeInput) {
      // Ensure it has http/https and no trailing spaces
      let url = youtubeInput.trim();
      if (!url.startsWith('http')) url = 'https://' + url;
      
      // Convert YouTube Shorts to standard watch URL
      if (url.includes('/shorts/')) {
        url = url.replace('/shorts/', '/watch?v=');
      }
      
      // Convert youtu.be share links to standard watch URL to avoid tracking parameter bugs
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split('?')[0];
        url = `https://www.youtube.com/watch?v=${id}`;
      }
      
      // Fix common typos (like watch?v- instead of watch?v=)
      url = url.replace('watch?v-', 'watch?v=');
      
      setVideoUrl(url);
    }
  };

  // Handle Loop Logic
  const handleProgress = (playedSeconds: number) => {
    if (isLooping && loopA !== null && loopB !== null) {
      if (playedSeconds >= loopB) {
        seekTo(loopA);
      }
    }
  };

  // Effect to sync native video properties (volume, speed, play state)
  useEffect(() => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.playbackRate = playbackRate;
      nativeVideoRef.current.volume = volume;
      
      if (isPlaying) {
        nativeVideoRef.current.play().catch(e => console.error("Autoplay blocked:", e));
      } else {
        nativeVideoRef.current.pause();
      }
    }
  }, [playbackRate, volume, isPlaying, videoUrl]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-6xl flex justify-between items-center mb-6">
        <button 
          onClick={() => setVideoUrl('')}
          className="text-zinc-400 hover:text-white flex items-center gap-2"
        >
          &larr; Back
        </button>
        <div className="text-zinc-500 font-mono text-xs border border-zinc-800 bg-zinc-900 px-3 py-1 rounded-md">
          {videoUrl}
        </div>
        <div className="flex items-center gap-4 bg-zinc-900 px-6 py-3 rounded-full border border-zinc-800">
          <div className="text-zinc-400 text-sm">Pairing Code:</div>
          <div className="text-3xl font-mono font-bold tracking-widest text-blue-400">
            {peerId || '----'}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${connectionStatus.includes('connected!') ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>
          {connectionStatus}
        </div>
      </div>

      {!videoUrl ? (
        <div className="flex-1 flex items-center justify-center w-full max-w-2xl">
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8">
            <h2 className="text-2xl font-semibold text-center">Select Video Source</h2>
            
            <div className="space-y-6">
              {/* Local File */}
              <div className="relative group">
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-700 rounded-xl group-hover:border-blue-500 group-hover:bg-blue-500/5 transition-all">
                  <FileVideo className="w-12 h-12 text-zinc-500 mb-4 group-hover:text-blue-500" />
                  <p className="font-medium">Choose a local video file</p>
                  <p className="text-sm text-zinc-500 mt-1">MP4, MOV, WEBM</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px bg-zinc-800 flex-1"></div>
                <div className="text-sm text-zinc-600 font-medium">OR</div>
                <div className="h-px bg-zinc-800 flex-1"></div>
              </div>

              {/* YouTube */}
              <form onSubmit={loadYoutube} className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="url"
                    placeholder="Paste YouTube Link..."
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-zinc-100 text-zinc-900 px-6 py-3 rounded-lg font-medium hover:bg-white transition-colors"
                >
                  Load
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl flex-1 flex flex-col">
          <div className="relative pt-[56.25%] w-full bg-black rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
            <div className="absolute inset-0">
              {videoUrl.startsWith('blob:') ? (
                <video
                  ref={nativeVideoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  onTimeUpdate={(e) => handleProgress((e.target as HTMLVideoElement).currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <ReactPlayer
                  ref={playerRef}
                  url={videoUrl}
                  width="100%"
                  height="100%"
                  playing={isPlaying}
                  playbackRate={playbackRate}
                  volume={volume}
                  onProgress={(state) => handleProgress(state.playedSeconds)}
                  progressInterval={100}
                  controls={true}
                />
              )}
            </div>
          </div>
          
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-between">
            <div className="flex gap-8">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Last Cmd</div>
                <div className="flex items-center gap-2 font-medium text-blue-400">
                  {lastCommand}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Status</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-medium">
                    {isPlaying ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-yellow-400" />}
                    {isPlaying ? 'Playing' : 'Paused'}
                  </div>
                  <div className="text-[9px] text-zinc-600 max-w-[150px] truncate" title={videoUrl}>
                    {videoUrl}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Speed</div>
                <div className="font-medium font-mono">{playbackRate.toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Loop</div>
                <div className="flex items-center gap-2 font-medium">
                  {isLooping ? <RefreshCw className="w-4 h-4 text-blue-400" /> : <RefreshCw className="w-4 h-4 text-zinc-600" />}
                  <span className="font-mono">
                    {loopA !== null ? `${loopA.toFixed(1)}s` : '--'} / {loopB !== null ? `${loopB.toFixed(1)}s` : '--'}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setVideoUrl('')}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors"
            >
              Change Video
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
