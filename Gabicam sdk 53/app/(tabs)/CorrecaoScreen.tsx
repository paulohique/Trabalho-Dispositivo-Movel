// app/correcao.tsx
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import HeaderPadrao from '../../components/HeaderPadrao';

interface Prova {
  id: string;
  nome: string;
  dataCriacao: string;
  fotos: string[];
  gabarito?: string[];
  nota_por_questao?: number;
}

interface ImagemCapturada {
  id: string;
  provaId: string;
  nomeAluno: string;
  nomeProva: string;
  imageUri: string;
  imageCroppedUri?: string;
  dataCriacao: string;
  status: 'pendente' | 'em_analise' | 'corrigido';
  resultado?: {
    acertos: number;
    total: number;
    nota: number;
  };
}

interface PastaProva {
  id: string;
  nome: string;
  dataCriacao: string;
  provas: ImagemCapturada[];
}

const PROVAS_STORAGE_KEY = '@GabaritoApp:provas';
const IMAGENS_STORAGE_KEY = '@GabaritoApp:imagens';
const API_URL = 'http://192.168.2.103:5000/corrigir';
// Diretório para salvar as imagens normalizadas
const NORMALIZED_IMAGES_DIR = `${FileSystem.documentDirectory}normalized_images/`;

export default function CorrecaoScreen() {
  const [imagens, setImagens] = useState<ImagemCapturada[]>([]);
  const [provas, setProvas] = useState<Prova[]>([]);
  const [pastas, setPastas] = useState<PastaProva[]>([]);
  const [pastaSelecionada, setPastaSelecionada] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [ultimaSalvamento, setUltimaSalvamento] = useState<string | null>(null);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const router = useRouter();
  const { user } = useAuth();
  
  useEffect(() => {
    // Criar diretório para imagens normalizadas se não existir
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
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar provas
      const provasArmazenadas = await AsyncStorage.getItem(PROVAS_STORAGE_KEY);
      let provasData: Prova[] = [];
      if (provasArmazenadas) {
        provasData = JSON.parse(provasArmazenadas);
        setProvas(provasData);
      }

      // Carregar imagens
      const imagensArmazenadas = await AsyncStorage.getItem(IMAGENS_STORAGE_KEY);
      if (imagensArmazenadas) {
        const imagensData: ImagemCapturada[] = JSON.parse(imagensArmazenadas);
        setImagens(imagensData);
        
        // Organizar imagens em pastas por prova
        const pastasOrganizadas = provasData.map(prova => ({
          id: prova.id,
          nome: prova.nome,
          dataCriacao: prova.dataCriacao,
          provas: imagensData.filter(img => img.provaId === prova.id)
        }));
        
        setPastas(pastasOrganizadas);
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const salvarImagens = async (imagensAtualizadas: ImagemCapturada[]) => {
    try {
      await AsyncStorage.setItem(IMAGENS_STORAGE_KEY, JSON.stringify(imagensAtualizadas));
      // Atualizar as pastas com as novas imagens
      const pastasAtualizadas = provas.map(prova => ({
        id: prova.id,
        nome: prova.nome,
        dataCriacao: prova.dataCriacao,
        provas: imagensAtualizadas.filter(img => img.provaId === prova.id)
      }));
      setPastas(pastasAtualizadas);
    } catch (error: any) {
      console.error('Erro ao salvar imagens:', error);
    }
  };

// Função para normalizar a imagem para um formato padronizado
const normalizeImage = async (imageUri: string): Promise<string> => {
  try {
    // Criar um nome padronizado para o arquivo (sempre o mesmo nome)
    const normalizedFilename = `PROVA-OCR.jpg`;
    const normalizedFilePath = `${NORMALIZED_IMAGES_DIR}${normalizedFilename}`;
    
    // Converter para JPG com qualidade máxima
    const convertedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // Sem operações de transformação adicionais
      { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG }
    );
    
    console.log("Imagem convertida para JPG:", convertedImage.uri);
    
    // Salvar com nome padronizado
    await FileSystem.moveAsync({
      from: convertedImage.uri,
      to: normalizedFilePath
    });
    
    return normalizedFilePath;
  } catch (error: any) {
    console.error("Erro ao normalizar imagem:", error);
    // Em caso de erro, retorna a imagem original
    return imageUri;
  }
};

  const iniciarCorrecao = async (item: ImagemCapturada) => {
    if (item.status === 'pendente') {
      try {
        // Atualizar status para em_analise
        const imagensAtualizadas = imagens.map(img => 
          img.id === item.id ? { ...img, status: 'em_analise' as const } : img
        );
        setImagens(imagensAtualizadas);
        await salvarImagens(imagensAtualizadas);

        // Encontrar a prova associada
        const prova = provas.find(p => p.id === item.provaId);
        if (!prova || !prova.gabarito) {
          Alert.alert('Erro', 'Prova ou gabarito não encontrado.');
          
          // Reverter status para pendente
          const imagensRevertidas = imagens.map(img => 
            img.id === item.id ? { ...img, status: 'pendente' as const } : img
          );
          setImagens(imagensRevertidas);
          await salvarImagens(imagensRevertidas);
          return;
        }
        const notaPorQuestao = prova.nota_por_questao || 1;

        // Normalizar a imagem antes de enviar
        const normalizedImageUri = await normalizeImage(item.imageUri);
        
        // Preparar dados para API
        const formData = new FormData();
        
        // Nome padronizado para o arquivo
        const fileName = "PROVA-OCR.jpg";

        // Adicionar imagem normalizada ao FormData
        formData.append('imagem', {
          uri: normalizedImageUri,
          type: 'image/jpeg',
          name: fileName
        } as any);
        
        // Adicionar gabarito como uma string única
        formData.append('gabarito', prova.gabarito.join(''));

        console.log('Enviando para API:', {
          uri: normalizedImageUri,
          name: fileName,
          gabarito: prova.gabarito.join('')
        });

        // Enviar para API de correção
        const response = await fetch(API_URL, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro na resposta da API: ${response.status} - ${errorText}`);
        }

        const resultado = await response.json();
        console.log('Resultado da API:', resultado);

        // Verificar se todas as 10 respostas foram detectadas
        if (!resultado.respostas_detectadas || 
            resultado.respostas_detectadas.length < 10 || 
            resultado.total_questoes !== 10) {
          
          // Erro: Não foram detectadas todas as 10 respostas
          // Reverter para status pendente para permitir nova tentativa
          const imagensRevertidas = imagens.map(img => 
            img.id === item.id ? { ...img, status: 'pendente' as const } : img
          );
          setImagens(imagensRevertidas);
          await salvarImagens(imagensRevertidas);
          
          // Mostrar mensagem de erro com opção de nova tentativa
          Alert.alert(
            'Erro na Correção',
            `Foram detectadas apenas ${resultado.respostas_detectadas?.length || 0} de 10 questões. A qualidade da imagem pode não estar ideal.`,
            [
              { 
                text: "Tentar novamente", 
                onPress: () => Alert.alert(
                  'Dicas para melhor captura',
                  '• Certifique-se de que a imagem está bem iluminada\n• Capturar apenas a área do gabarito\n• Evitar reflexos ou sombras\n• Manter a câmera estável e alinhada',
                  [{ text: "OK", style: "default" }]
                ),
                style: "default" 
              }
            ]
          );
          return;
        }

        // Atualizar status para corrigido com resultado
        const imagensFinais = imagens.map(img => 
          img.id === item.id ? {
            ...img,
            imageCroppedUri: normalizedImageUri,
            status: 'corrigido' as const,
            resultado: {
              acertos: resultado.acertos,
              total: resultado.total_questoes,
              nota: resultado.acertos * notaPorQuestao
            }
          } : img
        );
        
        setImagens(imagensFinais);
        await salvarImagens(imagensFinais);
        
        // Atualizar a lista de provas na pasta atual
        if (pastaSelecionada) {
          const pastaAtual = pastas.find(p => p.id === pastaSelecionada);
          if (pastaAtual) {
            const provasAtualizadas = pastaAtual.provas.map(p => 
              p.id === item.id ? {
                ...p,
                status: 'corrigido' as const,
                resultado: {
                  acertos: resultado.acertos,
                  total: resultado.total_questoes,
                  nota: resultado.acertos * notaPorQuestao
                }
              } : p
            );
            const pastasAtualizadas = pastas.map(p => 
              p.id === pastaSelecionada ? { ...p, provas: provasAtualizadas } : p
            );
            setPastas(pastasAtualizadas);
          }
        }
        
        Alert.alert(
          'Correção Concluída',
          `Aluno: ${item.nomeAluno}\nNota: ${(resultado.acertos * notaPorQuestao).toFixed(1)}\nAcertos: ${resultado.acertos}/${resultado.total_questoes}`
        );
        
      } catch (error: any) {
        console.error('Erro ao processar correção:', error);
        // Reverter para status pendente em caso de erro
        const imagensAtualizadas = imagens.map(img => 
          img.id === item.id ? { ...img, status: 'pendente' as const } : img
        );
        setImagens(imagensAtualizadas);
        await salvarImagens(imagensAtualizadas);
        
        // Mensagem de erro mais descritiva baseada no tipo de falha
        let errorMessage = error.message;
        if (error.message.includes('Network request failed')) {
          errorMessage = "Erro de conexão com o servidor. Verifique sua internet e tente novamente.";
        } else if (error.message.includes('respostas_detectadas')) {
          errorMessage = "A imagem não tem qualidade suficiente para detectar as respostas. Tente capturar novamente com melhor iluminação.";
        }
        
        // Mostrar erro com opções para tentar novamente
        Alert.alert(
          'Erro na Correção',
          `Não foi possível processar a correção: ${errorMessage}`,
          [
            { 
              text: "Tentar novamente", 
              onPress: () => {
                // Opcionalmente, mostrar dicas para melhorar a captura
                Alert.alert(
                  'Dicas para melhor captura',
                  '• Certifique-se de que a imagem está bem iluminada\n• Capturar apenas a área do gabarito\n• Evitar reflexos ou sombras\n• Manter a câmera estável e alinhada',
                  [{ text: "OK", style: "default" }]
                );
              },
              style: "default" 
            }
          ]
        );
      }
    } else if (item.status === 'corrigido') {
      // Mostrar detalhes da correção
      const prova = provas.find(p => p.id === item.provaId);
      const notaPorQuestao = prova?.nota_por_questao || 1;
      Alert.alert(
        'Detalhes da Correção',
        `Aluno: ${item.nomeAluno}\nProva: ${item.nomeProva}\nNota: ${((item.resultado?.acertos || 0) * notaPorQuestao).toFixed(1)}\nAcertos: ${item.resultado?.acertos}/${item.resultado?.total}`
      );
    } else if (item.status === 'em_analise') {
      Alert.alert(
        'Processando',
        'Esta prova já está sendo processada. Aguarde a conclusão.'
      );
    }
  };
  
  const renderStatusBadge = (status: ImagemCapturada['status']) => {
    let backgroundColor, textColor, label;
    
    switch (status) {
      case 'pendente':
        backgroundColor = '#DDDBFF';
        textColor = '#2F4FCD';
        label = 'Pendente';
        break;
      case 'em_analise':
        backgroundColor = '#FFE4B2';
        textColor = '#F5A623';
        label = 'Em análise';
        break;
      case 'corrigido':
        backgroundColor = '#D5F5E3';
        textColor = '#27AE60';
        label = 'Corrigido';
        break;
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  const carregarUltimoSalvamento = async (provaId: string) => {
    try {
      const response = await api.get(`/api/provas/ultimo-salvamento/${provaId}`);
      if (response.data.ultimoSalvamento) {
        setUltimaSalvamento(response.data.ultimoSalvamento);
      } else {
        setUltimaSalvamento(null);
      }
    } catch (error) {
      console.error('Erro ao carregar último salvamento:', error);
      setUltimaSalvamento(null);
    }
  };

  const renderPasta = ({ item }: { item: PastaProva }) => {
    // Contar provas por status
    const provasPendentes = item.provas.filter(p => p.status === 'pendente').length;
    const provasEmAnalise = item.provas.filter(p => p.status === 'em_analise').length;
    const provasCorrigidas = item.provas.filter(p => p.status === 'corrigido').length;

    return (
      <TouchableOpacity 
        style={styles.pastaCard}
        onPress={() => {
          setPastaSelecionada(item.id);
          carregarUltimoSalvamento(item.id);
        }}
      >
        <View style={styles.pastaContent}>
          <View style={styles.pastaIconContainer}>
            <Feather name="folder" size={24} color="#2F4FCD" />
          </View>
          <View style={styles.pastaInfo}>
            <Text style={styles.pastaNome}>{item.nome}</Text>
            <Text style={styles.pastaQuantidade}>
              {item.provas.length} {item.provas.length === 1 ? 'prova' : 'provas'}
            </Text>
          </View>
          <View style={styles.statusIndicators}>
            {provasPendentes > 0 && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusCircle, { backgroundColor: '#F5A623' }]} />
                <Text style={styles.statusNumber}>{provasPendentes}</Text>
              </View>
            )}
            {provasEmAnalise > 0 && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusCircle, { backgroundColor: '#2F4FCD' }]} />
                <Text style={styles.statusNumber}>{provasEmAnalise}</Text>
              </View>
            )}
            {provasCorrigidas > 0 && (
              <View style={styles.statusIndicator}>
                <View style={[styles.statusCircle, { backgroundColor: '#27AE60' }]} />
                <Text style={styles.statusNumber}>{provasCorrigidas}</Text>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={24} color="#2F4FCD" />
        </View>
      </TouchableOpacity>
    );
  };

  const salvarResultados = async () => {
    if (!pastaSelecionada) return;

    const pastaAtual = pastas.find(p => p.id === pastaSelecionada);
    if (!pastaAtual) return;

    // Filtrar apenas provas corrigidas
    const provasCorrigidas = pastaAtual.provas.filter(p => p.status === 'corrigido' && p.resultado);
    
    if (provasCorrigidas.length === 0) {
      Alert.alert('Atenção', 'Não há provas corrigidas para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const resultados = provasCorrigidas.map(prova => ({
        nomeAluno: prova.nomeAluno,
        acertos: prova.resultado?.acertos || 0,
        total: prova.resultado?.total || 0,
        nota: prova.resultado?.nota || 0
      }));

      await api.post('/api/provas/salvar-resultados', {
        provaId: pastaSelecionada,
        resultados
      });

      // Atualizar a data de último salvamento
      setUltimaSalvamento(new Date().toISOString());
      
      Alert.alert('Sucesso', 'Resultados salvos com sucesso!');
    } catch (error: unknown) {
      console.error('Erro ao salvar resultados:', error);
      let errorMessage = 'Não foi possível salvar os resultados.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || errorMessage;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <HeaderPadrao title="Corrigir Provas" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F4FCD" />
          <Text style={styles.loadingText}>Carregando provas...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {pastaSelecionada ? (
            <View style={styles.pastaSelecionadaContainer}>
              <View style={styles.pastaHeaderRow}>
                <TouchableOpacity 
                  style={[styles.removerButton, modoSelecao && styles.removerButtonAtivo]}
                  onPress={() => setModoSelecao(!modoSelecao)}
                  disabled={isSaving}
                >
                  <Feather name="trash-2" size={20} color="#FFFFFF" />
                  <Text style={styles.removerButtonText}>{modoSelecao ? 'Cancelar' : 'Remover'}</Text>
                </TouchableOpacity>
                <View style={styles.salvarColuna}>
                  <TouchableOpacity 
                    style={[styles.salvarButton, isSaving && styles.salvarButtonDisabled]}
                    onPress={salvarResultados}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="save" size={20} color="#FFFFFF" />
                        <Text style={styles.salvarButtonText}>Salvar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {ultimaSalvamento && (
                    <Text style={styles.ultimaSalvamentoText}>
                      Último salvamento:{"\n"}{new Date(ultimaSalvamento).toLocaleString('pt-BR')}
                    </Text>
                  )}
                </View>
              </View>
              
              {modoSelecao && selecionadas.length > 0 && (
                <TouchableOpacity
                  style={styles.excluirSelecionadasButton}
                  onPress={async () => {
                    Alert.alert(
                      'Excluir provas',
                      `Tem certeza que deseja excluir ${selecionadas.length} prova(s)?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: async () => {
                          const pastaAtual = pastas.find(p => p.id === pastaSelecionada);
                          if (!pastaAtual) return;
                          const novasProvas = pastaAtual.provas.filter(p => !selecionadas.includes(p.id));
                          const novasImagens = imagens.filter(img => !selecionadas.includes(img.id));
                          setImagens(novasImagens);
                          await salvarImagens(novasImagens);
                          // Atualizar o array de fotos da prova correspondente
                          const provasAtualizadas = provas.map(prova => {
                            if (prova.id === pastaSelecionada) {
                              // Remove as fotos das imagens excluídas
                              const fotosRestantes = novasImagens.filter(img => img.provaId === prova.id).map(img => img.imageUri);
                              return { ...prova, fotos: fotosRestantes };
                            }
                            return prova;
                          });
                          setProvas(provasAtualizadas);
                          await AsyncStorage.setItem(PROVAS_STORAGE_KEY, JSON.stringify(provasAtualizadas));
                          setSelecionadas([]);
                          setModoSelecao(false);
                        }}
                      ]
                    );
                  }}
                >
                  <Feather name="trash-2" size={18} color="#fff" />
                  <Text style={styles.excluirSelecionadasText}>Excluir selecionadas</Text>
                </TouchableOpacity>
              )}
              
              <FlatList
                data={pastas.find(p => p.id === pastaSelecionada)?.provas || []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.imagemCard}
                    onPress={() => modoSelecao ? (
                      setSelecionadas(sel => sel.includes(item.id) ? sel.filter(id => id !== item.id) : [...sel, item.id])
                    ) : iniciarCorrecao(item)}
                    disabled={item.status === 'em_analise'}
                  >
                    <View style={styles.cardContent}>
                      {modoSelecao && (
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => setSelecionadas(sel => sel.includes(item.id) ? sel.filter(id => id !== item.id) : [...sel, item.id])}
                        >
                          {selecionadas.includes(item.id) ? (
                            <Feather name="check-square" size={24} color="#2F4FCD" />
                          ) : (
                            <Feather name="square" size={24} color="#BBBADD" />
                          )}
                        </TouchableOpacity>
                      )}
                      <Image 
                        source={{ uri: item.imageUri }}
                        style={styles.thumbnail}
                      />
                      
                      <View style={styles.imagemInfo}>
                        <Text style={styles.alunoNome}>{item.nomeAluno}</Text>
                        <Text style={styles.provaNome}>Prova: {item.nomeProva}</Text>
                        <Text style={styles.imagemData}>
                          Capturada em: {item.dataCriacao}
                        </Text>
                        
                        {renderStatusBadge(item.status)}
                        
                        {item.status === 'corrigido' && item.resultado && (
                          <View style={styles.resultadoContainer}>
                            <Text style={styles.resultadoText}>
                              Nota: <Text style={styles.notaText}>{((item.resultado.acertos || 0) * (provas.find(p => p.id === item.provaId)?.nota_por_questao || 1)).toFixed(1)}</Text>
                            </Text>
                            <Text style={styles.acertosText}>
                              {item.resultado.acertos}/{item.resultado.total} acertos
                            </Text>
                          </View>
                        )}
                        
                        {item.status === 'em_analise' && (
                          <View style={styles.analisandoContainer}>
                            <ActivityIndicator size="small" color="#F5A623" />
                            <Text style={styles.analisandoText}>Processando...</Text>
                          </View>
                        )}
                        
                        {item.status === 'pendente' && (
                          <Text style={styles.pendingText}>
                            Toque para iniciar a correção
                          </Text>
                        )}
                      </View>
                      
                      <Feather 
                        name={item.status === 'corrigido' ? 'eye' : 'chevron-right'} 
                        size={24} 
                        color="#2F4FCD" 
                        style={styles.cardIcon}
                      />
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContainer}
              />
            </View>
          ) : pastas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="folder" size={64} color="#DDDBFF" />
              <Text style={styles.emptyText}>Nenhuma prova encontrada</Text>
              <Text style={styles.emptySubtext}>
                Capture fotos de provas para começar a corrigir
              </Text>
            </View>
          ) : (
            <FlatList
              data={pastas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderPasta({ item })}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  content: {
    flex: 1,
  },
  pastaSelecionadaContainer: {
    flex: 1,
  },
  pastaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 10,
  },
  salvarColuna: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 0,
  },
  salvarButton: {
    backgroundColor: '#2F4FCD',
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salvarButtonDisabled: {
    backgroundColor: '#DDDBFF',
  },
  salvarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginLeft: 10,
  },
  ultimaSalvamentoText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  imagemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DDDBFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    // Estilo neomorphism
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#BBBADD',
  },
  imagemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  alunoNome: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginBottom: 2,
  },
  provaNome: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 2,
  },
  imagemData: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  resultadoContainer: {
    marginTop: 3,
  },
  resultadoText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  notaText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#27AE60',
  },
  acertosText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  analisandoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  analisandoText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#F5A623',
    marginLeft: 8,
  },
  pendingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#2F4FCD',
    marginTop: 5,
  },
  cardIcon: {
    marginLeft: 10,
  },
  pastaCard: {
    backgroundColor: '#DDDBFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  pastaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastaIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  pastaInfo: {
    flex: 1,
  },
  pastaNome: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#2F4FCD',
    marginBottom: 4,
  },
  pastaQuantidade: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusNumber: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  listContainer: {
    padding: 20,
  },
  removerButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  removerButtonAtivo: {
    backgroundColor: '#B71C1C',
  },
  removerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginLeft: 10,
  },
  excluirSelecionadasButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    margin: 10,
  },
  excluirSelecionadasText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    marginLeft: 8,
  },
  checkbox: {
    marginRight: 10,
  },
});