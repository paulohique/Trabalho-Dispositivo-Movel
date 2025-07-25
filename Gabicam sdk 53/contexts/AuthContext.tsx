import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import api from '../services/api';

interface User {
  id: number;
  matricula: string;
  nome: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (matricula: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadStoredUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      const inAuthGroup = segments[0] === '(auth)';
      const isCadastroScreen = segments[0] === 'cadastro';
      const isLoginScreen = segments[0] === 'login';
      
      if (!user && !inAuthGroup && !isCadastroScreen && !isLoginScreen) {
        router.replace('/login');
      } else if (user && (inAuthGroup || isLoginScreen)) {
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, segments]);

  async function loadStoredUser() {
    try {
      const storedUser = await AsyncStorage.getItem('@GabiCam:user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(matricula: string, senha: string) {
    try {
      const response = await api.post('/api/login', { matricula, senha });
      const userData = response.data;

      await AsyncStorage.setItem('@GabiCam:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@GabiCam:matricula', matricula);
      setUser(userData);
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.error || 'Erro ao fazer login');
      }
      throw new Error('Erro ao conectar com o servidor');
    }
  }

  async function signOut() {
    try {
      await AsyncStorage.removeItem('@GabiCam:user');
      await AsyncStorage.removeItem('@GabiCam:matricula');
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
} 