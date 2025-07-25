// app/teste.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import ImageResizer from 'react-native-image-resizer';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import HeaderPadrao from '../../components/HeaderPadrao';

const API_URL = Platform.OS === 'android'
  ? 'http://192.168.2.103:5000/corrigir'
  : 'http://localhost:5000/corrigir';

// Diretório para salvar as imagens normalizadas
const NORMALIZED_IMAGES_DIR = `${FileSystem.documentDirectory}normalized_images/`;

export default function TesteScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [normalizedImage, setNormalizedImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();

  // Criar o diretório para imagens normalizadas se não existir
  useEffect(() => {
    const setupDirectory = async () => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(NORMALIZED_IMAGES_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(NORMALIZED_IMAGES_DIR, { intermediates: true });
          console.log("Diretório de imagens normalizadas criado");
        }
      } catch (err) {
        console.error("Erro ao criar diretório:", err);
      }
    };
    
    setupDirectory();
  }, []);

  // Função para normalizar a imagem para um formato padronizado
  const normalizeImage = async (imageUri: string) => {
    try {
      setIsLoading(true);
      
      // Verificar se a imagem é do WhatsApp ou screenshot
      const isScreenshot = imageUri.includes('Screenshot') || imageUri.includes('WhatsApp');
      if (isScreenshot) {
        Alert.alert(
          "Atenção",
          "Imagens de capturas de tela ou do WhatsApp podem não ser reconhecidas corretamente. Recomendamos usar a imagem original para melhores resultados.",
          [{ text: "Continuar mesmo assim", style: "default" }]
        );
      }
      
      // Obter informações do arquivo
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      console.log("Informações da imagem original:", fileInfo);
      
      // Criar um nome padronizado para o arquivo
      const timestamp = new Date().getTime();
      const normalizedFilename = `PROVA-OCR-${timestamp}.jpg`;
      const normalizedFilePath = `${NORMALIZED_IMAGES_DIR}${normalizedFilename}`;
      
      // Redimensionar e padronizar a imagem - escolhendo uma resolução adequada
      // que seja suficiente para o reconhecimento mas não muito grande
      const resizedImage = await ImageResizer.createResizedImage(
        imageUri,
        1200, // largura máxima
        1600, // altura máxima
        'JPEG', // formato
        90, // qualidade
        0, // rotação
        normalizedFilePath
      );
      
      console.log("Imagem normalizada:", resizedImage);
      setNormalizedImage(resizedImage.uri);
      
      return resizedImage.uri;
    } catch (error) {
      console.error("Erro ao normalizar imagem:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const selecionarImagem = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        console.log("Imagem selecionada:", result.assets[0].uri);
        
        // Normalizar a imagem selecionada
        await normalizeImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      setError('Erro ao selecionar imagem');
    }
  };

  const fazerRequisicao = async () => {
    if (!normalizedImage && !selectedImage) {
      setError('Selecione uma imagem primeiro');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setUploadProgress(0);
    
    const imageToSend = normalizedImage || selectedImage;

    try {
      // Usar XMLHttpRequest para monitorar o progresso do upload
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Monitorar o progresso do upload
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(percentComplete);
            console.log(`Upload progresso: ${percentComplete.toFixed(2)}%`);
          }
        };
        
        xhr.onreadystatechange = function() {
          console.log("Estado XHR:", xhr.readyState, "Status:", xhr.status);
          
          if (xhr.readyState === 4) {
            setIsLoading(false);
            
            if (xhr.status === 200) {
              try {
                console.log('Resposta bruta:', xhr.responseText);
                const responseData = JSON.parse(xhr.responseText);
                console.log('Resposta parseada:', responseData);
                
                // Verificar se as respostas detectadas são incompletas
                if (responseData.respostas_detectadas && responseData.respostas_detectadas.length < responseData.total_questoes) {
                  Alert.alert(
                    "Aviso",
                    `Apenas ${responseData.respostas_detectadas.length} de ${responseData.total_questoes} questões foram detectadas. Verifique a qualidade da imagem.`,
                    [{ text: "OK", style: "default" }]
                  );
                }
                
                setResponse(responseData);
                resolve(responseData);
              } catch (parseError) {
                console.error('Erro ao analisar resposta:', parseError);
                setError(`Erro ao analisar resposta: ${parseError.message}`);
                reject(parseError);
              }
            } else {
              const errorMsg = `Erro ${xhr.status}: ${xhr.statusText}`;
              console.error(errorMsg);
              setError(errorMsg);
              reject(new Error(errorMsg));
            }
          }
        };
        
        // Abrir requisição para a URL da API
        xhr.open('POST', API_URL);
        console.log('Enviando para URL:', API_URL);
        
        const formData = new FormData();
        
        // Obter o nome de arquivo padronizado
        const filename = "PROVA-OCR.jpg";
        
        // Anexar a imagem normalizada com nome padronizado
        formData.append('imagem', {
          uri: imageToSend,
          name: filename,
          type: 'image/jpeg', // Formato padronizado
        } as any);
        
        // Anexar o gabarito
        formData.append('gabarito', 'ABCDEABCDE');
        
        console.log('Enviando FormData com imagem normalizada');
        
        // Enviar a requisição
        xhr.send(formData);
      });
    } catch (error: any) {
      console.error('Erro na requisição:', error);
      setError(`Erro: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Interface do usuário
  return (
    <ScrollView style={styles.container}>
      <HeaderPadrao title="Teste API" />

      <View style={styles.content}>
        <Text style={styles.title}>Teste de Correção de Provas</Text>
        <Text style={styles.subtitle}>
          Selecione uma imagem de prova para testar a API de correção
        </Text>

        <TouchableOpacity style={styles.selectButton} onPress={selecionarImagem}>
          <Text style={styles.selectButtonText}>Selecionar Imagem</Text>
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageTitle}>Imagem Selecionada:</Text>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          </View>
        )}

        {normalizedImage && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageTitle}>Imagem Normalizada:</Text>
            <Image source={{ uri: normalizedImage }} style={styles.selectedImage} />
          </View>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Enviando: {uploadProgress.toFixed(1)}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.testButton, (!normalizedImage && !selectedImage) && styles.disabledButton]} 
          onPress={fazerRequisicao}
          disabled={!normalizedImage && !selectedImage || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.testButtonText}>Testar Correção</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Erro: {error}</Text>
          </View>
        )}

        {response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseTitle}>Resposta da API:</Text>
            <Text style={styles.responseText}>{JSON.stringify(response, null, 2)}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2F4FCD',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2F4FCD',
  },
  selectButton: {
    backgroundColor: '#2F4FCD',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    marginBottom: 20,
  },
  imageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2F4FCD',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2F4FCD',
    borderRadius: 5,
  },
  testButton: {
    backgroundColor: '#2F4FCD',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  errorText: {
    color: '#c62828',
  },
  responseContainer: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  responseTitle: {
    color: '#2e7d32',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  responseText: {
    color: '#2e7d32',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});