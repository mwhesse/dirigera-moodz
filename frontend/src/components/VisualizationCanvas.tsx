import React, { useRef, useEffect, useState } from 'react';
import { useLightStore } from '../stores/lightStore';
import { useSpotifyStore } from '../stores/spotifyStore';

export const VisualizationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isVisible, setIsVisible] = useState(true);
  
  const { currentFrequencyData, lastBeatTime } = useLightStore();
  const { isPlaying } = useSpotifyStore();
  
  // Check if we have any audio activity (for audio-only mode)
  const hasAudioActivity = currentFrequencyData && 
    (currentFrequencyData.bass > 0.01 || currentFrequencyData.mids > 0.01 || currentFrequencyData.treble > 0.01);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let beatFlash = 0;
    let beatDecay = 0.95;

    const animate = () => {
      if (!isVisible || (!isPlaying && !hasAudioActivity)) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Handle beat flash
      const now = Date.now();
      if (lastBeatTime && now - lastBeatTime < 200) {
        beatFlash = Math.max(beatFlash, 0.8);
      }
      beatFlash *= beatDecay;

      // Draw frequency visualization
      if (currentFrequencyData) {
        drawFrequencyBars(ctx, rect, currentFrequencyData, beatFlash);
        drawWaveform(ctx, rect, currentFrequencyData, beatFlash);
      } else {
        drawIdlePattern(ctx, rect, now);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, isPlaying, hasAudioActivity, currentFrequencyData, lastBeatTime]);

  const drawFrequencyBars = (
    ctx: CanvasRenderingContext2D,
    rect: DOMRect,
    data: any,
    beatFlash: number
  ) => {
    const { bass, mids, treble } = data;
    const barWidth = rect.width / 3;
    const maxHeight = rect.height * 0.8;

    // Bass bar (red)
    const bassHeight = bass * maxHeight;
    const bassGradient = ctx.createLinearGradient(0, rect.height, 0, rect.height - bassHeight);
    bassGradient.addColorStop(0, `rgba(255, 60, 60, ${0.8 + beatFlash * 0.2})`);
    bassGradient.addColorStop(1, `rgba(255, 120, 120, ${0.6 + beatFlash * 0.4})`);
    ctx.fillStyle = bassGradient;
    ctx.fillRect(0, rect.height - bassHeight, barWidth * 0.8, bassHeight);

    // Mids bar (green)
    const midsHeight = mids * maxHeight;
    const midsGradient = ctx.createLinearGradient(0, rect.height, 0, rect.height - midsHeight);
    midsGradient.addColorStop(0, `rgba(60, 255, 60, ${0.8 + beatFlash * 0.2})`);
    midsGradient.addColorStop(1, `rgba(120, 255, 120, ${0.6 + beatFlash * 0.4})`);
    ctx.fillStyle = midsGradient;
    ctx.fillRect(barWidth * 1.1, rect.height - midsHeight, barWidth * 0.8, midsHeight);

    // Treble bar (blue)
    const trebleHeight = treble * maxHeight;
    const trebleGradient = ctx.createLinearGradient(0, rect.height, 0, rect.height - trebleHeight);
    trebleGradient.addColorStop(0, `rgba(60, 60, 255, ${0.8 + beatFlash * 0.2})`);
    trebleGradient.addColorStop(1, `rgba(120, 120, 255, ${0.6 + beatFlash * 0.4})`);
    ctx.fillStyle = trebleGradient;
    ctx.fillRect(barWidth * 2.2, rect.height - trebleHeight, barWidth * 0.8, trebleHeight);

    // Labels
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + beatFlash * 0.3})`;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BASS', barWidth * 0.4, rect.height - 10);
    ctx.fillText('MIDS', barWidth * 1.5, rect.height - 10);
    ctx.fillText('TREBLE', barWidth * 2.6, rect.height - 10);
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    rect: DOMRect,
    data: any,
    beatFlash: number
  ) => {
    if (!data.spectrum) return;

    const spectrum = data.spectrum.slice(0, Math.floor(data.spectrum.length / 4)); // Use first quarter for better visualization
    const barWidth = rect.width / spectrum.length;
    const centerY = rect.height / 2;

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + beatFlash * 0.7})`;
    
    ctx.beginPath();
    for (let i = 0; i < spectrum.length; i++) {
      const x = i * barWidth;
      const amplitude = (spectrum[i] / 255) * (rect.height * 0.3);
      const y = centerY + (i % 2 === 0 ? amplitude : -amplitude);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const drawIdlePattern = (ctx: CanvasRenderingContext2D, rect: DOMRect, time: number) => {
    // Draw a subtle breathing pattern when no music is playing
    const breathe = (Math.sin(time * 0.002) + 1) * 0.5;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = 30 + breathe * 20;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(100, 100, 200, ${0.1 + breathe * 0.1})`);
    gradient.addColorStop(1, 'rgba(100, 100, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add some gentle floating particles
    for (let i = 0; i < 5; i++) {
      const angle = (time * 0.001 + i * Math.PI * 0.4) % (Math.PI * 2);
      const distance = 50 + Math.sin(time * 0.003 + i) * 20;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      ctx.fillStyle = `rgba(150, 150, 255, ${0.3 + Math.sin(time * 0.005 + i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for music...', centerX, centerY + 80);
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Audio Visualization</h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            isVisible 
              ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
              : 'bg-white/10 text-white/60 hover:bg-white/20'
          }`}
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`w-full h-48 rounded-lg transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-30'
          }`}
          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        />
        
        {(!isPlaying && !hasAudioActivity) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-white/20 border-t-white/40 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-white/60 text-sm">
                {!isPlaying && !currentFrequencyData ? 'Start audio analysis to see visualization' : 'Allow microphone access to enable visualization'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats display */}
      {currentFrequencyData && isVisible && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-white/60 text-xs font-medium mb-1">BASS</div>
            <div className="text-red-300 text-sm">
              {(currentFrequencyData.bass * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-medium mb-1">MIDS</div>
            <div className="text-green-300 text-sm">
              {(currentFrequencyData.mids * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="text-white/60 text-xs font-medium mb-1">TREBLE</div>
            <div className="text-blue-300 text-sm">
              {(currentFrequencyData.treble * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};