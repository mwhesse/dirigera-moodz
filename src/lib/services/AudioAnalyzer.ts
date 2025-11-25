import Meyda from 'meyda';
import { BeatData, FrequencyData, BeatResult, SongSection } from '@/types';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private meydaAnalyzer: any = null;
  private beatDetector: BeatDetector;
  private sectionDetector: SectionDetector;
  private onBeatCallback: (data: BeatData) => void;
  private onFrequencyCallback: (data: FrequencyData) => void;
  private onSectionCallback?: (data: SongSection) => void;
  private isAnalyzing = false;
  private analysisIntervalId: number | null = null;
  private readonly analysisInterval = 1000 / 30; // 30 FPS analysis rate

  constructor(
    onBeat: (data: BeatData) => void,
    onFrequency: (data: FrequencyData) => void,
    onSection?: (data: SongSection) => void
  ) {
    this.onBeatCallback = onBeat;
    this.onFrequencyCallback = onFrequency;
    this.onSectionCallback = onSection;
    this.beatDetector = new BeatDetector();
    this.sectionDetector = new SectionDetector();
  }

  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if it's suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      console.log('AudioAnalyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioAnalyzer:', error);
      throw error;
    }
  }

  async initializeMicrophoneInput(): Promise<void> {
    try {
      // Request microphone access to capture system audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } 
      });
      
      this.connectStream(stream);
      console.log('Microphone input connected for audio analysis');
    } catch (error) {
      console.error('Failed to initialize microphone input:', error);
      throw new Error('Microphone access required for audio analysis. Please allow microphone permissions and ensure music is playing through your speakers.');
    }
  }

  async initializeSystemAudio(): Promise<void> {
    try {
      // Request system audio via screen sharing (Tab Audio)
      // This provides a clean digital signal even with headphones
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          width: 1,
          height: 1
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } 
      });

      // We only need the audio track
      if (stream.getVideoTracks().length > 0) {
        stream.getVideoTracks()[0].stop();
      }

      if (stream.getAudioTracks().length === 0) {
        throw new Error('No audio track selected. Please ensure you check "Share tab audio" in the dialog.');
      }
      
      this.connectStream(stream);
      console.log('System audio (Tab Capture) connected for high-fidelity analysis');
    } catch (error) {
      console.error('Failed to initialize system audio:', error);
      throw error;
    }
  }

  private connectStream(stream: MediaStream): void {
    if (!this.audioContext || !this.analyser) {
      throw new Error('AudioAnalyzer not initialized');
    }

    // Disconnect previous source
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Stop previous Meyda analyzer
    if (this.meydaAnalyzer) {
      this.meydaAnalyzer.stop();
      this.meydaAnalyzer = null;
    }

    // Create new media source
    this.source = this.audioContext.createMediaStreamSource(stream);
    
    // Connect source to analyser
    // Note: We generally DON'T connect to destination (speakers) for system capture 
    // to avoid feedback loops, unless it's a purely visual capture where we want to hear it.
    // For Tab Capture, the user is already hearing it from the tab.
    this.source.connect(this.analyser);
    
    // Initialize Meyda analyzer
    this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 1024,
      featureExtractors: [
        'rms',
        'energy',
        'spectralCentroid',
        'spectralFlatness',
        'spectralRolloff',
        'chroma',
        'mfcc'
      ],
      callback: this.processMeydaFeatures.bind(this)
    });
  }

  connectToElement(audioElement: HTMLAudioElement): void {
    if (!this.audioContext || !this.analyser) {
      throw new Error('AudioAnalyzer not initialized');
    }

    try {
      // Disconnect previous source
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }

      // Stop previous Meyda analyzer
      if (this.meydaAnalyzer) {
        this.meydaAnalyzer.stop();
        this.meydaAnalyzer = null;
      }

      // Create new media source
      this.source = this.audioContext.createMediaElementSource(audioElement);
      
      // Connect source to analyser and destination
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Initialize Meyda analyzer for advanced audio features
      this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.audioContext,
        source: this.source,
        bufferSize: 1024,
        featureExtractors: [
          'rms',
          'energy',
          'spectralCentroid',
          'spectralFlatness',
          'spectralRolloff',
          'chroma',
          'mfcc'
        ],
        callback: this.processMeydaFeatures.bind(this)
      });

      console.log('Audio element connected to analyzer');
    } catch (error) {
      console.error('Failed to connect audio element:', error);
      throw error;
    }
  }

  start(): void {
    if (!this.audioContext || !this.analyser) {
      throw new Error('AudioAnalyzer not initialized');
    }

    if (this.isAnalyzing) {
      console.warn('AudioAnalyzer is already analyzing');
      return;
    }

    this.isAnalyzing = true;
    
    // Start Meyda analyzer
    if (this.meydaAnalyzer) {
      this.meydaAnalyzer.start();
    }

    // Start main analysis loop
    this.startAnalysisLoop();
    
    console.log('Audio analysis started');
  }

  stop(): void {
    this.isAnalyzing = false;

    // Stop Meyda analyzer
    if (this.meydaAnalyzer) {
      this.meydaAnalyzer.stop();
    }

    // Clear analysis interval
    if (this.analysisIntervalId !== null) {
      clearInterval(this.analysisIntervalId);
      this.analysisIntervalId = null;
    }

    console.log('Audio analysis stopped');
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.isAnalyzing || !this.analyser) {
        return;
      }

      const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      const timeDomainData = new Uint8Array(this.analyser.fftSize);
      
      this.analyser.getByteFrequencyData(frequencyData);
      this.analyser.getByteTimeDomainData(timeDomainData);

      // Frequency band analysis
      const bands = this.analyzeFrequencyBands(frequencyData);
      
      // Beat detection
      const beat = this.beatDetector.detect(frequencyData, timeDomainData);
      if (beat) {
        this.onBeatCallback({
          timestamp: Date.now(),
          intensity: beat.intensity,
          confidence: beat.confidence
        });
      }

      // Send frequency update
      this.onFrequencyCallback(bands);
    };

    // Use setInterval instead of requestAnimationFrame to continue running when tab is inactive
    this.analysisIntervalId = setInterval(analyze, this.analysisInterval) as unknown as number;
  }

  private analyzeFrequencyBands(frequencyData: Uint8Array): FrequencyData {
    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    const nyquist = this.audioContext.sampleRate / 2;
    const binWidth = nyquist / frequencyData.length;

    // Define frequency ranges (Hz) - treble starts much lower
    const bassRange = [20, 200];
    const midRange = [200, 1000];
    const trebleRange = [1000, 20000];

    // Calculate bin indices
    const bassBins = [
      Math.floor(bassRange[0] / binWidth),
      Math.floor(bassRange[1] / binWidth)
    ];
    const midBins = [
      Math.floor(midRange[0] / binWidth),
      Math.floor(midRange[1] / binWidth)
    ];
    const trebleBins = [
      Math.floor(trebleRange[0] / binWidth),
      Math.min(Math.floor(trebleRange[1] / binWidth), frequencyData.length - 1)
    ];

    // Calculate average energy in each band with balanced amplification
    const bass = this.getAverageVolume(frequencyData.slice(bassBins[0], bassBins[1])) / 255;
    const mids = Math.min(1.0, (this.getAverageVolume(frequencyData.slice(midBins[0], midBins[1])) / 255) * 1.2);
    // Amplify treble frequencies for better visibility (1.8x multiplier, clamped to 1.0)
    const treble = Math.min(1.0, (this.getAverageVolume(frequencyData.slice(trebleBins[0], trebleBins[1])) / 255) * 1.8);

    // Find dominant frequency
    let maxValue = 0;
    let dominantBin = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        dominantBin = i;
      }
    }
    const dominantFrequency = dominantBin * binWidth;

    return {
      bass,
      mids,
      treble,
      dominantFrequency,
      spectrum: Array.from(frequencyData)
    };
  }

  private processMeydaFeatures(features: any): void {
    if (!features) return;

    // Advanced audio feature processing for song section detection
    const sectionData = {
      energy: features.energy || 0,
      spectralCentroid: features.spectralCentroid || 0,
      spectralFlatness: features.spectralFlatness || 0,
      spectralRolloff: features.spectralRolloff || 0,
      rms: features.rms || 0,
      chroma: features.chroma || [],
      mfcc: features.mfcc || []
    };

    // Detect song sections
    const section = this.sectionDetector.detect(sectionData);
    if (section && this.onSectionCallback) {
      this.onSectionCallback(section);
    }
  }

  private getAverageVolume(array: Uint8Array): number {
    if (array.length === 0) return 0;
    return array.reduce((a, b) => a + b, 0) / array.length;
  }

  // Get real-time audio data for visualization
  getVisualizationData(): { frequency: Uint8Array; waveform: Uint8Array } | null {
    if (!this.analyser) return null;

    const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    const waveformData = new Uint8Array(this.analyser.fftSize);
    
    this.analyser.getByteFrequencyData(frequencyData);
    this.analyser.getByteTimeDomainData(waveformData);

    return {
      frequency: frequencyData,
      waveform: waveformData
    };
  }

  // Clean up resources
  destroy(): void {
    this.stop();

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.meydaAnalyzer = null;
  }
}

