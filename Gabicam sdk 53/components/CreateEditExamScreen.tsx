import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Platform
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';

// Cores do tema neomorphism
const COLORS = {
  primary: '#2F4FCD',
  secondary: '#DDDBFF',
  white: '#FFFFFF',
  shadow: '#1E3299',
  lightShadow: '#3A5CED'
};

// Tipos
interface Exam {
  id: string;
  name: string;
}

interface CreateEditExamScreenProps {
  closeModal: () => void;
}

// Componente NeomorphBox para design neomórfico
const NeomorphBox: React.FC<{
  children: React.ReactNode;
  style?: object;
}> = ({ children, style }) => {
  return (
    <View style={[styles.neomorphBox, style]}>
      <View style={[styles.neomorphInner]}>
        {children}
      </View>
    </View>
  );
};

export const CreateEditExamScreen: React.FC<CreateEditExamScreenProps> = ({ closeModal }) => {
  const [exams, setExams] = useState<Exam[]>([
    { id: '1', name: 'Matemática - Álgebra' },
    { id: '2', name: 'História - Revolução Francesa' }
  ]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [examName, setExamName] = useState('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const addNewExam = () => {
    if (examName.trim() === '') {
      Alert.alert('Erro', 'Por favor, informe um nome para a prova');
      return;
    }

    if (editMode && editingExam) {
      // Atualizar prova existente
      setExams(exams.map(exam => 
        exam.id === editingExam.id ? { ...exam, name: examName } : exam
      ));
      setEditMode(false);
    } else {
      // Adicionar nova prova
      const newExam: Exam = {
        id: Date.now().toString(),
        name: examName
      };
      setExams([...exams, newExam]);
    }
    
    setExamName('');
    setEditingExam(null);
  };

  const deleteExam = (id: string) => {
    Alert.alert(
      'Confirmação',
      'Tem certeza que deseja excluir esta prova?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => setExams(exams.filter(exam => exam.id !== id))
        }
      ]
    );
  };

  const editExam = (exam: Exam) => {
    setEditMode(true);
    setEditingExam(exam);
    setExamName(exam.name);
  };

  const openCamera = async (exam: Exam) => {
    setEditingExam(exam);
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    if (status === 'granted') {
      setShowCameraModal(true);
    } else {
      Alert.alert('Erro', 'Permissão de câmera negada');
    }
  };

  const takePictureTemplate = async () => {
    if (cameraRef.current && editingExam) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setShowCameraModal(false);
        
        // Aqui você enviaria a foto para a API
        Alert.alert('Sucesso', `Gabarito para ${editingExam.name} foi salvo`);
        
      } catch (error) {
        Alert.alert('Erro', 'Houve um problema ao tirar a foto.');
      }
    }
  };

  if (showCameraModal && editingExam) {
    return (
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={CameraType.back}
          ref={cameraRef}
        >
          <View style={styles.cameraControls}>
            <View style={styles.cameraInfo}>
              <Text style={styles.cameraInfoText}>Capturando gabarito para:</Text>
              <Text style={styles.cameraInfoText}>{editingExam.name}</Text>
            </View>
            
            <View style={styles.cameraButtonsRow}>
              <TouchableOpacity 
                style={styles.cancelCameraButton}
                onPress={() => setShowCameraModal(false)}
              >
                <Text style={styles.cancelCameraButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePictureTemplate}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </Camera>
      </View>
    );
  }

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <NeomorphBox style={styles.modalHeader}>
          <Text style={styles.modalHeaderText}>Criar/Editar Provas</Text>
        </NeomorphBox>
        
        <View style={styles.examInputContainer}>
          <NeomorphBox style={styles.examInputBox}>
            <TextInput
              style={styles.examInput}
              placeholder="Nome da prova"
              value={examName}
              onChangeText={setExamName}
            />
          </NeomorphBox>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={addNewExam}
          >
            <Text style={styles.addButtonText}>{editMode ? "✓" : "+"}</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={exams}
          keyExtractor={(item) => item.id}
          style={styles.examList}
          renderItem={({ item }) => (
            <NeomorphBox style={styles.examListItem}>
              <TouchableOpacity 
                style={styles.examNameButton}
                onPress={() => openCamera(item)}
              >
                <Text style={styles.examListName}>{item.name}</Text>
              </TouchableOpacity>
              
              <View style={styles.examActions}>
                <TouchableOpacity 
                  style={styles.examActionButton}
                  onPress={() => editExam(item)}
                >
                  <Text style={styles.examActionButtonText}>✎</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.examActionButton, styles.deleteButton]}
                  onPress={() => deleteExam(item.id)}
                >
                  <Text style={styles.examActionButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </NeomorphBox>
          )}
        />
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={closeModal}
        >
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  neomorphBox: {
    borderRadius: 15,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
    margin: 10
  },
  neomorphInner: {
    borderRadius: 15,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.lightShadow,
        shadowOffset: { width: -6, height: -6 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
      },
    }),
    overflow: 'hidden'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20
  },
  modalHeader: {
    marginBottom: 20
  },
  modalHeaderText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    padding: 10
  },
  examInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  examInputBox: {
    flex: 1,
    marginRight: 10
  },
  examInput: {
    padding: 12,
    fontSize: 16
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  addButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold'
  },
  examList: {
    width: '100%',
  },
  examListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    padding: 10
  },
  examNameButton: {
    flex: 1,
    padding: 5
  },
  examListName: {
    fontSize: 16,
    color: COLORS.primary
  },
  examActions: {
    flexDirection: 'row'
  },
  examActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5
  },
  deleteButton: {
    backgroundColor: '#ffcccc'
  },
  examActionButtonText: {
    fontSize: 18,
    color: COLORS.primary
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white
  },
  cameraContainer: {
    flex: 1
  },
  camera: {
    flex: 1
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 20
  },
  cameraInfo: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
    marginTop: 40
  },
  cameraInfoText: {
    color: COLORS.white,
    fontSize: 16,
    marginVertical: 2
  },
  cameraButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  cancelCameraButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20
  },
  cancelCameraButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold'
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white
  }
});
