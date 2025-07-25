// app/scan.tsx
import React, { useRef, useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Pressable,
  Platform,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { 
  CameraView,
  CameraType,
  useCameraPermissions
} from 'expo-camera';
import { useRouter } from 'expo-router';
import HeaderPadrao from '../../components/HeaderPadrao';

// Interface para tipagem das provas
interface Prova {
  id: string;
  nome: string;
}

export default function ScanScreen() {
  // Estados para permissões e camera
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Estados para fluxo de correção
  const [provas, setProvas] = useState<Prova[]>([]);
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null);
  const [nomeAluno, setNomeAluno] = useState('');
  const [showProvaModal, setShowProvaModal] = useState(true);
  const [showAlunoModal, setShowAlunoModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
  // Simulando carregamento de provas da API
  useEffect(() => {
    const carregarProvas = async () => {
      // Em uma app real, aqui seria uma chamada à API para obter as provas
      const mockProvas: Prova[] = [
        { id: '1', nome: 'Prova de Matemática' },
        { id: '2', nome: 'Prova de Português' },
        { id: '3', nome: 'Prova de Ciências' },
        { id: '4', nome: 'Prova de História' },
        { id: '5', nome: 'Prova de Geografia' },
      ];
      
      setProvas(mockProvas);
    };
    
    carregarProvas();
  }, []);
  
  // Verificação de permissão
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F4FCD" />
      </View>
    );
  }

  if (showCamera && !permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>Precisamos de permissão para acessar sua câmera</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Conceder permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const selecionarProva = (prova: Prova) => {
    setProvaSelecionada(prova);
    setShowProvaModal(false);
    setShowAlunoModal(true);
  };
  
  const confirmarAluno = () => {
    if (nomeAluno.trim() === '') {
      Alert.alert('Aviso', 'Por favor, informe o nome do aluno');
      return;
    }
    
    setShowAlunoModal(false);
    setShowCamera(true);
  };
  
  const toggleFacing = () => {
    setFacing(prev => prev === 'back' ? 'front' : 'back');
  };

  const captureImage = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      setCapturedImage(photo.uri);
    } catch (error) {
      console.error('Erro ao capturar imagem:', error);
      Alert.alert('Erro', 'Não foi possível capturar a imagem.');
    }
  };
  
  const processarImagem = async () => {
    if (!capturedImage || !provaSelecionada) return;
    
    try {
      setIsProcessing(true);
      
      // Aqui você enviaria a imagem para a API
      // const formData = new FormData();
      // formData.append('provaId', provaSelecionada.id);
      // formData.append('nomeAluno', nomeAluno);
      // formData.append('image', {
      //   uri: capturedImage,
      //   type: 'image/jpeg',
      //   name: 'correcao_prova.jpg'
      // });
      
      // Simulando chamada de API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // const response = await fetch('SUA_API_URL/correcao', {
      //   method: 'POST',
      //   body: formData,
      //   headers: {
      //     'Content-Type': 'multipart/form-data',
      //   }
      // });
      
      // const result = await response.json();
      
      Alert.alert(
        'Sucesso!', 
        `Prova de ${nomeAluno} corrigida com sucesso!`,
        [
          { 
            text: 'Ver resultados', 
            onPress: () => {
              // Aqui você navegaria para uma tela de resultados
              // router.push(`/resultados/${provaSelecionada.id}/${encodeURIComponent(nomeAluno)}`);
              
              // Por enquanto, vamos apenas resetar o fluxo
              resetarFluxo();
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      Alert.alert('Erro', 'Não foi possível processar a correção.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetarFluxo = () => {
    setCapturedImage(null);
    setProvaSelecionada(null);
    setNomeAluno('');
    setShowCamera(false);
    setShowProvaModal(true);
  };
  
  const renderModalProva = () => {
    return (
      <Modal
        visible={showProvaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => router.back()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Prova</Text>
            
            <FlatList
              data={provas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.provaItem}
                  onPress={() => selecionarProva(item)}
                >
                  <Feather name="file-text" size={20} color="#2F4FCD" />
                  <Text style={styles.provaItemText}>{item.nome}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.provasList}
            />
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderModalAluno = () => {
    return (
      <Modal
        visible={showAlunoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAlunoModal(false);
          setShowProvaModal(true);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nome do Aluno</Text>
            <Text style={styles.modalSubtitle}>
              Prova: {provaSelecionada?.nome}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Digite o nome do aluno"
              value={nomeAluno}
              onChangeText={setNomeAluno}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowAlunoModal(false);
                  setShowProvaModal(true);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmarAluno}
              >
                <Text style={styles.modalConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderPreview = () => {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewHeaderText}>
            Corrigindo prova de {nomeAluno}
          </Text>
        </View>
        
        <Image 
          source={{ uri: capturedImage }} 
          style={styles.previewImage}
          resizeMode="contain"
        />
        
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#2F4FCD" />
            <Text style={styles.processingText}>
              Processando correção...
            </Text>
          </View>
        ) : (
          <View style={styles.previewActions}>
            <TouchableOpacity 
              style={[styles.previewButton, styles.previewCancelButton]}
              onPress={() => setCapturedImage(null)}
            >
              <Feather name="refresh-ccw" size={20} color="#FF6B6B" />
              <Text style={styles.previewCancelText}>Nova foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.previewButton, styles.previewConfirmButton]}
              onPress={processarImagem}
            >
              <Feather name="check" size={20} color="#FFF" />
              <Text style={styles.previewConfirmText}>Processar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  const renderCamera = () => {
    return (
      <>
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          mode="picture"
          facing={facing}
          mute={true}
          responsiveOrientationWhenOrientationLocked
        >
          <View style={styles.cameraHeader}>
            <View style={styles.cameraHeaderInfo}>
              <Text style={styles.cameraHeaderTitle}>
                {provaSelecionada?.nome}
              </Text>
              <Text style={styles.cameraHeaderSubtitle}>
                Aluno: {nomeAluno}
              </Text>
            </View>
          </View>
          
          <View style={styles.overlayContainer}>
            <View style={styles.frameGuide}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            <Text style={styles.guideText}>
              Posicione a prova dentro da moldura
            </Text>
          </View>
          
          <View style={styles.shutterContainer}>
            <Pressable onPress={() => resetarFluxo()}>
              <Feather name="x" size={32} color="white" />
            </Pressable>
            
            <Pressable onPress={captureImage}>
              {({ pressed }) => (
                <View
                  style={[
                    styles.shutterBtn,
                    {
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View style={styles.shutterBtnInner} />
                </View>
              )}
            </Pressable>
            
            <Pressable onPress={toggleFacing}>
              <Feather name="refresh-cw" size={32} color="white" />
            </Pressable>
          </View>
        </CameraView>
      </>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <HeaderPadrao title="Scanner de Provas" />
      
      {renderModalProva()}
      {renderModalAluno()}
      
      {showCamera && !capturedImage && renderCamera()}
      
      {capturedImage && renderPreview()}
      
      {!showCamera && !showProvaModal && !showAlunoModal && !capturedImage && (
        // Tela de carregamento caso todas as modais estejam fechadas mas ainda não foi para câmera
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2F4FCD" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#2F4FCD',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#2F4FCD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    // Estilo neomorphism
    shadowColor: 'rgba(47, 79, 205, 0.5)',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  // Estilos modal de seleção de prova
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    // Estilo neomorphism
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  provasList: {
    maxHeight: 300,
  },
  provaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DDDBFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    // Estilo neomorphism
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -3, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  provaItemText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#2F4FCD',
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  // Estilos modal de nome do aluno
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F7',
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  modalConfirmButton: {
    backgroundColor: '#2F4FCD',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  // Estilos da câmera
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  cameraHeaderInfo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 10,
  },
  cameraHeaderTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  cameraHeaderSubtitle: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  frameGuide: {
    width: '80%',
    height: '60%',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    height: 20,
    width: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2F4FCD',
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    height: 20,
    width: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2F4FCD',
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    height: 20,
    width: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2F4FCD',
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    height: 20,
    width: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2F4FCD',
  },
  guideText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
  },
  shutterContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  shutterBtn: {
    backgroundColor: 'transparent',
    borderWidth: 5,
    borderColor: 'white',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2F4FCD',
  },
  // Estilos da tela de preview
  previewContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  previewHeader: {
    backgroundColor: '#2F4FCD',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  previewHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    justifyContent: 'space-between',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.48,
    // Estilo neomorphism
    shadowColor: '#BBBADD',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  previewCancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDBFF',
  },
  previewCancelText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginLeft: 8,
  },
  previewConfirmButton: {
    backgroundColor: '#2F4FCD',
  },
  previewConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginLeft: 8,
  },
  // Estilo processando
  processingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginLeft: 10,
  },
});