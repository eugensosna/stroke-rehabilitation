import axios from 'axios'
const baseURL =  '/api';
export const  api = axios.create({
  baseURL: baseURL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
api.interceptors.request.use((request) => {
  console.log('Axios Outgoing Request:', request.method?.toUpperCase(), request.url, request.data);
  return request;
}, (error) => {
  console.error('Axios Request Error:', error);
  return Promise.reject(error);
});

// Redirect to login on 401
api.interceptors.response.use(

  (response) => {
    console.log('Axios Incoming Response:', response.status, response.data);
    // Unwrap ApiResponse<T> envelope from Spring Boot backend
    if (
      response.data !== null &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'message' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data
    }
    return response
  },
  (error) => {
    console.error('Axios Error Object:',  error.response?.status, error.response?.data || error.message);
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  (response) => {
    console.log('Axios Incoming Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Axios Error Object:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

