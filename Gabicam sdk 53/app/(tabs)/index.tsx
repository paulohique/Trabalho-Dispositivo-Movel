// app/index.tsx
import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Platform,
  SafeAreaView 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(47, 79, 205, 0.05)', 'rgba(47, 79, 205, 0.02)', 'transparent']}
        locations={[0, 0.3, 1]}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Svg width={24} height={20} viewBox="0 0 484.61 413.39" style={styles.logoSvg}>
            <Path 
              d="M9.13,186.61c0-81.07,60.99-136.22,146.81-136.22v135.12h97.14v92.76c-23.01,22.28-60.99,36.52-102.25,36.52-86.55,0-141.69-50.4-141.69-128.18Z" 
              fill="#2F4FCD"
            />
            <Path 
              d="M276.08,54.78h77.05c46.74,0,107.37,0,107.37,62.81,0,27.75-15.7,48.2-39.81,54.78,30.68,7.67,53.32,33.23,53.32,67.56,0,70.48-61.72,70.48-111.02,70.48h-86.91V54.78Z" 
              fill="#2F4FCD"
            />
          </Svg>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <View style={styles.logoutIconContainer}>
            <Feather name="log-out" size={20} color="#2F4FCD" />
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.title}>Corrija provas facilmente</Text>
        <Text style={styles.subtitle}>
          Capture, corrija e gerencie provas com apenas alguns toques
        </Text>
      </View>
      
      <View style={styles.gridContainer}>
        {/* Criar Prova - Botão Principal */}
        <TouchableOpacity 
          style={styles.mainButton}
          onPress={() => router.push('/CriarEditarProvaScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f8f9ff', '#f0f2ff']}
            style={styles.mainButtonBase}
          >
            <LinearGradient
              colors={['rgba(47, 79, 205, 0.8)', 'rgba(47, 79, 205, 0.6)']}
              style={styles.mainButtonGradient}
            >
              <View style={styles.mainButtonContent}>
                <View style={styles.mainIconContainer}>
                  <Feather name="file-text" size={28} color="#2F4FCD" />
                </View>
                <View style={styles.mainTextContainer}>
                  <Text style={styles.mainButtonText}>Criar Prova</Text>
                  <Text style={styles.mainButtonSubtext}>Primeiro passo</Text>
                </View>
              </View>
            </LinearGradient>
          </LinearGradient>
        </TouchableOpacity>

        {/* Tirar Foto - Ação Principal */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/CameraProvaScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.actionButtonGradient}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIconContainer}>
                <Feather name="camera" size={24} color="#2F4FCD" />
              </View>
              <Text style={styles.actionButtonText}>Tirar Foto</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Corrigir Provas - Ação Principal */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/CorrecaoScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.actionButtonGradient}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIconContainer}>
                <Feather name="check-circle" size={24} color="#2F4FCD" />
              </View>
              <Text style={styles.actionButtonText}>Corrigir Provas</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Resultados - Estatísticas */}
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/ResultadosScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9ff']}
            style={styles.actionButtonGradient}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionIconContainer}>
                <Feather name="bar-chart-2" size={24} color="#2F4FCD" />
              </View>
              <Text style={styles.actionButtonText}>Resultados</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Configurações - Funcionalidade Isolada */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/ConfiguracoesScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#fafafa', '#f5f5f7']}
            style={styles.settingsButtonGradient}
          >
            <View style={styles.settingsButtonContent}>
              <View style={styles.settingsIconContainer}>
                <Feather name="settings" size={22} color="#666" />
              </View>
              <Text style={styles.settingsButtonText}>Configurações</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Rodapé com FAQ */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.faqButton}
          onPress={() => router.push('/faq')}
          activeOpacity={0.7}
        >
          <Feather name="help-circle" size={30} color="#8F92A1" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    paddingHorizontal: 20,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
  },
  logoContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#2F4FCD',
    marginRight: 8,
  },
  logoSvg: {
    marginLeft: 4,
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginVertical: 30,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#2F4FCD',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 5,
    flex: 1,
  },
  mainButton: {
    width: '100%',
    height: 110,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  mainButtonBase: {
    flex: 1,
    borderRadius: 24,
    padding: 3,
  },
  mainButtonGradient: {
    flex: 1,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  mainIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  mainTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'System',
    fontWeight: '700',
    textAlign: 'left',
  },
  mainButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '500',
    textAlign: 'left',
    marginTop: 3,
  },
  actionButton: {
    width: '48%',
    height: 110,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(47, 79, 205, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#2F4FCD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  actionButtonText: {
    color: '#2F4FCD',
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsButton: {
    width: '48%',
    height: 110,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#999',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  settingsButtonGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  settingsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(102, 102, 102, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#666',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4
  },
  settingsButtonText: {
    color: '#666',
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingBottom: 25,
  },
  faqButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(143, 146, 161, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8F92A1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
});