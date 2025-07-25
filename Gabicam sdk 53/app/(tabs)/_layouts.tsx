// app/_layout.tsx
import { Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function RootLayout() {
  // const [fontsLoaded] = useFonts({
  //   'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
  //   'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
  //   'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
  // });

  // if (!fontsLoaded) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //       <Text>Carregando...</Text>
  //     </View>
  //   );
  // }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2F4FCD',
          tabBarInactiveTintColor: '#8F92A1',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 60,
            paddingBottom: 10,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="home" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="criar-editar-prova"
          options={{
            title: 'Provas',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="file-text" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="camera" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="correcao"
          options={{
            title: 'Correção',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="check-square" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="faq"
          options={{
            title: 'FAQ',
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="help-circle" color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}

function TabBarIcon(props: { name: React.ComponentProps<typeof Feather>['name']; color: string }) {
  return <Feather size={24} style={{ marginBottom: -3 }} {...props} />;
}