// Em: app/(tabs)/noticias.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { api } from '@/services/ixcApi';
import { API_CONFIG } from '@/constants/config';

export default function NoticiasScreen() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const data = await api.get(API_CONFIG.ENDPOINTS.NEWS);
      setArticles(data);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as notícias.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const openArticle = (url) => {
    Linking.openURL(url);
  };

  if (isLoading) {
    return <View style={styles.container}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Últimas Notícias</Text>
      <FlatList
        data={articles}
        keyExtractor={(item, index) => item.url || index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openArticle(item.url)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSource}>{item.source.name}</Text>
          </TouchableOpacity>
        )}
        onRefresh={fetchNews}
        refreshing={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, paddingHorizontal: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSource: { fontSize: 12, color: '#666', marginTop: 5 },
});