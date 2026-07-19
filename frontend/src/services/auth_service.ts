import type { AuthResponse, LoginCredentials } from "../types";
import { api } from "./api";

export const AuthService ={
	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		
		const response = await api.post<AuthResponse>('/auth/login', credentials);
		console.log('AuthService.login response:', response.status, response.data);
		return response.data;

	}
}