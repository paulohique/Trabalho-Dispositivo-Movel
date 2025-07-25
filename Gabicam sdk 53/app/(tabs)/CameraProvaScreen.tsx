// app/camera-prova.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  TextInput,
  ScrollView,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import HeaderPadrao from '../../components/HeaderPadrao';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Prova {
  id: string;
  nome: string;
  dataCriacao: string;
  fotos: string[];
  gabarito?: string[];
}

interface ImagemCapturada {
  id: string;
  provaId: string;
  nomeAluno: string;
  nomeProva: string;
  imageUri: string;
  dataCriacao: string;
  status: 'pendente' | 'em_analise' | 'corrigido';
  resultado?: {
    acertos: number;
    total: number;
    nota: number;
  };
}

const PROVAS_STORAGE_KEY = '@GabaritoApp:provas';
const IMAGENS_STORAGE_KEY = '@GabaritoApp:imagens';
const NORMALIZED_IMAGES_DIR = `${FileSystem.documentDirectory}normalized_images/`;

export default function CameraProvaScreen() {
  // Unificando a verificação de permissões
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  const [imageUri, setImageUri] = useState<string | null>(null); // Armazena a imagem final (cortada e processada)
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [provas, setProvas] = useState<Prova[]>([]);
  const [selectedProvaId, setSelectedProvaId] = useState<string>('');
  const [nomeAluno, setNomeAluno] = useState('');

  const router = useRouter();

  useEffect(() => {
    carregarProvas();

    const setupDirectory = async () => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(NORMALIZED_IMAGES_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(NORMALIZED_IMAGES_DIR, { intermediates: true });
        }
      } catch (err) {
        console.error("Erro ao criar diretório:", err);
      }
    };

    setupDirectory();
  }, []);

  const carregarProvas = async () => {
    try {
      const provasArmazenadas = await AsyncStorage.getItem(PROVAS_STORAGE_KEY);
      if (provasArmazenadas) {
        const provasData: Prova[] = JSON.parse(provasArmazenadas);
        const provasComGabarito = provasData.filter(p => p.gabarito && p.gabarito.length > 0);
        setProvas(provasComGabarito);

        if (provasComGabarito.length > 0) {
          setSelectedProvaId(provasComGabarito[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as provas.');
    }
  };

  /**
   * Normaliza a imagem (compacta, altera formato se necessário) e salva em um diretório persistente no cache.
   * Substitui FileSystem.moveAsync por FileSystem.copyAsync para maior estabilidade.
   * @param uri URI da imagem original a ser normalizada.
   * @returns URI da imagem normalizada.
   */
  const normalizeImage = async (uri: string): Promise<string> => {
    try {
      const normalizedFilename = `PROVA-OCR_${Date.now()}.jpg`;
      const normalizedFilePath = `${NORMALIZED_IMAGES_DIR}${normalizedFilename}`;

      // Realiza a manipulação da imagem (compressão, formato)
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [], // Nenhuma ação de manipulação adicional como rotate ou flip
        { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Verifica se o arquivo manipulado existe antes de tentar copiá-lo
      const manipFileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      if (!manipFileInfo.exists) {
        // Se o arquivo manipulado não for encontrado, lança um erro.
        throw new Error(`Arquivo manipulado não encontrado em: ${manipResult.uri}`);
      }

      // Copia o arquivo para um local persistente no cache
      // 'copyAsync' é geralmente mais robusto que 'moveAsync' em alguns cenários de cache do Expo.
      await FileSystem.copyAsync({
        from: manipResult.uri,
        to: normalizedFilePath,
      });

      // Opcional: Deleta o arquivo temporário gerado pelo ImageManipulator
      // Isso é seguro porque a cópia já foi concluída.
      // Apenas deleta se o URI manipulado for diferente do URI original de entrada,
      // para evitar deletar a imagem de origem se nenhuma manipulação real ocorreu.
      if (manipResult.uri !== uri) {
          await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
      }

      return normalizedFilePath;
    } catch (error) {
      console.error("Erro ao normalizar imagem:", error);
      // Lança o erro para que a função chamadora (handleImageSelection) possa tratá-lo
      throw error;
    }
  };

  /**
   * Função unificada para lidar com a imagem selecionada (câmera ou galeria).
   * Inicia o processamento e atualiza o estado da URI da imagem.
   * Gerencia estados de loading e erros.
   * @param uri URI da imagem selecionada.
   */
  const handleImageSelection = async (uri: string) => {
      setIsProcessing(true);
      try {
        const processedImageUri = await normalizeImage(uri);
        setImageUri(processedImageUri);
      } catch (error) {
        // Exibe um alerta e define imageUri como null se o processamento falhar
        Alert.alert('Erro', 'Não foi possível processar a imagem.');
        setImageUri(null);
      } finally {
        setIsProcessing(false);
      }
  }

  /**
   * Valida se os campos obrigatórios do formulário foram preenchidos.
   * @returns true se o formulário for válido, false caso contrário.
   */
  const validarFormulario = () => {
    if (!selectedProvaId) {
      Alert.alert('Atenção', 'Selecione uma prova/gabarito para continuar.');
      return false;
    }
    if (!nomeAluno.trim()) {
      Alert.alert('Atenção', 'Digite o nome do aluno para continuar.');
      return false;
    }
    return true;
  }

  /**
   * Inicia a câmera para capturar uma nova imagem.
   * Requer permissão de câmera.
   */
  const usarCamera = async () => {
    if (!validarFormulario()) return;

    const { status } = await requestCameraPermission();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de permissão para acessar a câmera.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Habilita a tela de corte nativa
        aspect: [4, 5],      // Proporção do corte
        quality: 1,
      });

      if (!result.canceled) {
        await handleImageSelection(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao usar a câmera:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a câmera.');
    }
  };

  /**
   * Abre a galeria para selecionar uma imagem existente.
   * Requer permissão da biblioteca de mídia.
   */
  const selecionarDaGaleria = async () => {
    if (!validarFormulario()) return;

    const { status } = await requestMediaLibraryPermission();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de permissão para acessar a galeria.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 1,
      });

      if (!result.canceled) {
        await handleImageSelection(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar da galeria:', error);
      Alert.alert('Erro', 'Não foi possível abrir a galeria.');
    }
  };

  /**
   * Salva a imagem capturada e os dados da prova no armazenamento local.
   */
  const salvarImagem = async () => {
    if (!imageUri) {
      Alert.alert('Erro', 'Nenhuma imagem para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const provaSelecionada = provas.find(p => p.id === selectedProvaId);
      if (!provaSelecionada) throw new Error('Prova não encontrada');

      const novaImagem: ImagemCapturada = {
        id: Date.now().toString(),
        provaId: selectedProvaId,
        nomeAluno: nomeAluno.trim(),
        nomeProva: provaSelecionada.nome,
        imageUri: imageUri, // Salva a URI da imagem final
        dataCriacao: new Date().toLocaleDateString('pt-BR'),
        status: 'pendente'
      };

      const imagensArmazenadas = await AsyncStorage.getItem(IMAGENS_STORAGE_KEY);
      const imagens: ImagemCapturada[] = imagensArmazenadas ? JSON.parse(imagensArmazenadas) : [];
      imagens.push(novaImagem);
      await AsyncStorage.setItem(IMAGENS_STORAGE_KEY, JSON.stringify(imagens));

      const provasArmazenadas = await AsyncStorage.getItem(PROVAS_STORAGE_KEY);
      if (provasArmazenadas) {
        const provasData: Prova[] = JSON.parse(provasArmazenadas);
        const provasAtualizadas = provasData.map(p => {
          if (p.id === selectedProvaId) {
            p.fotos = [...(p.fotos || []), imageUri]; // Salva o caminho real da imagem
          }
          return p;
        });
        await AsyncStorage.setItem(PROVAS_STORAGE_KEY, JSON.stringify(provasAtualizadas));
      }

      Alert.alert('Sucesso', 'Imagem salva!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      console.error('Erro ao salvar imagem:', error);
      Alert.alert('Erro', `Não foi possível salvar a imagem: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Renderiza o formulário de seleção de prova e nome do aluno.
   */
  const renderFormulario = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Nova Captura</Text>
        <Text style={styles.formSubtitle}>Preencha os dados antes de continuar</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Selecione a Prova/Gabarito</Text>
        {provas.length > 0 ? (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedProvaId}
              onValueChange={(itemValue) => setSelectedProvaId(itemValue)}
              style={styles.picker}
              dropdownIconColor="#2F4FCD"
            >
              {provas.map((prova) => (
                <Picker.Item key={prova.id} label={prova.nome} value={prova.id} />
              ))}
            </Picker>
          </View>
        ) : (
          <View style={styles.emptyProvasContainer}>
            <Text style={styles.emptyProvasText}>Nenhuma prova com gabarito encontrada</Text>
            <TouchableOpacity style={styles.createProvaButton} onPress={() => router.push('/CriarEditarProvaScreen')}>
              <Text style={styles.createProvaButtonText}>Criar Prova</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.formLabel}>Nome do Aluno</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome do aluno"
          placeholderTextColor="#999"
          value={nomeAluno}
          onChangeText={setNomeAluno}
        />
        <View style={styles.captureOptions}>
          <TouchableOpacity
            style={[styles.captureButton, (!selectedProvaId || !nomeAluno.trim()) && styles.captureButtonDisabled]}
            onPress={usarCamera}
            disabled={!selectedProvaId || !nomeAluno.trim()}
          >
            <Feather name="camera" size={20} color="#FFF" />
            <Text style={styles.captureButtonText}>Usar Câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.captureButton, styles.galleryButton, (!selectedProvaId || !nomeAluno.trim()) && styles.captureButtonDisabled]}
            onPress={selecionarDaGaleria}
            disabled={!selectedProvaId || !nomeAluno.trim()}
          >
            <Feather name="image" size={20} color="#FFF" />
            <Text style={styles.captureButtonText}>Selecionar da Galeria</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  /**
   * Renderiza a pré-visualização da imagem capturada e opções de salvar/descartar.
   */
  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.previewLabel}>Imagem a ser Salva</Text>
        {isProcessing ? (
          <ActivityIndicator size="large" color="#FFF" />
        ) : (
          // Garante que imageUri não é null antes de usar, ou mostra placeholder
          imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <Text style={{color: '#FFF', textAlign: 'center'}}>Nenhuma imagem selecionada ou processamento falhou.</Text>
          )
        )}
      </View>
      <View style={styles.previewActions}>
        <TouchableOpacity style={[styles.previewButton, styles.cancelButton]} onPress={() => setImageUri(null)} disabled={isSaving}>
          <Feather name="x" size={20} color="#FF6B6B" />
          <Text style={styles.cancelText}>Descartar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.previewButton, styles.saveButton, (isSaving || !imageUri) && styles.saveButtonDisabled]}
          onPress={salvarImagem}
          disabled={isSaving || !imageUri}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Feather name="check" size={20} color="#FFF" />
              <Text style={styles.saveText}>Salvar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderização principal condicional baseada nas permissões e na existência de uma imagem.
  if (!cameraPermission || !mediaLibraryPermission) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#2F4FCD" /></View>;
  }

  if (!cameraPermission.granted || !mediaLibraryPermission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>Precisamos de permissão para câmera e galeria.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={() => { requestCameraPermission(); requestMediaLibraryPermission(); }}>
          <Text style={styles.permissionButtonText}>Conceder Permissões</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (imageUri) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderPreview()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <HeaderPadrao title="Tirar Foto" />
      <ScrollView contentContainerStyle={styles.content}>
        {renderFormulario()}
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos (mantidos os estilos originais, removendo apenas os não utilizados da câmera customizada)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2F4FCD',
    },
    formContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    formHeader: {
        marginBottom: 30,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2F4FCD',
        marginBottom: 8,
    },
    formSubtitle: {
        fontSize: 16,
        color: '#666',
    },
    formCard: {
        backgroundColor: '#F0F2F5',
        borderRadius: 16,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2F4FCD',
        marginBottom: 8,
        marginTop: 16,
    },
    pickerWrapper: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#DDD',
        justifyContent: 'center',
    },
    picker: {
        height: 50,
        color: '#2F4FCD',
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#DDD',
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        minHeight: 50,
    },
    emptyProvasContainer: {
        padding: 20,
        backgroundColor: '#FFF',
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    emptyProvasText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        textAlign: 'center',
    },
    createProvaButton: {
        backgroundColor: '#2F4FCD',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    createProvaButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    captureOptions: {
        marginTop: 24,
    },
    captureButton: {
        backgroundColor: '#2F4FCD',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    galleryButton: {
        backgroundColor: '#27AE60',
    },
    captureButtonDisabled: {
        backgroundColor: '#B0BEC5',
        elevation: 0,
    },
    captureButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
    },
    permissionText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: '#2F4FCD',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    permissionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    previewLabel: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        textAlign: 'center',
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 1,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewActions: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 30,
        left: 20,
        right: 20,
        justifyContent: 'space-between',
    },
    previewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        flex: 0.48,
    },
    cancelButton: {
        backgroundColor: '#444',
        borderWidth: 1,
        borderColor: '#FF6B6B',
    },
    cancelText: {
        color: '#FF6B6B',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    saveButton: {
        backgroundColor: '#2F4FCD',
    },
    saveButtonDisabled: {
        backgroundColor: 'rgba(47, 79, 205, 0.5)',
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    content: {
        padding: 20,
    },
});