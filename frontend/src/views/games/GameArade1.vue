<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { Hands, type Results as HandResults } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import AdminLayout from '@/components/layout/AdminLayout.vue';
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue';
import { WristTracker } from '@/composables/WristTracker';
import { GameArcade } from '@/composables/useGame';
import type { MotionResult, Point2D } from '@/types/game';


const currentPageTitle = ref("Video test");
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasVideoRef = ref<HTMLCanvasElement | null>(null)
const CANVAS_WIDTH = 440
const CANVAS_HEIGHT = 500
let game: GameArcade | null = null;
let ctx: CanvasRenderingContext2D | null = null;
const errorMessage = ref<string | null>(null)
const isRunning = ref(false)
const capturedImage = ref<string | null>(null)

let cameraInstance: Camera | null = null
let handsInstance: Hands | null = null
const isStreaming = ref<boolean>(false);

// Логіка для перетягування вікна (Draggable)
const windowPosition = reactive<{ x: number; y: number }>({ x: 300, y: 100 })
let isDragging = false
const dragOffset = reactive<{ x: number; y: number }>({ x: 0, y: 0 })

const startDrag = (event: MouseEvent): void => {
  isDragging = true
  dragOffset.x = event.clientX - windowPosition.x
  dragOffset.y = event.clientY - windowPosition.y

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

const onDrag = (event: MouseEvent): void => {
  if (!isDragging) return
  windowPosition.x = event.clientX - dragOffset.x
  windowPosition.y = event.clientY - dragOffset.y
}

const stopDrag = (): void => {
  isDragging = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}



const handleMotionComplete = (result: MotionResult) => {
  console.log("Рух завершено:", {
    швидкість_тривалість_мс: result.durationMs,
    довжина_руху: result.distance.toFixed(4),
    звідки: result.startPoint,
    куди: result.endPoint
  });

  if (game) {
    console.log("Рух завершено, рухаємо палицю:", result.endPoint);
    game.movePaddle(result.endPoint);
  }

};

const handleStationary = (point: Point2D) => {
  console.log("Рука не рухається або тремтить (раз на секунду):", point);
  if (game) {
    game.movePaddle(point);
  } else {
    console.log("Game instance not initialized yet.");
  }
};

// 2. Ініціалізуємо трекер
const tracker: WristTracker = new WristTracker(
  handleMotionComplete,
  handleStationary,
  0.03, // Поріг для початку руху
  0.008 // Поріг для фільтрації тремтіння
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
  game = new GameArcade(canvasElement);
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
    minTrackingConfidence: 0.5,
    selfieMode: true
  })




  // 2. Handle detection results
  handsInstance.onResults((results: HandResults) => {
    let wristPosition: Point2D | null = null;

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


    // If hands are detected, loop through them and update tracker state.
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Landmark 9 is the middle finger MCP (base knuckle),
        // Landmark 0 is the wrist. Averaging them gives a stable center point of the palm.
        const wrist = landmarks[0]
        if (wrist) {
          wristPosition = { x: wrist.x, y: wrist.y };
          tracker.update(wrist.x, wrist.y);
        }
      }
    }

    // Draw the live video frame to the floating overlay canvas.
    const overlayCanvas = canvasVideoRef.value
    if (overlayCanvas) {
      const overlayCtx = overlayCanvas.getContext('2d')
      if (overlayCtx) {
        const canvasWidth = overlayCanvas.width;
        const canvasHeight = overlayCanvas.height;
        overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight)

        // Mirror the overlay video horizontally
        overlayCtx.save()
        overlayCtx.translate(canvasWidth, 0)
        overlayCtx.scale(-1, 1)
        overlayCtx.drawImage(videoElement, 0, 0, canvasWidth, canvasHeight)
        overlayCtx.restore()

        if (wristPosition) {
          // Mirror the wrist marker position too
          // const mirroredX = canvasWidth - wristPosition.x * canvasWidth
          overlayCtx.beginPath()
          overlayCtx.arc(wristPosition.x * canvasWidth, wristPosition.y * canvasHeight, 10, 0, 2 * Math.PI)
          overlayCtx.fillStyle = 'rgba(255, 0, 0, 0.7)'
          overlayCtx.fill()
        }
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
    isStreaming.value = true;
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
      // console.log("Game loop running...:", counter);
    }
    else {
      console.log("Game or context not initialized yet.");
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

      <!-- Плавуче вікно -->
      <div class="floating-window" :style="{ top: windowPosition.y + 'px', left: windowPosition.x + 'px' }">
        <!-- Шапка вікна, за яку можна перетягувати -->
        <div class="window-header" @mousedown="startDrag">
          <div v-if="isStreaming">
            <canvas ref="canvasVideoRef" class="webcam-canvas"></canvas>

          </div>
          <span class="window-title">Camera Stream</span>
          <span class="drag-handle">⠿</span>
        </div>
      </div>







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
          <!--Fixme: <button v-if="!isStreaming" @click="startCamera">Start Camera</button> -->
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
/* Стилі для плавучого вікна */
.floating-window {
  position: fixed;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-width: 100px;
  min-height: 100px;
  transition: transform 0.2s ease-in-out;
}
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
