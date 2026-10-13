import { WristTracker } from '@/composables/WristTracker'
import type { MotionResult, Point2D } from '@/types/game'

// Трекер рухів зап'ястка: рух завершено / рука нерухома -> onMove
export function useWristMotion(onMove: (point: Point2D) => void) {
  const handleMotionComplete = (result: MotionResult) => {
    console.log("Рух завершено:", {
      швидкість_тривалість_мс: result.durationMs,
      довжина_руху: result.distance.toFixed(4),
      звідки: result.startPoint,
      куди: result.endPoint,
    })
    onMove(result.endPoint)
  }

  const handleStationary = (point: Point2D) => {
    console.log("Рука не рухається або тремтить (раз на секунду):", point)
    onMove(point)
  }

  const tracker = new WristTracker(
    handleMotionComplete,
    handleStationary,
    0.03, // Поріг для початку руху
    0.008, // Поріг для фільтрації тремтіння
  )

  const printStatistics = () => {
    console.log("--- СТАТИСТИКА РУХІВ ЗАП'ЯСТКА ---")
    console.log("Всього рухів зроблено:", tracker.getHistory().length)
    console.log("Найдовший рух:", tracker.getLongestMotion())
    console.log("Найшвидший рух:", tracker.getFastestMotion())
    console.log("Середня довжина руху:", tracker.getAverageDistance().toFixed(4))
    console.log("Середня швидкість руху:", tracker.getAverageSpeed().toFixed(6))
  }

  return { tracker, printStatistics }
}
