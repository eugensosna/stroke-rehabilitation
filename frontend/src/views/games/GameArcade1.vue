<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import CameraOverlayWindow from '@/components/games/CameraOverlayWindow.vue'
import GameControls from '@/components/games/GameControls.vue'
import SaveStatusBanner from '@/components/games/SaveStatusBanner.vue'
import { useArcadeGame } from '@/composables/useArcadeGame'
import { useGameSession } from '@/composables/useGameSession'
import { useHandTracking } from '@/composables/useHandTracking'
import { useWristMotion } from '@/composables/useWristMotion'
import { AuthStore } from '@/store/auth_store'

const GAME_NAME = 'arkade'
const CANVAS_WIDTH = 440
const CANVAS_HEIGHT = 500

const currentPageTitle = ref('Video test')
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const overlayRef = ref<InstanceType<typeof CameraOverlayWindow> | null>(null)

const authStore = AuthStore()
const game = useArcadeGame(canvasRef)
const { tracker, printStatistics } = useWristMotion(game.movePaddle)
const session = useGameSession(GAME_NAME, () => tracker.getHistory())
const { saveStatus } = session

const { isStreaming, errorMessage, ...camera } = useHandTracking(videoRef, {
  onWrist: (point) => {
    tracker.update(point.x, point.y)
    game.movePaddle(point)
  },
  onFrame: (video, wrist) => overlayRef.value?.drawFrame(video, wrist),
  trackPose: true,
})

const startGame = () => {
  if (!game.start()) return
  // рахуємо лише рухи, зроблені під час гри
  tracker.clearHistory()
  session.begin()
}

const stopGame = () => {
  if (!game.stop()) return
  printStatistics()
  session.save()
}

onMounted(() => {
  game.init()
  camera.start()
})

onUnmounted(() => {
  // користувач пішов зі сторінки посеред гри — не втрачаємо статистику
  if (game.isGameRunning.value) {
    game.isGameRunning.value = false
    session.save()
  }
  camera.stop()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <CameraOverlayWindow ref="overlayRef" :visible="isStreaming" />

      <div class="camera-container">
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Hidden video element acting as the stream source -->
        <video ref="videoRef" autoplay playsinline muted class="hidden-video"></video>

        <canvas ref="canvasRef" class="webcam-canvas" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT"></canvas>

        <GameControls :is-game-running="game.isGameRunning.value" @start="startGame" @stop="stopGame" />

        <SaveStatusBanner
          :status="saveStatus"
          :is-authenticated="authStore.isAuthenticated"
          redirect-path="/game/arkade"
        />
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
  background-color: #000;
}

.error-banner {
  color: #dc2626;
  background-color: #fef2f2;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #fecaca;
}
</style>
