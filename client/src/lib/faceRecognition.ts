import * as faceapi from "@vladmandic/face-api";

const MODEL_BASE = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_BASE),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE),
  ]);
  modelsLoaded = true;
}

export async function extractFaceDescriptor(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement,
): Promise<number[] | null> {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(videoOrCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection?.descriptor) return null;
  return Array.from(detection.descriptor);
}

export function descriptorDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Enrollment: two scans must match (same person). */
export function verifyEnrollmentPair(a: number[], b: number[], maxDistance = 0.45): boolean {
  return descriptorDistance(a, b) <= maxDistance;
}
