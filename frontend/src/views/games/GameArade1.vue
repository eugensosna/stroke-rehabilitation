<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Hands, type Results as HandResults } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import { WristTracker } from '@/composables/WristTracker';
import { GameArkade } from '@/composables/useGame';
import type { MotionResult, Point2D } from '@/types/game';


const currentPageTitle = ref("Video test");
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const CANVAS_WIDTH = 440
const CANVAS_HEIGHT = 500
let game: GameArkade | null = null;
let ctx: CanvasRenderingContext2D | null = null;
const errorMessage = ref<string | null>(null)
const isRunning = ref(false)
const capturedImage = ref<string | null>(null)

let cameraInstance: Camera | null = null
let handsInstance: Hands | null = null
const isStreaming = ref<boolean>(false);

const startCamera = async () => {
  startTracking();

}

// 1. Створюємо колбеки
const handleMotionComplete = (result: MotionResult) => {
  console.log("Рух завершено:", {
    швидкість_тривалість_мс: result.durationMs,
    довжина_руху: result.distance.toFixed(4),
    звідки: result.startPoint,
    куди: result.endPoint
  });

  if (game) {
    game.movePaddle(result.endPoint);
  }

};

const handleStationary = (point: Point2D) => {
  console.log("Рука не рухається або тремтить (раз на секунду):", point);
  if (game) {
    game.movePaddle(point);
  }
};

// 2. Ініціалізуємо трекер
const tracker: WristTracker = new WristTracker(
  handleMotionComplete,
  handleStationary,
  0.03, // Порог для початку руху
  0.008 // Порог для фільтрації тремтіння
);




function printSessionStatistics() {
  console.log("--- СТАТИСТИКА РУХІВ ЗАП'ЯСТКА ---");
  console.log("Всього рухів зроблено:", tracker.getHistory().length);
  console.log("Найдовший рух:", tracker.getLongestMotion());
  console.log("Найшвидший рух:", tracker.getFastestMotion());
  console.log("Середня довжина руху:", tracker.getAverageDistance().toFixed(4));
  console.log("Середня швидкість руху:", tracker.getAverageSpeed().toFixed(6));
}




const startTracking = async () => {
  errorMessage.value = null

  if (!videoRef.value || !canvasRef.value) return

  const videoElement = videoRef.value
  const canvasElement = canvasRef.value
  const canvasCtx = canvasElement.getContext('2d')

  if (!canvasCtx) return
  if (!isStreaming.value) {
    isStreaming.value = true;
  }
  game = new GameArkade(canvasElement);
  ctx = canvasCtx;

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

    // Keep the canvas at a fixed display size so it does not change after startup.
    if (canvasElement.width !== CANVAS_WIDTH || canvasElement.height !== CANVAS_HEIGHT) {
      canvasElement.width = CANVAS_WIDTH
      canvasElement.height = CANVAS_HEIGHT
    }

    /*
        // Clear and draw the live video frame onto the canvas
        canvasCtx.save()
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
        canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)
    */


    // If hands are detected, loop through them and draw a red circle around the center of the hand
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Landmark 9 is the middle finger MCP (base knuckle),
        // Landmark 0 is the wrist. Averaging them gives a stable center point of the palm.
        const wrist = landmarks[0]
        if (wrist) {
          tracker.update(wrist.x, wrist.y);
        }
        /*
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
                */

      }
    }



    // canvasCtx.restore()
  });



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

const captureFrame = () => {
  if (!videoRef.value || !canvasRef.value) return

  const videoElement = videoRef.value
  const canvasElement = canvasRef.value
  const canvasCtx = canvasElement.getContext('2d')

  if (!canvasCtx) return

  if (canvasElement.width !== CANVAS_WIDTH || canvasElement.height !== CANVAS_HEIGHT) {
    canvasElement.width = CANVAS_WIDTH
    canvasElement.height = CANVAS_HEIGHT
  }

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

  capturedImage.value = canvasElement.toDataURL('image/png')
}

const stopTracking = () => {
  if (cameraInstance) {
    cameraInstance.stop()
    cameraInstance = null
    isStreaming.value = false;
  }
  if (handsInstance) {
    handsInstance.close()
    handsInstance = null
  }
  isRunning.value = false
}

const stopCamera = () => {
  stopTracking();
  // Коли потрібно вивести статистику (наприклад, кнопкою або в кінці сеансу):
  printSessionStatistics();

}


onMounted(() => {
  startTracking();

  const loop = () => {
    if (game && ctx) {
      game.updatePhysics();
      game.draw(ctx);
      requestAnimationFrame(loop);
    }
  };
  loop();
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
        <canvas ref="canvasRef" class="webcam-canvas" width="440" height="500"></canvas>

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
  /* width: 100%; */

  /* border-radius: 8px; */
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
