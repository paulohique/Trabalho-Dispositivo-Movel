import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.2.103:3000',
  timeout: 10000,
});

// Interceptor para adicionar a matrícula do usuário
api.interceptors.request.use(async (config) => {
  const matricula = await AsyncStorage.getItem('@GabiCam:matricula');
  if (matricula) {
    config.headers.matricula = matricula;
  }
  return config;
});

// Interceptor para logs de erro
api.interceptors.response.use(
  response => response,
  error => {
    console.error('Erro na requisição:', error.message);
    if (error.response) {
      console.error('Dados do erro:', error.response.data);
      console.error('Status do erro:', error.response.status);
    }
    return Promise.reject(error);
  }
);

export default api;
