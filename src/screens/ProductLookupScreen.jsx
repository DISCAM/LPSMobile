import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getProductsRequest } from "../api/productsApi";
import { useAuth } from "../auth/useAuth";

const normalizeEan = (value) => {
  const rawValue = String(value ?? "").trim();

  // Usuwa opcjonalny identyfikator rodzaju kodu,
  // np. ]E0 dodawany czasami przez skaner.
  const valueWithoutScannerPrefix = rawValue.replace(/^\][A-Za-z]\d/, "");

  // EAN traktujemy jako tekst i zostawiamy wyłącznie cyfry.
  return valueWithoutScannerPrefix.replace(/\D/g, "");
};

export const ProductLookupScreen = ({ onBack }) => {
  const { token } = useAuth();

  const eanInputRef = useRef(null);
  const isSearchingRef = useRef(false);

  const lastScanRef = useRef({
    value: "",
    timestamp: 0,
  });

  const [ean, setEan] = useState("");
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const focusEanInput = () => {
    setTimeout(() => {
      eanInputRef.current?.focus();
    }, 100);
  };

  const handleSearch = async (scannedValue = ean, showEmptyError = true) => {
    const normalizedEan = normalizeEan(scannedValue);

    //console.log("RAW EAN:", JSON.stringify(scannedValue));

    //console.log("NORMALIZED EAN:", normalizedEan);

    if (!normalizedEan) {
      if (showEmptyError) {
        setError("Zeskanuj lub wpisz kod EAN.");
      }

      focusEanInput();

      return;
    }

    // Blokuje drugi request, jeśli skaner wyśle Enter dwa razy.
    if (isSearchingRef.current) {
      return;
    }

    const currentTimestamp = Date.now();

    const isDuplicateScan =
      lastScanRef.current.value === normalizedEan &&
      currentTimestamp - lastScanRef.current.timestamp < 700;

    if (isDuplicateScan) {
      return;
    }

    lastScanRef.current = {
      value: normalizedEan,
      timestamp: currentTimestamp,
    };

    isSearchingRef.current = true;

    try {
      setError("");
      setProduct(null);
      setIsLoading(true);

      const products = await getProductsRequest(token);

      const foundProduct = products.find(
        (item) => normalizeEan(item.ean) === normalizedEan,
      );

      if (!foundProduct) {
        setError(`Nie znaleziono produktu o kodzie EAN: ${normalizedEan}`);

        return;
      }

      setProduct(foundProduct);
    } catch (requestError) {
      setError(requestError.message || "Nie udało się pobrać produktu.");
    } finally {
      setIsLoading(false);
      setEan("");

      setTimeout(() => {
        isSearchingRef.current = false;
        eanInputRef.current?.focus();
      }, 250);
    }
  };

  const handleScanSubmit = (event) => {
    const scannedValue = event.nativeEvent.text;

    handleSearch(scannedValue, false);
  };

  const handleManualSearch = () => {
    handleSearch(ean, true);
  };

  const handleEanChange = (value) => {
    setEan(value);
    setProduct(null);

    if (error) {
      setError("");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButtonContainer,
            pressed && styles.buttonPressed,
          ]}
          onPress={onBack}
        >
          <Text style={styles.backButton}>← Wróć</Text>
        </Pressable>

        <Text style={styles.title}>Sprawdź EAN</Text>

        <Text style={styles.subtitle}>Zeskanuj kod produktu</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchCard}>
          <Text style={styles.label}>Kod EAN</Text>

          <TextInput
            ref={eanInputRef}
            style={[styles.input, product && styles.inputSuccess]}
            value={ean}
            onChangeText={handleEanChange}
            onSubmitEditing={handleScanSubmit}
            placeholder="Zeskanuj lub wpisz EAN"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            showSoftInputOnFocus={false}
            blurOnSubmit={false}
            returnKeyType="search"
            editable={!isLoading}
          />

          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleManualSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>Sprawdź EAN</Text>
            )}
          </Pressable>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {product ? (
          <View style={styles.detailsCard}>
            <Text style={styles.successTitle}>Produkt odnaleziony</Text>

            <Text style={styles.productName}>
              {product.productCode} — {product.name}
            </Text>

            <DetailRow label="ID produktu" value={product.id} />

            <DetailRow label="Kod produktu" value={product.productCode} />

            <DetailRow label="Nazwa" value={product.name} />

            <DetailRow label="EAN" value={product.ean} />

            <DetailRow label="GTIN" value={product.gtin} />

            <DetailRow
              label="Status"
              value={product.isActive ? "Aktywny" : "Nieaktywny"}
            />

            <DetailRow label="Opis" value={product.description} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({ label, value }) => {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue}>
        {value === null || value === undefined || value === ""
          ? "Brak"
          : String(value)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e1d77",
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 22,
    backgroundColor: "#0e1d77",
  },

  backButtonContainer: {
    alignSelf: "flex-start",
    minHeight: 44,
    marginBottom: 8,
    justifyContent: "center",
  },

  backButton: {
    color: "#d6dcff",
    fontSize: 16,
    fontWeight: "600",
  },

  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: 6,
    color: "#d6dcff",
    fontSize: 14,
  },

  content: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  searchCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },

  label: {
    marginBottom: 8,
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },

  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 16,
  },

  inputSuccess: {
    borderWidth: 2,
    borderColor: "#15803d",
  },

  searchButton: {
    minHeight: 50,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0e1d77",
  },

  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  errorBox: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },

  errorText: {
    color: "#b91c1c",
    textAlign: "center",
  },

  detailsCard: {
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
  },

  successTitle: {
    marginBottom: 16,
    color: "#15803d",
    fontSize: 20,
    fontWeight: "700",
  },

  productName: {
    marginBottom: 20,
    color: "#0e1d77",
    fontSize: 18,
    fontWeight: "700",
  },

  detailRow: {
    marginBottom: 14,
  },

  detailLabel: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "600",
  },

  detailValue: {
    marginTop: 3,
    color: "#111827",
    fontSize: 16,
  },
});
