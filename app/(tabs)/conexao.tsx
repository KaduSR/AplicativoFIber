// Em: app/(tabs)/conexao.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { api } from '@/services/ixcApi';
import { API_CONFIG } from '@/constants/config';

export default function ConexaoScreen() {
  const [ontStatus, setOntStatus] = useState(null);
  const [speedTestResult, setSpeedTestResult] = useState(null);
  const [isLoadingOnt, setIsLoadingOnt] = useState(false);
  const [isLoadingSpeed, setIsLoadingSpeed] = useState(false);

  // Função para buscar status da ONT (GenieACS)
  const fetchOntStatus = async () => {
    setIsLoadingOnt(true);
    try {
      // (Nota: O endpoint '/api/ont' precisa do 'serial' do cliente)
      // (Como ainda não temos isso, vamos simular a chamada)
      // const data = await api.get(`${API_CONFIG.ENDPOINTS.ONT}/SEU_SERIAL_AQUI`);
      // setOntStatus(data);
      
      // Simulação (remova isto quando o '/api/ont' estiver a funcionar com o serial)
      await new Promise(resolve => setTimeout(resolve, 500));
      setOntStatus({ signal: '-22.5 dBm', status: 'Online' });

    } catch (error) {
      Alert.alert("Erro ONT", "Não foi possível buscar o status da ONT.");
    } finally {
      setIsLoadingOnt(false);
    }
  };

  // Função para rodar o Speedtest (Backend)
  const runSpeedTest = async () => {
    setIsLoadingSpeed(true);
    setSpeedTestResult(null);
    try {
      const data = await api.get(API_CONFIG.ENDPOINTS.SPEEDTEST);
      setSpeedTestResult(data);
    } catch (error) {
      Alert.alert("Erro Speedtest", "Não foi possível completar o teste de velocidade.");
    } finally {
      setIsLoadingSpeed(false);
    }
  };

  // Carrega o status da ONT ao abrir a tela
  useEffect(() => {
    fetchOntStatus();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minha Conexão</Text>

      {/* Status da ONT */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status do Equipamento (ONT)</Text>
        {isLoadingOnt ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text>Sinal Óptico: {ontStatus?.signal || 'N/A'}</Text>
            <Text>Status: {ontStatus?.status || 'N/A'}</Text>
          </>
        )}
      </View>

      {/* Teste de Velocidade */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Teste de Velocidade</Text>
        {isLoadingSpeed ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <Text>Download: {speedTestResult?.download || '0.00'} Mbps</Text>
            <Text>Upload: {speedTestResult?.upload || '0.00'} Mbps</Text>
            <Text>Ping: {speedTestResult?.ping || '0'} ms</Text>
          </>
        )}
        <Button 
          title={isLoadingSpeed ? "Testando..." : "Iniciar Teste"}
          onPress={runSpeedTest} 
          disabled={isLoadingSpeed}
        />
        {speedTestResult?.resultUrl && (
          <Text style={{fontSize: 12, color: 'blue', marginTop: 5}}>Ver resultado completo</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
});