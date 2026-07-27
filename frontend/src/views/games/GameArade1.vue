<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Hands, type Results as HandResults } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'

const currentPageTitle = ref("Video test");
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const errorMessage = ref<string | null>(null)
const isRunning = ref(false)

let cameraInstance: Camera | null = null
let handsInstance: Hands | null = null

const startTracking = async () => {
  errorMessage.value = null

  if (!videoRef.value || !canvasRef.value) return

  const videoElement = videoRef.value
  const canvasElement = canvasRef.value
  const canvasCtx = canvasElement.getContext('2d')

  if (!canvasCtx) return

  // 1. Initialize MediaPipe Hands
  handsInstance = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    }
  })

  handsInstance.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  })

  // 2. Handle detection results
  handsInstance.onResults((results: HandResults) => {
    // Match canvas size to video feed dimensions
    if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
      canvasElement.width = videoElement.videoWidth || 640
      canvasElement.height = videoElement.videoHeight || 480
    }

    // Clear and draw the live video frame onto the canvas
    canvasCtx.save()
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

    // If hands are detected, loop through them and draw a red circle around the center of the hand
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Landmark 9 is the middle finger MCP (base knuckle),
        // Landmark 0 is the wrist. Averaging them gives a stable center point of the palm.
        const wrist = landmarks[0]
        const middleFingerMCP = landmarks[9]

        const centerX = ((wrist.x + middleFingerMCP.x) / 2) * canvasElement.width
        const centerY = ((wrist.y + middleFingerMCP.y) / 2) * canvasElement.height

        // Calculate a dynamic radius based on hand scale (distance from wrist to middle finger base)
        const dx = (middleFingerMCP.x - wrist.x) * canvasElement.width
        const dy = (middleFingerMCP.y - wrist.y) * canvasElement.height
        const handSpan = Math.sqrt(dx * dx + dy * dy)
        const radius = handSpan * 1.2 // Scale circle to fit the palm area

        // Draw the red circle
        canvasCtx.beginPath()
        canvasCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
        canvasCtx.lineWidth = 4
        canvasCtx.strokeStyle = '#ff0000'
        canvasCtx.stroke()
      }
    }

    canvasCtx.restore()
  })

  // 3. Setup MediaPipe Camera utility to feed video frames into the Hands model
  try {
    cameraInstance = new Camera(videoElement, {
      onFrame: async () => {
        if (videoRef.value && handsInstance) {
          await handsInstance.send({ image: videoRef.value })
        }
      },
      width: 1280,
      height: 720
    })

    await cameraInstance.start()
    isRunning.value = true
  } catch (err) {
    errorMessage.value = 'Could not initialize webcam. Check permissions.'
    console.error(err)
  }
}

const stopTracking = () => {
  if (cameraInstance) {
    cameraInstance.stop()
    cameraInstance = null
  }
  if (handsInstance) {
    handsInstance.close()
    handsInstance = null
  }
  isRunning.value = false
}

onMounted(() => {
  startTracking()
})

onUnmounted(() => {
  stopTracking()
})
</script>
<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">



      <div class="camera-container">
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Hidden or visible video element acting as the stream source -->
        <video ref="videoRef" autoplay playsinline muted class="hidden-video"></video>

        <!-- Canvas displaying the active video stream feed -->
        <canvas ref="canvasRef" class="webcam-canvas"></canvas>

        <div class="controls">
          <button v-if="isStreaming" @click="captureFrame">Capture Frame</button>
          <button v-if="!isStreaming" @click="startCamera">Start Camera</button>
          <button v-else @click="stopCamera">Stop Camera</button>
        </div>

        <!-- Snapshot Preview -->
        <div v-if="capturedImage" class="preview-container">
          <h3>Captured Snapshot:</h3>
          <img :src="capturedImage" alt="Captured snapshot" class="snapshot-img" />
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.camera-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hidden-video {
  display: none;
}

.webcam-canvas {
  width: 100%;
  max-width: 640px;
  border-radius: 8px;
  background-color: #000;
}

.error-banner {
  color: #dc2626;
  background-color: #fef2f2;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #fecaca;
}

.controls {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1.25rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.snapshot-img {
  max-width: 320px;
  border-radius: 6px;
  border: 1px solid #ccc;
}
</style>
