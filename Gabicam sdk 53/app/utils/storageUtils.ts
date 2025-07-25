// app/utils/storageUtils.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Todas as chaves do AsyncStorage usadas no app
export const STORAGE_KEYS = {
  PROVAS: '@GabaritoApp:provas',
  IMAGENS: '@GabaritoApp:imagens',
};

// Função para limpar todo o armazenamento local
export const limparTodoArmazenamento = async () => {
  try {
    // Obter todas as chaves
    const keys = Object.values(STORAGE_KEYS);
    
    // Remover todas as chaves
    await AsyncStorage.multiRemove(keys);
    
    Alert.alert(
      'Sucesso',
      'Todos os dados foram removidos com sucesso!',
      [{ text: 'OK' }]
    );
    return true;
  } catch (error) {
    console.error('Erro ao limpar armazenamento:', error);
    Alert.alert(
      'Erro',
      'Não foi possível limpar o armazenamento.'
    );
    return false;
  }
};

// Função para limpar apenas as provas
export const limparProvas = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PROVAS);
    console.log('Provas removidas com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao limpar provas:', error);
    return false;
  }
};

// Função para limpar apenas as imagens
export const limparImagens = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.IMAGENS);
    console.log('Imagens removidas com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao limpar imagens:', error);
    return false;
  }
};

// Função para debug - visualizar todos os dados armazenados
export const debugStorage = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    const results = await AsyncStorage.multiGet(keys);
    
    console.log('=== Dados Armazenados ===');
    results.forEach(([key, value]) => {
      console.log(`Key: ${key}`);
      console.log(`Value: ${value ? JSON.parse(value) : 'null'}`);
      console.log('------------------------');
    });
  } catch (error) {
    console.error('Erro ao debugar storage:', error);
  }
};