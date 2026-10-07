import { api } from './api'
import type { GameSessionRequest, GameSessionResponse } from '@/types/game'

export const GameSessionService = {
  async save(session: GameSessionRequest): Promise<GameSessionResponse> {
    const response = await api.post<GameSessionResponse>('/game-sessions', session)
    return response.data
  },

  async mySessions(): Promise<GameSessionResponse[]> {
    const response = await api.get<GameSessionResponse[]>('/game-sessions/my')
    return response.data
  },
}
