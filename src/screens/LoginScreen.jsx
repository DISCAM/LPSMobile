import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../auth/useAuth";

export const LoginScreen = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Podaj adres e-mail i hasło.");

      return;
    }

    try {
      setError("");
      setIsLoading(true);

      await login(email.trim(), password);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.logo}>LPS</Text>

        <Text style={styles.title}>Label Printing System</Text>

        <Text style={styles.subtitle}>
          Mobilna obsługa operacji magazynowych
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Logowanie</Text>

        <Text style={styles.label}>Adres e-mail</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="operator@firma.pl"
          placeholderTextColor="#888888"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Hasło</Text>

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Hasło"
          placeholderTextColor="#888888"
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.loginButtonPressed,
            isLoading && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Zaloguj się</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#0e1d77",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    alignItems: "center",
    marginBottom: 36,
  },

  logo: {
    color: "#ffffff",
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: 4,
  },

  title: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    color: "#d6dcff",
    fontSize: 14,
    textAlign: "center",
  },

  form: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },

  formTitle: {
    marginBottom: 22,
    color: "#1f2937",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },

  label: {
    marginBottom: 6,
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    height: 50,
    marginBottom: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 16,
  },

  error: {
    marginBottom: 16,
    color: "#b91c1c",
    textAlign: "center",
  },

  loginButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0e1d77",
  },

  loginButtonPressed: {
    opacity: 0.8,
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
