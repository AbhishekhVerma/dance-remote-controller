"use client";

import { useEffect, useRef, useState } from 'react';
import type Peer from 'peerjs';
import { RemoteCommand } from '../../types';
import Link from 'next/link';
import { 
  Play, Pause, FastForward, Rewind, 
  Volume2, VolumeX, Plus, Minus,
  RefreshCw, Scissors, XCircle, Zap
} from 'lucide-react';

export default function RemotePage() {
  const [peerIdInput, setPeerIdInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [myId, setMyId] = useState('');
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<any>(null);
  const lastSend = useRef<number>(0);

  useEffect(() => {
    setConnectionStatus('Connecting to signaling server...');
    let active = true;

    const initPeer = async () => {
      try {
        const { default: PeerJS } = await import('peerjs');
        if (!active) return;
        
        const peer = new PeerJS();
        peerRef.current = peer;
        
        peer.on('open', (id) => {
          if (!active) return;
          setMyId(id);
          setIsPeerReady(true);
          setConnectionStatus('Ready to connect.');
        });

        peer.on('error', (err) => {
          if (!active) return;
          if (err.type === 'peer-unavailable') {
            setConnectionStatus('Error: Display not found. Check the code.');
          } else {
            setConnectionStatus(`Signaling Error: ${err.type}`);
            setIsPeerReady(false);
          }
        });
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

  const [bgRed, setBgRed] = useState(false);

  const connect = (e: React.FormEvent | React.MouseEvent | React.TouchEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setBgRed(true);
    setConnectionStatus('Button CLICKED! Attempting connection...');
    
    if (!peerIdInput) {
      setConnectionStatus('Code is empty. Please type the 4 digits.');
      return;
    }
    if (peerIdInput.length !== 4) {
      setConnectionStatus(`Code is ${peerIdInput.length} digits. Needs 4.`);
      return;
    }
    if (!peerRef.current || !isPeerReady) {
      setConnectionStatus('Still connecting to server. Please wait.');
      return;
    }
    
    setConnectionStatus('Attempting connection...');
    
    try {
      const conn = peerRef.current.connect(peerIdInput);
      
      conn.on('open', () => {
        setConnectionStatus('Connected!');
        setIsConnected(true);
        connRef.current = conn;
      });

      conn.on('close', () => {
        setConnectionStatus('Disconnected');
        setIsConnected(false);
        connRef.current = null;
      });

      conn.on('error', (err) => {
        setConnectionStatus(`Connection error: ${err.type}`);
      });
    } catch (err: any) {
      console.error(err);
      setConnectionStatus(`Failed to connect: ${err.message}`);
    }
  };

  const sendCommand = (cmd: RemoteCommand) => {
    const now = Date.now();
    if (now - lastSend.current < 50) return; // Throttle to max 20 commands/sec to protect WebRTC buffer
    lastSend.current = now;

    if (connRef.current && isConnected) {
      connRef.current.send(cmd);
      
      // Optimistic updates for some commands
      if (cmd.type === 'PLAY') setIsPlaying(true);
      if (cmd.type === 'PAUSE') setIsPlaying(false);
      if (cmd.type === 'TOGGLE_PLAY') setIsPlaying(!isPlaying);
    }
  };

  if (!isConnected) {
    return (
      <main className={`flex min-h-screen flex-col items-center justify-center text-white p-6 ${bgRed ? 'bg-red-900' : 'bg-zinc-950'}`}>
        <Link href="/" className="absolute top-6 left-6 text-zinc-400 hover:text-white">
          &larr; Back
        </Link>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Connect Remote</h1>
            <p className="text-zinc-400">Enter the 4-digit code shown on the display.</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={peerIdInput}
              onChange={(e) => setPeerIdInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && connect(e as any)}
              placeholder="0000"
              className="w-full text-center text-5xl tracking-[0.5em] font-mono font-bold bg-zinc-900 border border-zinc-800 rounded-2xl py-6 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button 
              type="button"
              onClick={connect}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-4 rounded-xl transition-all cursor-pointer relative z-50"
            >
              Connect
            </button>
            <p className="text-center text-sm text-zinc-500">{connectionStatus}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white p-4 safe-area-pt select-none touch-manipulation">
      <div className="flex justify-between items-center mb-6">
        <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
          Connected to {peerIdInput}
        </div>
        <button 
          onClick={() => {
            connRef.current?.close();
            setIsConnected(false);
          }}
          className="text-xs text-red-400 font-semibold px-3 py-1 bg-red-400/10 rounded-full"
        >
          Disconnect
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Playback Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-4">Playback</h2>
          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={() => sendCommand({ type: 'SEEK_RELATIVE', payload: -5 })}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 py-6 rounded-xl flex items-center justify-center transition-colors"
            >
              <Rewind size={32} />
              <span className="text-xs font-bold mt-1 absolute bottom-4">5s</span>
            </button>
            
            <button 
              onClick={() => sendCommand({ type: 'TOGGLE_PLAY' })}
              className="flex-[1.5] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 py-8 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-blue-900/20"
            >
              {isPlaying ? <Pause size={48} /> : <Play size={48} />}
            </button>
            
            <button 
              onClick={() => sendCommand({ type: 'SEEK_RELATIVE', payload: 5 })}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 py-6 rounded-xl flex items-center justify-center transition-colors"
            >
              <FastForward size={32} />
              <span className="text-xs font-bold mt-1 absolute bottom-4">5s</span>
            </button>
          </div>
        </div>

        {/* Looping Controls */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Loop Practice</h2>
            <button 
              onClick={() => sendCommand({ type: 'TOGGLE_LOOP' })}
              className="text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-semibold"
            >
              <RefreshCw size={14} /> Toggle
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => sendCommand({ type: 'MARK_LOOP_A' })}
              className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 py-4 rounded-xl flex flex-col items-center gap-2 border border-zinc-700"
            >
              <Scissors size={24} className="text-green-400" />
              <span className="text-sm font-bold">Set Point A</span>
            </button>
            <button 
              onClick={() => sendCommand({ type: 'MARK_LOOP_B' })}
              className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 py-4 rounded-xl flex flex-col items-center gap-2 border border-zinc-700"
            >
              <Scissors size={24} className="text-red-400" />
              <span className="text-sm font-bold">Set Point B</span>
            </button>
          </div>
          
          <button 
            onClick={() => sendCommand({ type: 'GO_TO_LOOP_A' })}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.98] transition-all py-3 rounded-xl flex items-center justify-center gap-2 text-white font-bold shadow-lg shadow-blue-900/20"
          >
            <Play size={18} /> Go to Point A
          </button>
          
          <button 
            onClick={() => sendCommand({ type: 'CLEAR_LOOP' })}
            className="w-full mt-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 py-3 rounded-xl flex items-center justify-center gap-2 text-zinc-400"
          >
            <XCircle size={18} /> Clear Loop
          </button>
        </div>

        {/* Speed & Volume */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
            <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Speed</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => sendCommand({ type: 'CHANGE_SPEED', payload: -0.25 })}
                className="bg-zinc-800 p-3 rounded-lg"
              ><Minus size={20} /></button>
              <Zap size={20} className="text-yellow-400" />
              <button 
                onClick={() => sendCommand({ type: 'CHANGE_SPEED', payload: 0.25 })}
                className="bg-zinc-800 p-3 rounded-lg"
              ><Plus size={20} /></button>
            </div>
            <button 
              onClick={() => sendCommand({ type: 'SET_SPEED', payload: 1.0 })}
              className="text-xs text-zinc-400 underline"
            >Reset to 1x</button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
            <h2 className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Volume</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => sendCommand({ type: 'CHANGE_VOLUME', payload: -0.1 })}
                className="bg-zinc-800 p-3 rounded-lg"
              ><VolumeX size={20} /></button>
              <Volume2 size={20} className="text-blue-400" />
              <button 
                onClick={() => sendCommand({ type: 'CHANGE_VOLUME', payload: 0.1 })}
                className="bg-zinc-800 p-3 rounded-lg"
              ><Plus size={20} /></button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
