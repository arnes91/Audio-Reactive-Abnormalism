import React, { useState, useEffect, useRef, useCallback } from 'react';
import Visualizer from './components/Visualizer';
import GlitchText from './components/GlitchText';
import RecorderPanel from './components/RecorderPanel';
import { AudioData, AudioSourceType, RecorderSettings } from './types';
import { Mic, Upload, Square, AlertTriangle, Download } from 'lucide-react';

const INITIAL_AUDIO_DATA: AudioData = {
  bass: 0,
  mid: 0,
  high: 0,
  volume: 0,
  dataArray: new Uint8Array(0),
};

const LYRICS_LOG = [
  "SYSTEM INIT...",
  "LOADING CORE...",
  "BRZI ARZI ONLINE",
  "Jesi li ti...",
  "...tihi dirigent?",
  "Adine-ne-ne-ne sine (re-set)",
  "Babo is hacking the mainframe",
  "Kapi-bara switch, glitch in the matrix",
  "Gdje je ona? (System purge!)",
  "Kopam baze (digging)",
  "Sovereignty loading... 99%...",
  "ERROR.",
  "JESI LUD?!",
  "WHIMSY++ BREAK THE FRAME!",
  "Dancing on the edge of a knife...",
  "Samo da znaš, sine.",
  "Everything is for you.",
  "sudo make install reality.exe",
];

