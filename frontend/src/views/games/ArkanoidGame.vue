<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import SaveStatusBanner from '@/components/games/SaveStatusBanner.vue'
import ArkanoidEndPanel from '@/components/games/arkanoid/ArkanoidEndPanel.vue'
import ArkanoidHud from '@/components/games/arkanoid/ArkanoidHud.vue'
import ArkanoidMenu from '@/components/games/arkanoid/ArkanoidMenu.vue'
import ArkanoidPausePanel from '@/components/games/arkanoid/ArkanoidPausePanel.vue'
import CameraControls from '@/components/games/arkanoid/CameraControls.vue'
import CameraFloatWindow from '@/components/games/arkanoid/CameraFloatWindow.vue'
import { H, W } from '@/composables/arkanoid/config'
import { useArkanoidEngine } from '@/composables/arkanoid/useArkanoidEngine'
import { useArkanoidInput } from '@/composables/arkanoid/useArkanoidInput'
import { loadArkanoidSettings, useArkanoidSettings } from '@/composables/arkanoid/useArkanoidSettings'
import { useCameraMode } from '@/composables/arkanoid/useCameraMode'
import { useWristPaddle } from '@/composables/arkanoid/useWristPaddle'
import { useWebcamStream } from '@/composables/useWebcamStream'
import { AuthStore } from '@/store/auth_store'

const GAME_NAME = 'arkade2'
const currentPageTitle = ref('Arkanoid')
const canvas = ref<HTMLCanvasElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
const authStore = AuthStore()

// Камера: потік, режим показу, керування зап'ястком; налаштування відновлюються з localStorage
const savedSettings = loadArkanoidSettings()
const webcam = useWebcamStream(videoEl)
const camera = useCameraMode(videoEl, webcam, () => wrist.enabled.value)
const wrist = useWristPaddle(videoEl, webcam, {
  gameName: GAME_NAME,
  isPlaying: () => engine.screen.value === 'playing',
  keepStream: () => camera.mode.value !== 'off',
  enabledDetection: savedSettings.handControl,
})
useArkanoidSettings(savedSettings, camera, wrist.enabled)

// Гра і введення
const engine = useArkanoidEngine(canvas, {
  keyDirection: () => input.keyDirection(),
  // зап'ясток має пріоритет над мишею, поки рука в кадрі
  paddleTarget: () => wrist.targetX() ?? input.pointerX(),
  layers: { background: camera.drawBackground, afterPaddle: wrist.drawMarker },
  onGameStart: wrist.beginSession,
  onGameEnd: wrist.endSession,
})
const input = useArkanoidInput(canvas, {
  onPrimary: engine.primaryAction,
  onPause: engine.togglePause,
  onLaunch: engine.launch,
})

const { screen, difficulty, diffConfig, score, lives, wave, fps, ballSpeed, sfxOn, musicOn } = engine
const { stream: camStream, loading: cameraLoading, error: cameraError } = webcam
const { mode: cameraMode, opacity: camOpacity } = camera
const { enabled: handControl, saveStatus } = wrist
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="game-wrapper">
      <!-- Прихований video-елемент: джерело кадрів для canvas-фону і MediaPipe -->
      <video ref="videoEl" class="cam-video-src" muted playsinline autoplay />

      <Transition name="fade" mode="out-in">
        <ArkanoidMenu v-if="screen === 'menu'" key="menu" v-model:difficulty="difficulty" @start="engine.startGame" />
        <ArkanoidPausePanel v-else-if="screen === 'paused'" key="paused" @resume="engine.togglePause"
          @menu="engine.backToMenu" />
        <ArkanoidEndPanel v-else-if="screen === 'gameover' || screen === 'win'" :key="screen" :result="screen"
          :score="score" @restart="engine.startGame" @menu="engine.backToMenu">
          <SaveStatusBanner :status="saveStatus" :is-authenticated="authStore.isAuthenticated"
            redirect-path="/game/arkade2" />
        </ArkanoidEndPanel>
      </Transition>

      <div class="stage">
        <ArkanoidHud v-model:sfx-on="sfxOn" v-model:music-on="musicOn" :score="score" :lives="lives"
          :difficulty="diffConfig" :ball-speed="ballSpeed" :wave="wave" :fps="fps" :screen="screen"
          :camera-mode="cameraMode" :camera-loading="cameraLoading" :hand-control="handControl"
          @cycle-camera="camera.cycle" @toggle-hand="wrist.toggle" @toggle-pause="engine.togglePause"
          @restart="engine.startGame" />

        <div v-if="cameraError" class="cam-error">⚠️ {{ cameraError }}</div>

        <CameraControls v-if="cameraMode !== 'off'" v-model:opacity="camOpacity" :mode="cameraMode"
          @set-mode="camera.setMode" />

        <canvas ref="canvas" class="game-canvas" :width="W" :height="H" @pointermove="input.onPointerMove"
          @pointerdown="input.onPointerDown" @pointerleave="input.onPointerLeave" />

        <CameraFloatWindow v-if="cameraMode === 'float'" :stream="camStream" :bounds-width="W" :bounds-height="H"
          @close="camera.setMode('off')" />
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.game-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  border-radius: 14px;
  padding: 18px;
  background: radial-gradient(circle at 50% 0%, #13173a 0%, #05060f 70%);
  color: #e2e8f0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}

/* Приховане джерело відео для канвас-фону */
.cam-video-src {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* ------------------------------------------ Stage + Canvas */
.stage {
  position: relative;
  width: min(800px, 96vw);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-canvas {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  background: #0b1026;
  border: 1px solid rgba(125, 211, 252, 0.18);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 8px 40px rgba(56, 189, 248, 0.09),
    0 2px 12px rgba(0, 0, 0, 0.5);
  cursor: none;
  touch-action: none;
}

.cam-error {
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  font-size: 13px;
}

/* ------------------------------------------ Анімації */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
