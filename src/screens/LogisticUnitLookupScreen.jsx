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
import { StatusBar } from "expo-status-bar";
import { getLogisticUnitsRequest } from "../api/logisticUnitsApi";
import { useAuth } from "../auth/useAuth";

const normalizeSscc = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");

  // Skaner GS1-128 może zwrócić AI "00" przed właściwym,
  // 18-cyfrowym numerem SSCC.
  if (digits.length === 20 && digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  return digits;
};

export const LogisticUnitLookupScreen = ({ onBack }) => {
  const { token } = useAuth();

  const ssccInputRef = useRef(null);
  const isSearchingRef = useRef(false);

  const lastScanRef = useRef({
    value: "",
    timestamp: 0,
  });

  const [sscc, setSscc] = useState("");
  const [logisticUnit, setLogisticUnit] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const focusInput = () => {
    setTimeout(() => {
      ssccInputRef.current?.focus();
    }, 100);
  };

  const handleSearch = async (scannedValue = sscc, showEmptyError = true) => {
    const normalizedSscc = normalizeSscc(scannedValue);

    if (!normalizedSscc) {
      if (showEmptyError) {
        setError("Podaj numer SSCC.");
      }

      focusInput();

      return;
    }

    // Blokuje kolejne wywołanie, kiedy request już trwa.
    if (isSearchingRef.current) {
      return;
    }

    const currentTimestamp = Date.now();

    const isDuplicateScan =
      lastScanRef.current.value === normalizedSscc &&
      currentTimestamp - lastScanRef.current.timestamp < 700;

    // Chroni przed drugim Enterem wysłanym przez skaner.
    if (isDuplicateScan) {
      return;
    }

    lastScanRef.current = {
      value: normalizedSscc,
      timestamp: currentTimestamp,
    };

    isSearchingRef.current = true;

    try {
      setError("");
      setLogisticUnit(null);
      setIsLoading(true);

      const logisticUnits = await getLogisticUnitsRequest(token);

      const foundLogisticUnit = logisticUnits.find(
        (item) => normalizeSscc(item.sscc) === normalizedSscc,
      );

      if (!foundLogisticUnit) {
        setError(`Nie znaleziono jednostki o numerze SSCC: ${normalizedSscc}`);

        return;
      }

      setLogisticUnit(foundLogisticUnit);
    } catch (requestError) {
      setError(
        requestError.message || "Nie udało się pobrać jednostki logistycznej.",
      );
    } finally {
      setIsLoading(false);
      setSscc("");

      setTimeout(() => {
        isSearchingRef.current = false;
        ssccInputRef.current?.focus();
      }, 250);
    }
  };

  const handleScanSubmit = (event) => {
    const scannedValue = event.nativeEvent.text;

    handleSearch(scannedValue, false);
  };

  const handleManualSearch = () => {
    handleSearch(sscc, true);
  };

  const handleSsccChange = (value) => {
    setSscc(value);

    if (error) {
      setError("");
    }
  };

  return (
    <View style={styles.page}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backButton}>← Wróć</Text>
        </Pressable>

        <Text style={styles.title}>Sprawdź SSCC</Text>

        <Text style={styles.subtitle}>Zeskanuj jednostkę logistyczną</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchCard}>
          <Text style={styles.label}>Numer SSCC</Text>

          <TextInput
            ref={ssccInputRef}
            style={styles.input}
            value={sscc}
            onChangeText={handleSsccChange}
            onSubmitEditing={handleScanSubmit}
            placeholder="Zeskanuj lub wpisz SSCC"
            placeholderTextColor="#888888"
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
              pressed && styles.searchButtonPressed,
              isLoading && styles.searchButtonDisabled,
            ]}
            onPress={handleManualSearch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>Wyszukaj</Text>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {logisticUnit ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Jednostka logistyczna</Text>

            <DetailRow label="SSCC" value={logisticUnit.sscc} />

            <DetailRow label="Typ jednostki" value={logisticUnit.unitType} />

            <DetailRow label="Status" value={logisticUnit.status} />

            <DetailRow
              label="Łączna ilość"
              value={logisticUnit.totalQuantity}
            />

            <DetailRow
              label="Zlecenie magazynowe"
              value={logisticUnit.warehouseOrderNumber || "Brak"}
            />

            <DetailRow
              label="Utworzył"
              value={logisticUnit.createdByUserName}
            />

            {logisticUnit.items?.map((item) => (
              <View key={item.logisticUnitItemId} style={styles.itemCard}>
                <Text style={styles.itemTitle}>
                  {item.productCode} — {item.productName}
                </Text>

                <DetailRow label="LOT" value={item.lotNumber} />

                <DetailRow label="Ilość" value={item.quantity} />

                <DetailRow
                  label="Zlecenie produkcyjne"
                  value={item.productionOrderNumber}
                />

                <DetailRow label="Data produkcji" value={item.productionDate} />

                <DetailRow
                  label="Data ważności"
                  value={item.expirationDate || "Brak"}
                />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const DetailRow = ({ label, value }) => {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue}>
        {value === null || value === undefined ? "Brak" : String(value)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 22,
    backgroundColor: "#0e1d77",
  },

  backButton: {
    marginBottom: 18,
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
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    color: "#111827",
    fontSize: 16,
    backgroundColor: "#ffffff",
  },

  searchButton: {
    minHeight: 50,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#0e1d77",
  },

  searchButtonPressed: {
    opacity: 0.8,
  },

  searchButtonDisabled: {
    opacity: 0.6,
  },

  searchButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  error: {
    marginTop: 16,
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

  detailsTitle: {
    marginBottom: 16,
    color: "#111827",
    fontSize: 21,
    fontWeight: "700",
  },

  detailRow: {
    marginBottom: 12,
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

  itemCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  itemTitle: {
    marginBottom: 14,
    color: "#0e1d77",
    fontSize: 17,
    fontWeight: "700",
  },
});
