class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // VAD state
    this._speaking = false;
    this._silenceCounter = 0;
    this._speechOnsetCounter = 0;
    this._speechStartFrame = 0;

    // Adaptive noise floor
    this._noiseFloor = 0;
    this._noiseFloorAlpha = 0.002; // Very slow EMA for runtime adaptation
    this._speechMultiplier = 6.0; // Speech must be 6x above noise floor
    this._minSpeechThreshold = 0.05; // Absolute minimum
    this._frameCount = 0;
    // Frame timing: 128 samples/frame at 16kHz = 8ms/frame
    this._warmupFrames = 25; // ~200ms — skip mic activation artifacts
    this._calibrationEnd = 100; // ~800ms total — collect samples after warmup
    this._calibrationSamples = []; // Collect RMS values during calibration

    // Hysteresis
    this._speechOnsetFramesRequired = 4; // ~32ms sustained
    this._silenceFramesRequired = 138; // ~1.1s

    // Max speech duration cap: 15s = 15000ms / 8ms = 1875 frames
    this._maxSpeechFrames = 1875;

    // Prefix buffer
    this._prefixBuffer = [];
    this._prefixBufferSize = 5;

    // Debug
    this._logInterval = 125;
    this._lastLogFrame = 0;

    // Bandpass filter for speech detection (300Hz – 3500Hz at 16kHz sample rate)
    // Using biquad cookbook formulas (Robert Bristow-Johnson)
    this._initBandpassFilter();
  }

  _initBandpassFilter() {
    const fs = 16000; // sampleRate forced to 16kHz via AudioContext
    const PI = Math.PI;

    // High-pass filter at 300Hz (2nd-order biquad, Butterworth Q=0.707)
    const hpFreq = 300;
    const hpW0 = 2 * PI * hpFreq / fs;
    const hpAlpha = Math.sin(hpW0) / (2 * 0.707);
    const hpCosW0 = Math.cos(hpW0);
    const hpA0 = 1 + hpAlpha;
    this._hp = {
      b0: ((1 + hpCosW0) / 2) / hpA0,
      b1: (-(1 + hpCosW0)) / hpA0,
      b2: ((1 + hpCosW0) / 2) / hpA0,
      a1: (-2 * hpCosW0) / hpA0,
      a2: (1 - hpAlpha) / hpA0,
      x1: 0, x2: 0, y1: 0, y2: 0,
    };

    // Low-pass filter at 3500Hz (2nd-order biquad, Butterworth Q=0.707)
    const lpFreq = 3500;
    const lpW0 = 2 * PI * lpFreq / fs;
    const lpAlpha = Math.sin(lpW0) / (2 * 0.707);
    const lpCosW0 = Math.cos(lpW0);
    const lpA0 = 1 + lpAlpha;
    this._lp = {
      b0: ((1 - lpCosW0) / 2) / lpA0,
      b1: (1 - lpCosW0) / lpA0,
      b2: ((1 - lpCosW0) / 2) / lpA0,
      a1: (-2 * lpCosW0) / lpA0,
      a2: (1 - lpAlpha) / lpA0,
      x1: 0, x2: 0, y1: 0, y2: 0,
    };
  }

  _applyBiquad(filter, sample) {
    const out = filter.b0 * sample + filter.b1 * filter.x1 + filter.b2 * filter.x2
              - filter.a1 * filter.y1 - filter.a2 * filter.y2;
    filter.x2 = filter.x1;
    filter.x1 = sample;
    filter.y2 = filter.y1;
    filter.y1 = out;
    return out;
  }

  _speechBandRMS(float32Data) {
    let sum = 0;
    for (let i = 0; i < float32Data.length; i++) {
      // High-pass then low-pass = bandpass (300–3500Hz)
      const hp = this._applyBiquad(this._hp, float32Data[i]);
      const filtered = this._applyBiquad(this._lp, hp);
      sum += filtered * filtered;
    }
    return Math.sqrt(sum / float32Data.length);
  }

  _toInt16PCM(float32Data) {
    const pcmData = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const val = Math.max(-1, Math.min(1, float32Data[i]));
      pcmData[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
    }
    return pcmData;
  }

  _getSpeechThreshold() {
    return Math.max(this._minSpeechThreshold, this._noiseFloor * this._speechMultiplier);
  }

  _getSilenceThreshold() {
    return Math.max(this._minSpeechThreshold * 0.5, this._noiseFloor * 3.0);
  }

  _finalizeCalibration() {
    // Use the 50th percentile (median) of collected samples as noise floor
    // This is robust against outlier spikes from mic activation
    if (this._calibrationSamples.length === 0) {
      this._noiseFloor = 0.005;
      return;
    }
    this._calibrationSamples.sort((a, b) => a - b);
    const medianIndex = Math.floor(this._calibrationSamples.length / 2);
    this._noiseFloor = this._calibrationSamples[medianIndex];
    this._calibrationSamples = null; // Free memory
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const float32Data = input[0];
    // Use bandpass-filtered RMS (300–3500Hz) for VAD — ignores rumble and hiss
    const rms = this._speechBandRMS(float32Data);
    this._frameCount++;

    // Phase 1: Skip warmup (mic activation artifacts)
    if (this._frameCount <= this._warmupFrames) {
      return true;
    }

    // Convert float32 to 16-bit PCM (already at 16kHz via AudioContext)
    const pcmData = this._toInt16PCM(float32Data);

    // Phase 2: Calibration — collect RMS samples, don't do VAD yet
    if (this._frameCount <= this._calibrationEnd) {
      this._calibrationSamples.push(rms);
      if (this._frameCount === this._calibrationEnd) {
        this._finalizeCalibration();
      }
      return true;
    }

    const speechThreshold = this._getSpeechThreshold();
    const silenceThreshold = this._getSilenceThreshold();

    // Debug logging every ~1s
    if (this._frameCount - this._lastLogFrame >= this._logInterval) {
      this._lastLogFrame = this._frameCount;
      this.port.postMessage({
        type: "debug",
        rms: rms.toFixed(5),
        noiseFloor: this._noiseFloor.toFixed(5),
        speechThreshold: speechThreshold.toFixed(5),
        silenceThreshold: silenceThreshold.toFixed(5),
        speaking: this._speaking,
      });
    }

    // Adaptive noise floor: update only when NOT speaking
    if (!this._speaking) {
      // Only adapt if rms is close to current noise floor (not a speech spike)
      if (rms < this._noiseFloor * 2.0) {
        this._noiseFloor += (rms - this._noiseFloor) * this._noiseFloorAlpha;
      }
    }

    if (!this._speaking) {
      // Buffer audio for prefix padding
      this._prefixBuffer.push(pcmData.buffer.slice(0));
      if (this._prefixBuffer.length > this._prefixBufferSize) {
        this._prefixBuffer.shift();
      }

      // Check for speech onset with hysteresis
      if (rms > speechThreshold) {
        this._speechOnsetCounter++;
        if (this._speechOnsetCounter >= this._speechOnsetFramesRequired) {
          this._speaking = true;
          this._silenceCounter = 0;
          this._speechOnsetCounter = 0;
          this._speechStartFrame = this._frameCount;
          this.port.postMessage({ type: "vad", speaking: true });

          // Flush prefix buffer
          for (const buf of this._prefixBuffer) {
            this.port.postMessage({ type: "audio", buffer: buf }, [buf]);
          }
          this._prefixBuffer = [];

          this.port.postMessage({ type: "audio", buffer: pcmData.buffer }, [pcmData.buffer]);
        }
      } else {
        this._speechOnsetCounter = 0;
      }
    } else {
      // Currently speaking — send audio
      this.port.postMessage({ type: "audio", buffer: pcmData.buffer }, [pcmData.buffer]);

      // Safety net: max speech duration cap (~15s)
      if (this._frameCount - this._speechStartFrame >= this._maxSpeechFrames) {
        this._speaking = false;
        this._silenceCounter = 0;
        this.port.postMessage({ type: "vad", speaking: false });
        return true;
      }

      // Check for silence
      if (rms < silenceThreshold) {
        this._silenceCounter++;
        if (this._silenceCounter >= this._silenceFramesRequired) {
          this._speaking = false;
          this._silenceCounter = 0;
          this.port.postMessage({ type: "vad", speaking: false });
        }
      } else {
        this._silenceCounter = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
