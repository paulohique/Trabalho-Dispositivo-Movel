import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

interface FAQItem {
  question: string;
  answer: string;
  icon: string;
}

const faqData: FAQItem[] = [
  {
    question: "Onde ficam salvos os dados do aplicativo?",
    answer: "Todos os dados são salvos localmente no seu dispositivo. As provas criadas, imagens capturadas e resultados ficam armazenados no armazenamento interno do seu smartphone. Você pode gerenciar esses dados nas configurações do aplicativo.",
    icon: "database"
  },
  {
    question: "Como apagar localmente e manter nuvem?",
    answer: "Nas configurações existe um botão de deletar todos os dados ou imagens/provas, esse botão é feito para quando você necessita poupar espaço em seu dispostivo, mas deseja manter as provas no sistema, e assim, as provas serão apagadas localmente e mantidas no banco da dados. Caso queira apagar do banco, deverá usar diretamente a interface de correção para deletar provas. Use com cuidado, pois a exclusão não pode ser desfeita.",
    icon: "trash-2"
  },
  {
    question: "Como tirar uma foto corretamente?",
    answer: "Para uma captura ideal: 1) Mantenha o dispositivo estável, 2) Certifique-se de que a prova esteja bem iluminada, 3) Posicione a câmera paralela à superfície da prova, 4) Evite sombras e reflexos, 5) Capture toda a área da questão na tela antes de fotografar.",
    icon: "camera"
  },
  {
    question: "Como criar uma nova prova?",
    answer: "Acesse a aba 'Provas' e toque no botão '+'. Digite o nome da prova e adicione as questões uma por vez. Para cada questão, você pode definir o número de alternativas e a resposta correta. Salve a prova quando terminar.",
    icon: "file-plus"
  },
  {
    question: "Como corrigir provas automaticamente?",
    answer: "Após capturar as fotos das respostas, vá para a aba 'Correção'. O aplicativo irá analisar automaticamente as imagens e comparar com o gabarito da prova. Os resultados serão exibidos com a pontuação e as questões incorretas destacadas.",
    icon: "check-circle"
  },
  {
    question: "Posso editar uma prova depois de criada?",
    answer: "Sim! Na aba 'Provas', toque na prova que deseja editar. Você pode modificar o nome, adicionar ou remover questões, e alterar as respostas corretas. As alterações são salvas automaticamente.",
    icon: "edit-3"
  },
  {
    question: "Como visualizar os resultados das correções?",
    answer: "Após corrigir uma prova, os resultados ficam disponíveis na aba 'Resultados'. Você pode ver a pontuação total, questões acertadas e erradas, além de estatísticas detalhadas de cada prova corrigida.",
    icon: "bar-chart-2"
  },
  {
    question: "O aplicativo funciona offline?",
    answer: "Sim! O aplicativo funciona offline. Todas as funcionalidades de criação de provas, captura de imagens e correção automática não dependem de conexão com a internet. Os dados ficam salvos localmente no seu dispositivo. Porém o salvamento das informações na tela resultados depende de internet pois é salvo em banco de dados.",
    icon: "wifi-off"
  }
];

export default function FAQScreen() {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [animations] = useState<{ [key: number]: Animated.Value }>({});

  const toggleItem = (index: number) => {
    const newExpandedItems = [...expandedItems];
    const itemIndex = newExpandedItems.indexOf(index);
    
    if (itemIndex > -1) {
      newExpandedItems.splice(itemIndex, 1);
    } else {
      newExpandedItems.push(index);
    }
    
    setExpandedItems(newExpandedItems);
  };

  const isExpanded = (index: number) => expandedItems.includes(index);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perguntas Frequentes</Text>
        <Text style={styles.headerSubtitle}>Tire suas dúvidas sobre o aplicativo</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {faqData.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.questionContainer}
              onPress={() => toggleItem(index)}
              activeOpacity={0.7}
            >
              <View style={styles.questionContent}>
                <View style={styles.iconContainer}>
                  <Feather name={item.icon as any} size={20} color="#2F4FCD" />
                </View>
                <Text style={styles.questionText}>{item.question}</Text>
              </View>
              <Feather 
                name={isExpanded(index) ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#2F4FCD" 
              />
            </TouchableOpacity>
            
            {isExpanded(index) && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Ainda tem dúvidas?</Text>
          <Text style={styles.contactText}>
            Se sua dúvida não foi respondida aqui, entre em contato conosco através do suporte técnico.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#F8F9FF',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#2F4FCD',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '400',
    color: '#666',
  },
  content: {
    padding: 20,
  },
  faqItem: {
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  questionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DDDBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '600',
    color: '#2F4FCD',
    lineHeight: 22,
  },
  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  answerText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '400',
    color: '#666',
    lineHeight: 20,
    marginTop: 10,
  },
  contactSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#2F4FCD',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 