// Beat detection algorithm
class BeatDetector {
  private energyHistory: number[] = [];
  private readonly historySize = 43; // ~1 second at 43fps
  private readonly threshold = 1.3;
  private lastBeatTime = 0;
  private readonly minBeatInterval = 100; // Minimum ms between beats
  private readonly energyVarianceThreshold = 0.02;

  detect(frequencyData: Uint8Array, timeDomainData: Uint8Array): BeatResult | null {
    // Calculate instant energy (focus on low frequencies for beat detection)
    const bassData = frequencyData.slice(0, Math.floor(frequencyData.length * 0.1));
    const currentEnergy = this.calculateEnergy(bassData, timeDomainData);

    // Add to history
    this.energyHistory.push(currentEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Need enough history for reliable detection
    if (this.energyHistory.length < this.historySize) {
      return null;
    }

    // Calculate statistics
    const averageEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.calculateVariance(this.energyHistory, averageEnergy);
    
    // Adaptive threshold
    const dynamicThreshold = averageEnergy + (this.threshold * Math.sqrt(variance));
    
    // Check for beat
    const now = Date.now();
    if (currentEnergy > dynamicThreshold && 
        variance > this.energyVarianceThreshold &&
        now - this.lastBeatTime > this.minBeatInterval) {
      
      this.lastBeatTime = now;
      
      const intensity = Math.min(1, (currentEnergy - averageEnergy) / averageEnergy);
      const confidence = Math.min(1, Math.max(0, (currentEnergy - dynamicThreshold) / dynamicThreshold));
      
      return { intensity, confidence };
    }

    return null;
  }

  private calculateEnergy(frequencyData: Uint8Array, timeDomainData: Uint8Array): number {
    // Combine frequency and time domain analysis for better beat detection
    const frequencyEnergy = frequencyData.reduce((sum, value) => sum + (value * value), 0);
    
    // Calculate RMS from time domain
    const rms = Math.sqrt(
      timeDomainData.reduce((sum, value) => {
        const normalized = (value - 128) / 128;
        return sum + (normalized * normalized);
      }, 0) / timeDomainData.length
    );
    
    return (frequencyEnergy / frequencyData.length) * rms;
  }

  private calculateVariance(array: number[], mean: number): number {
    const squaredDiffs = array.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / array.length;
  }
}

// Song section detection algorithm
class SectionDetector {
  private featureHistory: any[] = [];
  private readonly historySize = 50;
  private lastSectionTime = 0;
  private readonly minSectionInterval = 5000; // 5 seconds minimum between sections

