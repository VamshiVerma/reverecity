// useRealtimeVoice.ts - Custom hook for real-time voice streaming
import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceStreamConfig {
  wsUrl: string;
  sampleRate: number;
  batchSize: number;
  enableVoiceDetection: boolean;
}

export interface VoiceStreamState {
  isConnected: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  transcription: string;
  partialTranscription: string;
  confidence: number;
  error: string | null;
}

export interface AudioVisualizerData {
  waveform: Float32Array;
  volume: number;
  frequency: Float32Array;
}

export const useRealtimeVoice = (config: VoiceStreamConfig) => {
  const [state, setState] = useState<VoiceStreamState>({
    isConnected: false,
    isRecording: false,
    isPlaying: false,
    transcription: '',
    partialTranscription: '',
    confidence: 0,
    error: null
  });

  const [visualizerData, setVisualizerData] = useState<AudioVisualizerData>({
    waveform: new Float32Array(256),
    volume: 0,
    frequency: new Float32Array(256)
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  // Initialize WebSocket connection
  const connect = useCallback(async () => {
    try {
      const ws = new WebSocket(config.wsUrl);

      ws.onopen = () => {
        console.log('🔊 WebSocket connected for real-time voice');
        setState(prev => ({ ...prev, isConnected: true, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔊 WebSocket disconnected');
        setState(prev => ({ ...prev, isConnected: false }));
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection failed', isConnected: false }));
      };

      wsRef.current = ws;
    } catch (error) {
      setState(prev => ({ ...prev, error: `Connection failed: ${error}` }));
    }
  }, [config.wsUrl]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'transcription_partial':
        setState(prev => ({
          ...prev,
          partialTranscription: data.text,
          confidence: data.confidence || 0
        }));
        break;

      case 'transcription_complete':
        setState(prev => ({
          ...prev,
          transcription: data.text,
          partialTranscription: '',
          confidence: data.confidence || 100
        }));
        break;

      case 'tts_start':
        setState(prev => ({ ...prev, isPlaying: true }));
        break;

      case 'tts_chunk':
        // Handle streaming audio playback
        if (data.audio) {
          playAudioChunk(data.audio);
        }
        break;

      case 'tts_end':
        setState(prev => ({ ...prev, isPlaying: false }));
        break;

      case 'error':
        setState(prev => ({ ...prev, error: data.message }));
        break;
    }
  }, []);

  // Initialize audio context and worklets
  const initializeAudio = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create AudioContext
      const audioContext = new AudioContext({ sampleRate: config.sampleRate });

      // Load and register audio worklets
      await audioContext.audioWorklet.addModule('/audio-worklets/voice-processor.js');

      // Create worklet node for audio processing
      const workletNode = new AudioWorkletNode(audioContext, 'voice-processor', {
        processorOptions: {
          batchSize: config.batchSize,
          enableVoiceDetection: config.enableVoiceDetection
        }
      });

      // Create analyzer for visualization
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.8;

      // Connect audio nodes
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(workletNode);
      source.connect(analyzer);

      // Handle processed audio data
      workletNode.port.onmessage = (event) => {
        const { type, data: audioData } = event.data;

        if (type === 'audio-data' && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send audio data to WebSocket
          wsRef.current.send(audioData);
        } else if (type === 'voice-activity') {
          setState(prev => ({ ...prev, isRecording: audioData.isVoiceActive }));
        }
      };

      // Update visualization data
      const updateVisualizer = () => {
        if (analyzerRef.current) {
          const waveform = new Float32Array(analyzerRef.current.frequencyBinCount);
          const frequency = new Float32Array(analyzerRef.current.frequencyBinCount);

          analyzerRef.current.getFloatTimeDomainData(waveform);
          analyzerRef.current.getFloatFrequencyData(frequency);

          const volume = Math.sqrt(waveform.reduce((sum, val) => sum + val * val, 0) / waveform.length);

          setVisualizerData({ waveform, frequency, volume });
        }
        requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      workletNodeRef.current = workletNode;
      analyzerRef.current = analyzer;

    } catch (error) {
      setState(prev => ({ ...prev, error: `Audio initialization failed: ${error}` }));
    }
  }, [config]);

  // Play audio chunk for TTS
  const playAudioChunk = useCallback(async (audioData: string) => {
    if (!audioContextRef.current) return;

    try {
      // Decode base64 audio data
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio buffer
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);

      // Create and play audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await connect();
    }

    if (!audioContextRef.current) {
      await initializeAudio();
    }

    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    setState(prev => ({ ...prev, isRecording: true }));
  }, [connect, initializeAudio]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    setState(prev => ({ ...prev, isRecording: false }));

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop_recording' }));
    }
  }, []);

  // Send message to voice pipeline
  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text_input',
        text: message
      }));
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    state,
    visualizerData,
    connect,
    startRecording,
    stopRecording,
    sendMessage,
    cleanup
  };
};