// voice-processor.js - AudioWorklet for real-time voice processing
class VoiceProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.batchSize = options.processorOptions?.batchSize || 2048;
    this.enableVoiceDetection = options.processorOptions?.enableVoiceDetection || true;

    // Audio batching
    this.audioBuffer = [];
    this.batchBuffer = new Float32Array(this.batchSize);
    this.batchIndex = 0;

    // Voice activity detection
    this.voiceThreshold = 0.01;
    this.silenceFrames = 0;
    this.voiceFrames = 0;
    this.isVoiceActive = false;
    this.silenceThreshold = 20; // frames
    this.voiceActivationThreshold = 5; // frames

    // Audio analysis
    this.rmsHistory = new Array(10).fill(0);
    this.rmsIndex = 0;

    console.log('🎙️ VoiceProcessor initialized:', {
      batchSize: this.batchSize,
      enableVoiceDetection: this.enableVoiceDetection
    });
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const inputChannel = input[0];

      // Process audio samples
      for (let i = 0; i < inputChannel.length; i++) {
        const sample = inputChannel[i];

        // Add to batch buffer
        this.batchBuffer[this.batchIndex] = sample;
        this.batchIndex++;

        // When batch is full, process it
        if (this.batchIndex >= this.batchSize) {
          this.processBatch();
          this.batchIndex = 0;
        }
      }
    }

    return true;
  }

  processBatch() {
    // Calculate RMS for voice activity detection
    const rms = this.calculateRMS(this.batchBuffer);

    // Update RMS history for smoothing
    this.rmsHistory[this.rmsIndex] = rms;
    this.rmsIndex = (this.rmsIndex + 1) % this.rmsHistory.length;

    // Smooth RMS value
    const smoothRMS = this.rmsHistory.reduce((sum, val) => sum + val, 0) / this.rmsHistory.length;

    // Voice activity detection
    if (this.enableVoiceDetection) {
      this.updateVoiceActivity(smoothRMS);
    }

    // Convert Float32Array to Int16Array for transmission
    const int16Buffer = new Int16Array(this.batchSize);
    for (let i = 0; i < this.batchSize; i++) {
      int16Buffer[i] = Math.max(-32768, Math.min(32767, this.batchBuffer[i] * 32767));
    }

    // Create message with header (timestamp + flags)
    const timestamp = Date.now() & 0xFFFFFFFF;
    const flags = this.isVoiceActive ? 1 : 0;

    const messageBuffer = new ArrayBuffer(8 + int16Buffer.byteLength);
    const headerView = new DataView(messageBuffer, 0, 8);
    const audioView = new Int16Array(messageBuffer, 8);

    headerView.setUint32(0, timestamp, false);
    headerView.setUint32(4, flags, false);
    audioView.set(int16Buffer);

    // Send audio data to main thread
    this.port.postMessage({
      type: 'audio-data',
      data: messageBuffer
    }, [messageBuffer]);

    // Send voice activity status
    this.port.postMessage({
      type: 'voice-activity',
      data: {
        isVoiceActive: this.isVoiceActive,
        rms: smoothRMS,
        volume: smoothRMS * 100
      }
    });
  }

  calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  updateVoiceActivity(rms) {
    const wasVoiceActive = this.isVoiceActive;

    if (rms > this.voiceThreshold) {
      this.voiceFrames++;
      this.silenceFrames = 0;

      if (!this.isVoiceActive && this.voiceFrames >= this.voiceActivationThreshold) {
        this.isVoiceActive = true;
      }
    } else {
      this.silenceFrames++;
      this.voiceFrames = 0;

      if (this.isVoiceActive && this.silenceFrames >= this.silenceThreshold) {
        this.isVoiceActive = false;
      }
    }

    // Log voice activity changes
    if (wasVoiceActive !== this.isVoiceActive) {
      console.log(`🎙️ Voice activity: ${this.isVoiceActive ? 'ACTIVE' : 'INACTIVE'}`);
    }
  }
}

registerProcessor('voice-processor', VoiceProcessor);