const App: React.FC = () => {
  const [audioData, setAudioData] = useState<AudioData>(INITIAL_AUDIO_DATA);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceType, setSourceType] = useState<AudioSourceType | null>(null);
  
  // Audio Nodes
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [mediaStreamDest, setMediaStreamDest] = useState<MediaStreamAudioDestinationNode | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number>();

  const [logLines, setLogLines] = useState<string[]>(LYRICS_LOG.slice(0, 3));
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio Processing Loop
  const updateAudioData = useCallback(() => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Calculate bands (Approximation for standard 1024 FFT size)
    const bassEnd = Math.floor(bufferLength * 0.05); 
    const midEnd = Math.floor(bufferLength * 0.25);
    
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      if (i < bassEnd) bassSum += dataArray[i];
      else if (i < midEnd) midSum += dataArray[i];
      else highSum += dataArray[i];
    }

    const bass = bassSum / bassEnd || 0;
    const mid = midSum / (midEnd - bassEnd) || 0;
    const high = highSum / (bufferLength - midEnd) || 0;
    const volume = (bass + mid + high) / 3;

    setAudioData({ bass, mid, high, volume, dataArray });
    rafRef.current = requestAnimationFrame(updateAudioData);
    
    // Randomly add logs on heavy bass hits
    if (bass > 200 && Math.random() > 0.95) {
       addRandomLog();
    }

  }, [analyser]);

  useEffect(() => {
    if (isPlaying && analyser) {
      updateAudioData();
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, analyser, updateAudioData]);

  // Init Audio Context & Stream Destination (For recording)
  const initAudioContext = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const anal = ctx.createAnalyser();
    const dest = ctx.createMediaStreamDestination(); // For recording mixing

    anal.fftSize = 1024;
    anal.smoothingTimeConstant = 0.85;

    // We connect nodes slightly differently depending on source, but these are common
    anal.connect(dest); 

    setAudioContext(ctx);
    setAnalyser(anal);
    setMediaStreamDest(dest);

    return { ctx, anal, dest };
  };

  const handleMicInput = async () => {
    try {
      const { ctx, anal } = initAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = ctx.createMediaStreamSource(stream);
      source.connect(anal);
      // For mic, we usually don't want to hear ourselves (feedback loop), so we don't connect anal -> ctx.destination
      
      setSourceType(AudioSourceType.MICROPHONE);
      setIsPlaying(true);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Microphone access denied or error.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { ctx, anal } = initAudioContext();
    const url = URL.createObjectURL(file);
    
    if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
        
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(anal);
        anal.connect(ctx.destination); // Connect to speakers
        
        audioRef.current.play().then(() => setIsPlaying(true));
        setSourceType(AudioSourceType.FILE);
    }
  };

  const stopAudio = () => {
    setIsPlaying(false);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    if (isRecording) {
      stopRecording();
    }
  };

  const addRandomLog = () => {
      const randomLine = LYRICS_LOG[Math.floor(Math.random() * LYRICS_LOG.length)];
      setLogLines(prev => {
          const newLogs = [...prev, `[${new Date().toLocaleTimeString().split(' ')[0]}] ${randomLine}`];
          return newLogs.slice(-8); 
      });
  };

  // Recording Logic
  const startRecording = (settings: RecorderSettings) => {
    if (!canvasRef.current || !mediaStreamDest) {
      alert("System not ready for capture.");
      return;
    }

    try {
      // 1. Capture Video Stream from Canvas
      const videoStream = canvasRef.current.captureStream(settings.fps);
      const videoTrack = videoStream.getVideoTracks()[0];

      // 2. Capture Audio Stream from Node
      const audioTrack = mediaStreamDest.stream.getAudioTracks()[0];

      // 3. Combine
      const combinedStream = new MediaStream([videoTrack]);
      if (audioTrack) combinedStream.addTrack(audioTrack);

      // 4. Initialize Recorder
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: settings.mimeType,
        videoBitsPerSecond: settings.videoBitsPerSecond,
      });

      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: settings.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const fileExt = settings.mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `BRZI_ARZI_CAPTURE_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(100); // Collect 100ms chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      // Timer
      const startTime = Date.now();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(Date.now() - startTime);
      }, 50);

    } catch (e) {
      console.error("Recording failed", e);
      alert("Could not start recording. Browser compatibility issue?");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-green-500 font-mono select-none">
      {/* Hidden Audio Element for File Playback */}
      <audio ref={audioRef} loop crossOrigin="anonymous" className="hidden" />

      {/* 3D Visualizer Background */}
      <Visualizer ref={canvasRef} audioData={audioData} isPlaying={isPlaying} />

      {/* Scanline Overlay (Not recorded) */}
      <div className="absolute inset-0 z-10 pointer-events-none scanline opacity-30"></div>
      
      {/* Vignette (Not recorded) */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_60%,rgba(0,0,0,0.9)_100%)]"></div>

      {/* Recording Overlay UI - Only visible when NOT recording or specifically designed to NOT obstruct visuals too much */}
      <RecorderPanel 
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        recordingTime={recordingTime}
      />

      {/* UI Overlay */}
      <div className={`absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none transition-opacity duration-300 ${isRecording ? 'opacity-40' : 'opacity-100'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
                <GlitchText text="BRZI ARZI //" as="h1" className="text-4xl font-bold tracking-tighter text-white" />
                <div className="text-sm mt-1 text-green-400 opacity-80 animate-pulse">
                    PROTOCOL: GLITCHCORE_V1
                </div>
            </div>
            <div className="text-right hidden md:block">
                <div className="text-xs text-green-600">FPS: 60.0</div>
                <div className="text-xs text-green-600">DSP: ACTIVE</div>
                {isRecording && <div className="text-xs text-red-500 font-bold animate-pulse">OUTPUT: WRITING...</div>}
            </div>
        </div>

        {/* Center Prompt - only if idle */}
        {!isPlaying && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
                <div className="border border-green-500 bg-black/80 p-6 backdrop-blur-sm max-w-md shadow-[0_0_15px_rgba(0,255,0,0.3)]">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-bounce" />
                    <GlitchText text="INITIATE SEQUENCE" as="h2" className="text-2xl mb-6 text-white text-center" />
                    
                    <div className="flex flex-col gap-4">
                        <label className="flex items-center justify-center gap-2 px-6 py-3 bg-green-900/30 hover:bg-green-700/50 border border-green-600 cursor-pointer transition-all hover:scale-105 active:scale-95 group">
                            <Upload className="w-5 h-5 group-hover:animate-ping" />
                            <span>UPLOAD_AUDIO_FILE</span>
                            <input 
                                type="file" 
                                accept="audio/*" 
                                onChange={handleFileUpload} 
                                ref={fileInputRef}
                                className="hidden" 
                            />
                        </label>
                        
                        <div className="text-center text-xs text-gray-500">- OR -</div>

                        <button 
                            onClick={handleMicInput}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-900/30 hover:bg-red-700/50 border border-red-600 cursor-pointer transition-all hover:scale-105 active:scale-95 text-red-400 hover:text-red-200"
                        >
                            <Mic className="w-5 h-5" />
                            <span>ACTIVATE_MICROPHONE</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Playback Controls (Bottom Right) */}
        {isPlaying && (
             <div className="absolute bottom-8 right-8 pointer-events-auto flex flex-col gap-4 items-end">
                {/* Recorder Panel Button injects itself via fixed positioning in RecorderPanel.tsx */}
                
                <button 
                    onClick={stopAudio}
                    className="p-4 border border-red-500 bg-black hover:bg-red-900/20 text-red-500 rounded-full transition-all hover:scale-110 active:scale-95"
                >
                    <Square className="w-6 h-6 fill-current" />
                </button>
             </div>
        )}

        {/* Lyrics / Status Log (Bottom Left) */}
        <div className="max-w-md w-full">
            <div className="border-l-2 border-green-600 pl-4 bg-black/50 backdrop-blur-sm py-2">
                <div className="text-xs text-green-800 mb-2 font-bold tracking-widest">SYSTEM_LOG</div>
                <div className="flex flex-col gap-1 text-sm font-bold text-green-300 h-40 justify-end overflow-hidden">
                    {logLines.map((line, i) => (
                        <div key={i} className={`opacity-${(i / logLines.length) * 100 + 20} ${i === logLines.length - 1 ? 'text-white text-base glitch-active' : ''}`}>
                            {`> ${line}`}
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>

      {/* Reactive Overlay Elements (Flash on Bass) */}
      <div 
        className="absolute inset-0 pointer-events-none bg-white mix-blend-overlay transition-opacity duration-75 z-30"
        style={{ opacity: audioData.bass > 200 ? 0.3 : 0 }}
      ></div>
      
      {/* Heavy Glitch Overlay on Drop */}
      {audioData.volume > 200 && audioData.bass > 220 && (
          <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
              <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 animate-pulse tracking-tighter mix-blend-difference transform scale-150">
                  WHIMSY++
              </h1>
          </div>
      )}

    </div>
  );
};

export default App;
