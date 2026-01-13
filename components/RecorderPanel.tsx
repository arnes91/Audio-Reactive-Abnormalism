import React, { useState, useEffect } from 'react';
import { Settings, Video, Download, X, Circle, Check } from 'lucide-react';
import { RecorderSettings } from '../types';
import GlitchText from './GlitchText';

interface RecorderPanelProps {
  isRecording: boolean;
  onStartRecording: (settings: RecorderSettings) => void;
  onStopRecording: () => void;
  recordingTime: number;
}

const SUPPORTED_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/x-matroska;codecs=avc1',
  'video/mp4' // Chrome experimental or specific environments
].filter(type => MediaRecorder.isTypeSupported(type));

const RecorderPanel: React.FC<RecorderPanelProps> = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording,
  recordingTime 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<RecorderSettings>({
    mimeType: SUPPORTED_TYPES[0] || '',
    videoBitsPerSecond: 8000000, // 8 Mbps
    fps: 60
  });

  // Format time as MM:SS:ms
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 bg-black/90 border border-red-500 px-6 py-3 rounded-sm shadow-[0_0_20px_rgba(255,0,0,0.4)]">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <div className="font-mono text-red-500 text-xl font-bold tracking-widest">
          REC {formatTime(recordingTime)}
        </div>
        <button 
          onClick={onStopRecording}
          className="ml-4 px-4 py-1 bg-red-900/40 hover:bg-red-600/40 border border-red-500 text-red-100 text-xs font-bold uppercase transition-all hover:scale-105"
        >
          STOP_CAPTURE
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-8 z-50 p-4 border border-green-500 bg-black hover:bg-green-900/20 text-green-500 rounded-full transition-all hover:scale-110 active:scale-95 group"
      >
        <Video className="w-6 h-6 fill-current group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-black border-2 border-green-500 shadow-[0_0_30px_rgba(0,255,0,0.2)] p-8">
        {/* Close Button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-green-700 hover:text-green-400"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="mb-8 border-b border-green-900 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-6 h-6 text-green-500" />
            <GlitchText text="STUDIO_RECORDER //" as="h2" className="text-2xl font-bold text-white" />
          </div>
          <p className="text-xs text-green-600 uppercase tracking-widest">Configure Output Stream parameters</p>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          
          {/* Format Selector */}
          <div>
            <label className="block text-green-500 text-xs font-bold mb-2 uppercase">Container / Codec</label>
            <div className="grid grid-cols-1 gap-2">
              {SUPPORTED_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSettings({ ...settings, mimeType: type })}
                  className={`flex items-center justify-between px-4 py-3 border text-left text-sm font-mono transition-all ${
                    settings.mimeType === type 
                      ? 'border-green-400 bg-green-900/30 text-white shadow-[0_0_10px_rgba(0,255,0,0.2)]' 
                      : 'border-green-900/50 text-green-700 hover:border-green-600 hover:text-green-400'
                  }`}
                >
                  <span>{type.split(';')[0].replace('video/', '').toUpperCase()} <span className="text-xs opacity-50 lowercase">{type.split(';')[1] || 'default'}</span></span>
                  {settings.mimeType === type && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Bitrate */}
            <div>
              <label className="block text-green-500 text-xs font-bold mb-2 uppercase">Bitrate Quality</label>
              <select 
                value={settings.videoBitsPerSecond}
                onChange={(e) => setSettings({...settings, videoBitsPerSecond: Number(e.target.value)})}
                className="w-full bg-black border border-green-700 text-green-400 px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                <option value={2500000}>2.5 Mbps (Low)</option>
                <option value={5000000}>5.0 Mbps (Med)</option>
                <option value={8000000}>8.0 Mbps (High)</option>
                <option value={15000000}>15.0 Mbps (Ultra)</option>
                <option value={50000000}>50.0 Mbps (Lossless-ish)</option>
              </select>
            </div>

            {/* FPS */}
            <div>
              <label className="block text-green-500 text-xs font-bold mb-2 uppercase">Framerate</label>
              <select 
                value={settings.fps}
                onChange={(e) => setSettings({...settings, fps: Number(e.target.value)})}
                className="w-full bg-black border border-green-700 text-green-400 px-3 py-2 text-sm focus:outline-none focus:border-green-400"
              >
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branding Preview */}
        <div className="mt-8 p-4 border border-green-900/50 bg-green-900/10">
          <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
            <Settings className="w-3 h-3" />
            <span>OVERLAY_PREVIEW</span>
          </div>
          <div className="text-center font-mono text-green-400 text-sm opacity-50">
            [ BRZI ARZI // WATERMARK AUTOMATICALLY APPLIED ]
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
           <button 
             onClick={() => setIsOpen(false)}
             className="flex-1 py-4 border border-green-800 text-green-800 hover:bg-green-900/20 hover:text-green-500 transition-colors uppercase tracking-widest text-sm font-bold"
           >
             Cancel
           </button>
           <button 
             onClick={() => { setIsOpen(false); onStartRecording(settings); }}
             className="flex-[2] py-4 bg-red-600 hover:bg-red-500 text-black font-bold uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(255,0,0,0.4)] hover:shadow-[0_0_30px_rgba(255,0,0,0.6)] transition-all flex items-center justify-center gap-2"
           >
             <Circle className="w-4 h-4 fill-current" />
             Start Recording
           </button>
        </div>

      </div>
    </div>
  );
};

export default RecorderPanel;
