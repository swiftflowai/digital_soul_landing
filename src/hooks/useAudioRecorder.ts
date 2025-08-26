import { useEffect, useRef, useState } from "react";

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  }

  async function stop(): Promise<Blob>  {
    const mr = mediaRecorderRef.current;
    if (!mr) throw new Error("Not recording");
    return new Promise((resolve) => {
      mr.onstop = () => {
        const preferredType = (mr as any).mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: preferredType });
        setRecording(false);
        resolve(blob);
      };
      mr.stop();
    });
  }

  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
  }, []);

  return { recording, start, stop };
}