  detect(features: any): SongSection | null {
    this.featureHistory.push({
      ...features,
      timestamp: Date.now()
    });

    if (this.featureHistory.length > this.historySize) {
      this.featureHistory.shift();
    }

    if (this.featureHistory.length < 20) {
      return null; // Need enough history
    }

    const now = Date.now();
    if (now - this.lastSectionTime < this.minSectionInterval) {
      return null; // Too soon for another section
    }

    // Analyze recent vs older features for section changes
    const recentFeatures = this.featureHistory.slice(-10);
    const olderFeatures = this.featureHistory.slice(-30, -10);

    const recentAvgEnergy = recentFeatures.reduce((sum, f) => sum + f.energy, 0) / recentFeatures.length;
    const olderAvgEnergy = olderFeatures.reduce((sum, f) => sum + f.energy, 0) / olderFeatures.length;
    
    const energyChange = (recentAvgEnergy - olderAvgEnergy) / olderAvgEnergy;
    
    // Detect different section types based on energy and spectral changes
    let sectionType: SongSection['type'] | null = null;
    let confidence = 0;

    if (energyChange > 0.5 && recentAvgEnergy > 0.3) {
      // Sudden energy increase - likely a drop or chorus
      sectionType = recentAvgEnergy > 0.6 ? 'DROP' : 'CHORUS';
      confidence = Math.min(1, energyChange);
    } else if (energyChange < -0.3) {
      // Energy decrease - breakdown or verse
      sectionType = recentAvgEnergy < 0.2 ? 'BREAKDOWN' : 'VERSE';
      confidence = Math.min(1, Math.abs(energyChange));
    } else if (this.detectBuildUp(recentFeatures, olderFeatures)) {
      sectionType = 'BUILD';
      confidence = 0.7;
    }

    if (sectionType && confidence > 0.5) {
      this.lastSectionTime = now;
      return {
        type: sectionType,
        timestamp: now,
        confidence
      };
    }

    return null;
  }

  private detectBuildUp(recent: any[], older: any[]): boolean {
    // Look for gradual energy increase with increasing spectral centroid
    const recentAvgCentroid = recent.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / recent.length;
    const olderAvgCentroid = older.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / older.length;
    
    const centroidIncrease = recentAvgCentroid > olderAvgCentroid * 1.1;
    
    // Check for gradual energy increase
    const energyTrend = recent.map((f, i) => f.energy - (i > 0 ? recent[i-1].energy : f.energy));
    const positiveChanges = energyTrend.filter(change => change > 0).length;
    
    return centroidIncrease && positiveChanges > recent.length * 0.6;
  }
}