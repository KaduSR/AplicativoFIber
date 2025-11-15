import React from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme'; // Assuming you have a theme file

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Sair",
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error(error);
              Alert.alert("Erro", "Não foi possível fazer logout.");
            }
          },
          style: "destructive"
        }
      ],
      { cancelable: false }
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  const navigationItems = [
    { icon: 'person-outline', label: 'Meus Dados', screen: 'my-data' },
    { icon: 'document-text-outline', label: 'Meus Contratos', screen: 'my-contracts' },
    { icon: 'receipt-outline', label: 'Minhas Faturas', screen: 'my-invoices' },
    { icon: 'notifications-outline', label: 'Notificações', screen: 'notifications' },
    { icon: 'card-outline', label: 'Meus Cartões', screen: 'my-cards' },
  ];

  return (
    <View style={styles.fullScreenContainer}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[theme.colors.gradient.primary[0], theme.colors.gradient.primary[1]]}
          style={styles.headerBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <View style={styles.avatarContainer}>
            <Image
              source={require('@/assets/images/logo.png')} // Placeholder image
              style={styles.avatar}
            />
            <Text style={styles.userName}>{user.nome_cliente}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </LinearGradient>

        <View style={styles.navigationSection}>
          {navigationItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.navigationItem}>
              <Ionicons name={item.icon as any} size={24} color={theme.colors.primary} />
              <Text style={styles.navigationItemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward-outline" size={20} color={theme.colors.text.secondary.light} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.light, // Or theme.colors.background.dark based on theme
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: theme.colors.text.primary.light,
    marginTop: 50,
  },
  headerBackground: {
    width: '100%',
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
    marginTop: 20,
    marginBottom: 15,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff', // Placeholder background
    marginBottom: 10,
    resizeMode: 'contain',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.inverse,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: theme.colors.text.inverse,
    opacity: 0.8,
  },
  navigationSection: {
    width: '90%',
    backgroundColor: theme.colors.card.light,
    borderRadius: 15,
    paddingVertical: 10,
    ...theme.shadows.md,
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  navigationItemLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    color: theme.colors.text.primary.light,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE', // Light red background
    paddingVertical: 15,
    borderRadius: 15,
    width: '90%',
    marginTop: 30,
    ...theme.shadows.md,
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginLeft: 10,
  },
});