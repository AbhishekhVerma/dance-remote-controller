# Dance Remote 🕺📱

A zero-latency, WebRTC-powered remote control application designed specifically for dance practice. Turn your smartphone into a powerful remote control for your laptop's video player, allowing you to control playback, set loops, and adjust speed from across the room without missing a beat.

## Features

- **Zero-Latency Remote Control**: Built on top of `peerjs` for direct peer-to-peer WebRTC communication. Commands are sent instantly over the local network or internet.
- **Local File Support**: Drag and drop or select raw `.mp4` or `.mov` files from your laptop. Bypasses third-party libraries for lightning-fast native HTML5 playback.
- **YouTube Integration**: Paste any YouTube link (even tricky mobile `youtu.be` or Shorts links). The app aggressively cleans tracking parameters and loads a dedicated, bug-free YouTube player.
- **A/B Choreography Looping**: Set a Point A and Point B on the fly. Jump instantly back to Point A to drill specific sections of choreography.
- **Speed & Volume Control**: Slow down complex routines to 0.5x speed directly from your phone.
- **Mobile-Optimized Interface**: The remote UI is built for "no-look" usage with large tap targets, haptic-friendly active states, and numerical keypads for easy connection.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **WebRTC Broker**: PeerJS (using the free default cloud broker)
- **Video Players**: Native HTML5 Video + `react-player` (v2.16.0 for React 18 compatibility)

## Getting Started Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Connect**:
   - Open your laptop browser to `http://localhost:3000`
   - Select **Host (Laptop Display)**
   - Open your phone browser and navigate to your laptop's local IP address (e.g., `http://192.168.x.x:3000`)
   - Select **Remote (Phone)** and enter the 4-digit pairing code shown on your laptop.

## Deployment to Vercel

The easiest way to use this app is to deploy it to Vercel. Once deployed, you no longer need to worry about local IP addresses—you can just use the public `.vercel.app` URL on both devices!

1. Open a terminal in the project directory.
2. Run the Vercel CLI tool:
   ```bash
   npx vercel
   ```
3. Follow the prompts to log in (if needed) and link your project.
4. Enjoy your live, universally accessible remote!

## Architecture Notes

- **Stale Closures & WebRTC**: To avoid React stale closure bugs commonly found in WebSocket/WebRTC listeners, incoming remote commands are pushed into a React state queue (`cmdQueue`). A `useEffect` then processes these commands, guaranteeing access to the freshest video player DOM references.
- **Next.js & Custom Elements**: We explicitly use `react-player` v2 instead of v3 to bypass known React 18 property hydration bugs with Web Components (`youtube-video-element`), ensuring flawless YouTube Iframe initialization.
