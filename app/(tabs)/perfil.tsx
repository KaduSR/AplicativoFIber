// Em: app/(tabs)/perfil.tsx
import React from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router'; // Importa o hook de navegação

export default function PerfilScreen() {
  const { user, signOut } = useAuth(); // Pega o 'user' e 'signOut'
  const router = useRouter(); // Inicializa o router

  const handleLogout = () => {
    // Chama o 'signOut' (Tarefa 09/11)
    signOut(); 
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Meu Perfil</Text>

      {/* Bloco de Avatar e Nome (Simulado) */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nome_cliente?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.nome_cliente || 'Carregando...'}</Text>
        <Text style={styles.profileEmail}>{user?.email || '...'}</Text>
      </View>

      {/* Menu de Botões (Item 2) */}
      <View style={styles.menuContainer}>
        {/* (Estes são exemplos, adicione ícones se quiser) */}
        
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/(tabs)/meus-dados')}>
          <Text style={styles.menuButtonText}>Meus Dados</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/(tabs)/meus-contratos')}>
          <Text style={styles.menuButtonText}>Meus Contratos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/(tabs)/minhas-faturas')}>
          <Text style={styles.menuButtonText}>Minhas Faturas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuButton} onPress={() => router.push('/(tabs)/notificacoes')}>
          <Text style={styles.menuButtonText}>Notificações</Text>
        </TouchableOpacity>

        {/* O botão "Meus Cartões" foi removido (Item 3) */}
      </View>

      {/* Botão de Sair (Item 1) */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair da Conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Estilos baseados nas suas imagens
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatar: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: { fontSize: 40, color: '#888' },
  profileName: { fontSize: 20, fontWeight: 'bold' },
  profileEmail: { fontSize: 16, color: '#666' },
  menuContainer: { marginHorizontal: 20 },
  menuButton: { 
    backgroundColor: '#f9f9f9', padding: 20, 
    borderRadius: 10, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center' 
  },
  menuButtonText: { fontSize: 16, flex: 1 },
  logoutButton: { 
    margin: 20, padding: 15, 
    alignItems: 'center', backgroundColor: '#FFF0F0' ,
    borderRadius: 10
  },
  logoutButtonText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' }
});