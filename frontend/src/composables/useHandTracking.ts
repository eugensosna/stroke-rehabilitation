import { ref, type Ref } from 'vue'
import { Hands, type Results as HandResults } from '@mediapipe/hands'
import { Pose } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'
import type { Point2D } from '@/types/game'

export interface HandTrackingOptions {
  /** Викликається для зап'ястка кожної знайденої руки */
  onWrist: (point: Point2D) => void
  /** Викликається після обробки кадру; wrist — зап'ясток останньої знайденої руки */
  onFrame?: (video: HTMLVideoElement, wrist: Point2D | null) => void
  //Fixme: Pose tracking for future enhancements, research needed.
  trackPose?: boolean
  maxNumHands?: number
}

// Камера + MediaPipe Hands (та, за потреби, Pose)
export function useHandTracking(videoRef: Ref<HTMLVideoElement | null>, options: HandTrackingOptions) {
  const isStreaming = ref(false)
  const errorMessage = ref<string | null>(null)

  let cameraInstance: Camera | null = null
  let handsInstance: Hands | null = null
  let poseInstance: Pose | null = null
  let pumpId: number | null = null
  let isSending = false

  const createPose = (): Pose => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    pose.onResults((results) => {
      if (results.poseLandmarks) {
        const nose = results.poseLandmarks[0]
        console.log(`Nose position: x=${nose.x}, y=${nose.y}, z=${nose.z}`)
      }
    })
    return pose
  }

  const createHands = (videoElement: HTMLVideoElement): Hands => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    })
    hands.setOptions({
      maxNumHands: options.maxNumHands ?? 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true,
    })
    hands.onResults((results: HandResults) => {
      let wristPosition: Point2D | null = null

      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          // Landmark 0 is the wrist.
          const wrist = landmarks[0]
          if (wrist) {
            wristPosition = { x: wrist.x, y: wrist.y, timestamp: Date.now() }
            options.onWrist(wristPosition)
          }
        }
      }

      options.onFrame?.(videoElement, wristPosition)
    })
    return hands
  }

  const start = async (): Promise<void> => {
    errorMessage.value = null
    const videoElement = videoRef.value
    if (!videoElement) return

    isStreaming.value = true
    handsInstance = createHands(videoElement)
    poseInstance = options.trackPose ? createPose() : null

    try {
      cameraInstance = new Camera(videoElement, {
        onFrame: async () => {
          if (videoRef.value && handsInstance) {
            await handsInstance.send({ image: videoRef.value })
            poseInstance?.send({ image: videoRef.value })
          }
        },
        width: 1280,
        height: 720,
      })
      await cameraInstance.start()
    } catch (err) {
      errorMessage.value = 'Could not initialize webcam. Check permissions.'
      console.error(err)
    }
  }

  // Кадри з уже запущеного <video>, коли потоком камери керує сам компонент
  const attach = (): void => {
    const videoElement = videoRef.value
    if (!videoElement || handsInstance) return
    errorMessage.value = null
    handsInstance = createHands(videoElement)
    isStreaming.value = true

    const pump = async () => {
      pumpId = requestAnimationFrame(pump)
      const video = videoRef.value
      // MediaPipe обробляє по одному кадру; поки зайнятий — пропускаємо
      if (isSending || !handsInstance || !video || video.readyState < 2) return
      isSending = true
      try {
        await handsInstance.send({ image: video })
      } catch (err) {
        console.error(err)
      } finally {
        isSending = false
      }
    }
    pump()
  }

  const stop = (): void => {
    if (pumpId !== null) cancelAnimationFrame(pumpId)
    pumpId = null
    cameraInstance?.stop()
    cameraInstance = null
    handsInstance?.close()
    handsInstance = null
    poseInstance?.close()
    poseInstance = null
    isStreaming.value = false
  }

  return { isStreaming, errorMessage, start, attach, stop }
}
