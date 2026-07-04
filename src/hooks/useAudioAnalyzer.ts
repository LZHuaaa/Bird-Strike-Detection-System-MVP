import { useEffect, useRef, useState } from 'react';

export const useAudioAnalyzer = (isRecording: boolean, onDenied: () => void) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array.from({ length: 50 }, () => Math.random() * 100));
  const [frequencyData, setFrequencyData] = useState<number[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      setWaveformData(Array.from({ length: 50 }, () => Math.random() * 100));
      setFrequencyData([]);
      return;
    }

    let isMounted = true;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let freqArray: Uint8Array;
    let source: MediaStreamAudioSourceNode;
    let mediaStream: MediaStream;

    const setupAudio = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        freqArray = new Uint8Array(analyser.frequencyBinCount);
        source = audioContext.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
        mediaStreamRef.current = mediaStream;

        const updateAudio = () => {
          if (!isMounted) return;
          analyser.getByteTimeDomainData(dataArray);
          analyser.getByteFrequencyData(freqArray);

          // Calculate RMS (root mean square) for audio level
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128;
            sumSquares += val * val;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);
          setAudioLevel(Math.min(100, rms * 200));

          // Amplified waveform
          const waveform = Array.from(dataArray).map(v => (((v - 128) / 128) * 50 * 2.5) + 50);
          setWaveformData(waveform);

          // Frequency spectrum
          setFrequencyData(Array.from(freqArray));

          animationFrameRef.current = requestAnimationFrame(updateAudio);
        };
        updateAudio();
      } catch (err) {
        console.error('Audio analyzer setup failed:', err);
        onDenied();
      }
    };

    setupAudio();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
      sourceRef.current = null;
      mediaStreamRef.current = null;
    };
  }, [isRecording, onDenied]);

  return { audioLevel, waveformData, frequencyData };
};
