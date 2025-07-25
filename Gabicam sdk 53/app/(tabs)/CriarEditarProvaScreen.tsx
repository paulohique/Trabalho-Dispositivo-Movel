// app/criar-editar-prova.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import HeaderPadrao from '../../components/HeaderPadrao';

// Interface para tipagem das provas
interface Prova {
  id: string;
  nome: string;
  dataCriacao: string;
  fotos: string[];
  nota_por_questao?: number;
  gabarito?: string[];
}

const STORAGE_KEY = '@GabaritoApp:provas';

export default function CriarEditarProvaScreen() {
  const [provas, setProvas] = useState<Prova[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState<string | null>(null);
  const [novaProva, setNovaProva] = useState('');
  const [provaEmEdicao, setProvaEmEdicao] = useState<Prova | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const [notaPorQuestao, setNotaPorQuestao] = useState('');
  const [notaPorQuestaoEdicao, setNotaPorQuestaoEdicao] = useState('');

  // Carregar provas do AsyncStorage quando o componente montar
  useEffect(() => {
    carregarProvas();
  }, []);

  // Função para carregar provas do AsyncStorage
  const carregarProvas = async () => {
    try {
      const provasArmazenadas = await AsyncStorage.getItem(STORAGE_KEY);
      if (provasArmazenadas !== null) {
        setProvas(JSON.parse(provasArmazenadas));
      }
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as provas salvas');
    }
  };

  // Função para salvar provas no AsyncStorage
  const salvarProvas = async (novasProvas: Prova[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novasProvas));
    } catch (error) {
      console.error('Erro ao salvar provas:', error);
      Alert.alert('Erro', 'Não foi possível salvar as provas');
    }
  };

  // Função para criar uma nova prova
  const criarNovaProva = async () => {
    if (novaProva.trim() === '') {
      Alert.alert('Erro', 'O nome da prova não pode estar vazio');
      return;
    }
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }
    if (isNaN(Number(notaPorQuestao)) || Number(notaPorQuestao) <= 0) {
      Alert.alert('Erro', 'A nota por questão deve ser um número maior que zero');
      return;
    }
    setIsCreating(true);
    try {
      // Criar prova no banco de dados
      const response = await api.post('/api/provas/criar-prova', {
        nome: novaProva.trim(),
        gabarito: null, // Será definido posteriormente na tela de gabarito
        nota_por_questao: Number(notaPorQuestao)
      });
      const provaCriada = response.data.prova;
      // Criar objeto para armazenamento local
      const novaProvaObj: Prova = {
        id: provaCriada.id.toString(),
        nome: provaCriada.nome,
        dataCriacao: new Date(provaCriada.data_criacao).toLocaleDateString('pt-BR'),
        fotos: [],
        nota_por_questao: provaCriada.nota_por_questao
      };
      // Atualizar estado local
      const provasAtualizadas = [...provas, novaProvaObj];
      setProvas(provasAtualizadas);
      await salvarProvas(provasAtualizadas);
      setNovaProva('');
      setNotaPorQuestao('');
      setModalVisible(false);
      // Redirecionar automaticamente para a tela de criar gabarito
      router.push({
        pathname: '/CadastrarQuestoes',
        params: { provaId: provaCriada.id.toString() }
      });
    } catch (error: any) {
      console.error('Erro ao criar prova:', error);
      let errorMessage = 'Não foi possível criar a prova.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Função para renomear uma prova
  const renomearProva = async () => {
    if (!provaEmEdicao) return;
    if (provaEmEdicao.nome.trim() === '') {
      Alert.alert('Erro', 'O nome da prova não pode estar vazio');
      return;
    }
    if (isNaN(Number(notaPorQuestaoEdicao)) || Number(notaPorQuestaoEdicao) <= 0) {
      Alert.alert('Erro', 'O valor por questão deve ser um número maior que zero');
      return;
    }
    try {
      // Buscar o gabarito atual da prova (se existir)
      const gabarito = provaEmEdicao.gabarito || [];
      // Atualizar no backend usando o endpoint correto
      await api.put(`/api/provas/atualizar-gabarito/${provaEmEdicao.id}`, {
        nome: provaEmEdicao.nome,
        gabarito,
        nota_por_questao: Number(notaPorQuestaoEdicao)
      });
      // Atualizar localmente
      const provasAtualizadas = provas.map((p) =>
        p.id === provaEmEdicao.id ? { ...provaEmEdicao, nota_por_questao: Number(notaPorQuestaoEdicao) } : p
      );
      setProvas(provasAtualizadas);
      await salvarProvas(provasAtualizadas);
      setEditModalVisible(false);
      setProvaEmEdicao(null);
      setNotaPorQuestaoEdicao('');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o valor da questão');
    }
  };

  // Função para apagar uma prova
  const apagarProva = (id: string) => {
    Alert.alert('Confirmação', 'Tem certeza que deseja excluir esta prova?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            // Deletar do banco de dados
            await api.delete(`/api/provas/deletar-prova/${id}`);
            
            // Remover do armazenamento local
            const provasAtualizadas = provas.filter((p) => p.id !== id);
            setProvas(provasAtualizadas);
            await salvarProvas(provasAtualizadas);
            setActionMenuVisible(null);
            
            Alert.alert('Sucesso', 'Prova excluída com sucesso!');
          } catch (error: any) {
            console.error('Erro ao deletar prova:', error);
            let errorMessage = 'Não foi possível excluir a prova.';
            
            if (error.response?.data?.error) {
              errorMessage = error.response.data.error;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            Alert.alert('Erro', errorMessage);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <HeaderPadrao title="Minhas Provas" />

      {provas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="file-text" size={60} color="#2F4FCD" />
          </View>
          <Text style={styles.emptyText}>Nenhuma prova cadastrada</Text>
          <Text style={styles.emptySubText}>
            Toque no botão "+" para criar uma nova prova
          </Text>
        </View>
      ) : (
        <FlatList
          data={provas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.provaContainer}>
              <TouchableOpacity
                style={styles.provaCard}
                onPress={() => {
                  setActionMenuVisible(
                    actionMenuVisible === item.id ? null : item.id
                  );
                }}
              >
                <View style={styles.provaInfo}>
                  
                    <Feather
                      name="file-text"
                      size={29}
                      color="#2F4FCD"
                      style={styles.provaIcon}
                    />
                  <View>
                    <Text style={styles.provaNome}>{item.nome}</Text>
                    <Text style={styles.provaData}>
                      Criada em: {item.dataCriacao}
                    </Text>
                    <Text style={styles.provaFotos}>
                      {item.fotos.length} foto
                      {item.fotos.length !== 1 ? 's' : ''}
                    </Text>
                    {item.nota_por_questao !== undefined && (
                      <Text style={styles.provaFotos}>
                        Valor por questão: {item.nota_por_questao}
                      </Text>
                    )}
                  </View>
                </View>
                <Feather name="more-vertical" size={24} color="#2F4FCD" />
              </TouchableOpacity>

              {actionMenuVisible === item.id && (
                <View style={styles.actionMenu}>
                  <Link
                    href={{
                      pathname: '/CadastrarQuestoes',
                      params: { provaId: item.id },
                    }}
                    asChild
                  >
                    <TouchableOpacity style={styles.actionButton}>
                      <Feather name="plus" size={18} color="#2F4FCD" />
                      <Text style={styles.actionText}>Criar Gabarito</Text>
                    </TouchableOpacity>
                  </Link>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setProvaEmEdicao(item);
                      setNotaPorQuestaoEdicao(item.nota_por_questao ? String(item.nota_por_questao) : '');
                      setEditModalVisible(true);
                      setActionMenuVisible(null);
                    }}
                  >
                    <Feather name="edit" size={18} color="#2F4FCD" />
                    <Text style={styles.actionText}>Editar nome e nota</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => apagarProva(item.id)}
                  >
                    <Feather name="trash-2" size={18} color="#FF6B6B" />
                    <Text style={[styles.actionText, styles.deleteText]}>
                      Excluir
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Modal para criar nova prova */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !isCreating && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Prova</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da prova"
              value={novaProva}
              onChangeText={setNovaProva}
              autoFocus
              editable={!isCreating}
            />
            <TextInput
              style={styles.input}
              placeholder="Nota por questão (ex: 1.0)"
              value={notaPorQuestao}
              onChangeText={setNotaPorQuestao}
              keyboardType="numeric"
              editable={!isCreating}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (!isCreating) {
                    setNovaProva('');
                    setNotaPorQuestao('1');
                    setModalVisible(false);
                  }
                }}
                disabled={isCreating}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, isCreating && styles.disabledButton]}
                onPress={criarNovaProva}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Text style={styles.confirmButtonText}>Criando...</Text>
                ) : (
                  <Text style={styles.confirmButtonText}>Criar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar prova */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Prova</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da prova"
              value={provaEmEdicao?.nome || ''}
              onChangeText={(text) =>
                setProvaEmEdicao((prev) =>
                  prev ? { ...prev, nome: text } : null
                )
              }
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Valor por questão (ex: 1.0)"
              value={notaPorQuestaoEdicao}
              onChangeText={setNotaPorQuestaoEdicao}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setProvaEmEdicao(null);
                  setEditModalVisible(false);
                  setNotaPorQuestaoEdicao('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={renomearProva}
              >
                <Text style={styles.confirmButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DDDBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Estilo neomorphism
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  provaContainer: {
    marginBottom: 15,
  },
  provaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#DDDBFF',
    borderRadius: 16,
    padding: 15,
    // Estilo neomorphism
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  provaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  provaIcon: {
    marginRight: 15,
  },
  provaNome: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
  },
  provaData: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  provaFotos: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#2F4FCD',
  },
  actionMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 5,
    padding: 10,
    // Estilo neomorphism
    shadowColor: '#BBBADD',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#2F4FCD',
    marginLeft: 10,
  },
  deleteText: {
    color: '#FF6B6B',
  },
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
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginBottom: 20,
    textAlign: 'center',
  },
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
  cancelButton: {
    backgroundColor: '#F5F5F7',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  confirmButton: {
    backgroundColor: '#2F4FCD',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 10,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#2F4FCD',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
});