import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
    await signIn({ login: email, senha: password });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? theme.colors.background.dark : theme.colors.background.light }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + theme.spacing.xl }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://fibernettelecom.com/img/logo/logo.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.subtitle, { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light }]}>
            Central de Conexão Inteligente
          </Text>
        </View>

        {/* Demo Credentials Info */}
        <View style={[styles.demoInfo, { backgroundColor: `${theme.colors.info}20` }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.info} />
          <View style={styles.demoTextContainer}>
            <Text style={[styles.demoText, { color: theme.colors.info }]}>
              Acesso Demo
            </Text>
            <Text style={[styles.demoCredentials, { color: theme.colors.info }]}>
              Email: test@fibernet.com
            </Text>
            <Text style={[styles.demoCredentials, { color: theme.colors.info }]}>
              Senha: 123456
            </Text>
          </View>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons 
              name="mail" 
              size={20} 
              color={isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? theme.colors.surface.dark : theme.colors.surface.light,
                color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light,
              }]}
              placeholder="E-mail"
              placeholderTextColor={isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons 
              name="lock-closed" 
              size={20} 
              color={isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDark ? theme.colors.surface.dark : theme.colors.surface.light,
                color: isDark ? theme.colors.text.primary.dark : theme.colors.text.primary.light,
              }]}
              placeholder="Senha"
              placeholderTextColor={isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isSubmitting}
            />
            <TouchableOpacity 
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color={isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light} 
              />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: `${theme.colors.error}20` }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, { opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={theme.colors.gradient.primary}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Entrar</Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.text.inverse} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
              Esqueci minha senha
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? theme.colors.text.secondary.dark : theme.colors.text.secondary.light }]}>
            Ainda não é cliente?
          </Text>
          <TouchableOpacity>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
              Conheça nossos planos
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  demoInfo: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  demoTextContainer: {
    flex: 1,
  },
  demoText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  demoCredentials: {
    fontSize: 12,
    fontWeight: '500',
  },
  form: {
    gap: theme.spacing.md,
  },
  inputContainer: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: theme.spacing.md,
    top: 18,
    zIndex: 1,
  },
  input: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: 16,
    paddingLeft: 48,
    paddingRight: theme.spacing.md,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: theme.spacing.md,
    top: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  loginButton: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
    ...theme.shadows.md,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: theme.spacing.sm,
  },
  loginButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
