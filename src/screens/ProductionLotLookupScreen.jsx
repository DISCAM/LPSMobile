import { useEffect, useRef, useState } from "react";
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

import { useAuth } from "../auth/useAuth";
import { getProductionLotsRequest } from "../api/productionLotsApi";

const normalizeLotNumber = (value) => {
  const rawValue = String(value ?? "").trim();

  const valueWithoutScannerPrefix = rawValue.replace(/^\][A-Za-z]\d/, "");

  const valueWithoutApplicationIdentifier = valueWithoutScannerPrefix.replace(
    /^\(10\)/,
    "",
  );

  return valueWithoutApplicationIdentifier.trim().toUpperCase();
};

const getProductionLotId = (productionLot) => {
  return productionLot?.productionLotId ?? productionLot?.ProductionLotId;
};

const getProductionLotNumber = (productionLot) => {
  return productionLot?.lotNumber ?? productionLot?.LotNumber ?? "";
};

const getValue = (object, camelCaseName, pascalCaseName) => {
  return object?.[camelCaseName] ?? object?.[pascalCaseName];
};

export const ProductionLotLookupScreen = ({ onBack }) => {
  const { token } = useAuth();

  const lotInputRef = useRef(null);
  const isSearchingRef = useRef(false);

  const lastScanRef = useRef({
    value: "",
    timestamp: 0,
  });

  const [productionLots, setProductionLots] = useState([]);

  const [selectedProductionLot, setSelectedProductionLot] = useState(null);

  const [lotNumber, setLotNumber] = useState("");
  const [error, setError] = useState("");

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isSearching, setIsSearching] = useState(false);

  const focusLotInput = () => {
    setTimeout(() => {
      lotInputRef.current?.focus();
    }, 120);
  };

  const loadProductionLots = async () => {
    const productionLotsData = await getProductionLotsRequest(token);

    setProductionLots(productionLotsData);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      try {
        setError("");
        setIsInitialLoading(true);

        const productionLotsData = await getProductionLotsRequest(token);

        if (isCancelled) {
          return;
        }

        setProductionLots(productionLotsData);
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            requestError.message ||
              "Nie udało się pobrać partii produkcyjnych.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsInitialLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleSearch = (scannedValue = lotNumber, showEmptyError = true) => {
    const normalizedLotNumber = normalizeLotNumber(scannedValue);

    console.log("RAW LOT:", JSON.stringify(scannedValue));

    console.log("NORMALIZED LOT:", normalizedLotNumber);

    if (!normalizedLotNumber) {
      if (showEmptyError) {
        setError("Zeskanuj lub wpisz numer partii LOT.");
      }

      focusLotInput();

      return;
    }

    if (isSearchingRef.current) {
      return;
    }

    const currentTimestamp = Date.now();

    const isDuplicateScan =
      lastScanRef.current.value === normalizedLotNumber &&
      currentTimestamp - lastScanRef.current.timestamp < 700;

    if (isDuplicateScan) {
      return;
    }

    lastScanRef.current = {
      value: normalizedLotNumber,
      timestamp: currentTimestamp,
    };

    isSearchingRef.current = true;

    try {
      setError("");
      setSelectedProductionLot(null);
      setIsSearching(true);

      const foundProductionLot = productionLots.find((productionLot) => {
        const lotFromApi = normalizeLotNumber(
          getProductionLotNumber(productionLot),
        );

        const productionLotId = String(getProductionLotId(productionLot) ?? "");

        return (
          lotFromApi === normalizedLotNumber ||
          productionLotId === normalizedLotNumber
        );
      });

      if (!foundProductionLot) {
        setError(`Nie znaleziono partii LOT: ${normalizedLotNumber}`);

        return;
      }

      setSelectedProductionLot(foundProductionLot);
    } catch (searchError) {
      setError(searchError.message || "Nie udało się wyszukać partii.");
    } finally {
      setIsSearching(false);
      setLotNumber("");

      setTimeout(() => {
        isSearchingRef.current = false;
        lotInputRef.current?.focus();
      }, 250);
    }
  };

  const handleScanSubmit = (event) => {
    const scannedValue = event.nativeEvent.text;

    handleSearch(scannedValue, false);
  };

  const handleManualSearch = () => {
    handleSearch(lotNumber, true);
  };

  const handleLotNumberChange = (value) => {
    setLotNumber(value);
    setSelectedProductionLot(null);

    if (error) {
      setError("");
    }
  };

  const handleRefresh = async () => {
    try {
      setError("");
      setSelectedProductionLot(null);
      setIsInitialLoading(true);

      await loadProductionLots();
    } catch (requestError) {
      setError(requestError.message || "Nie udało się odświeżyć partii.");
    } finally {
      setIsInitialLoading(false);
      focusLotInput();
    }
  };

  if (isInitialLoading) {
    return (
      <View style={styles.loadingPage}>
        <StatusBar style="light" />

        <ActivityIndicator size="large" color="#ffffff" />

        <Text style={styles.loadingText}>
          Pobieranie partii produkcyjnych...
        </Text>
      </View>
    );
  }

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

        <Text style={styles.title}>Sprawdź LOT</Text>

        <Text style={styles.subtitle}>Zeskanuj dowolną partię produkcyjną</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchCard}>
          <Text style={styles.label}>Numer LOT</Text>

          <TextInput
            ref={lotInputRef}
            style={[styles.input, selectedProductionLot && styles.inputSuccess]}
            value={lotNumber}
            onChangeText={handleLotNumberChange}
            onSubmitEditing={handleScanSubmit}
            placeholder="Zeskanuj lub wpisz LOT"
            placeholderTextColor="#9ca3af"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            showSoftInputOnFocus={false}
            blurOnSubmit={false}
            returnKeyType="search"
            editable={!isSearching}
          />

          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.buttonPressed,
              isSearching && styles.buttonDisabled,
            ]}
            onPress={handleManualSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>Sprawdź LOT</Text>
            )}
          </Pressable>

          <Text style={styles.loadedInfo}>
            Pobrane partie: {productionLots.length}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Odśwież listę partii</Text>
          </Pressable>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {selectedProductionLot ? (
          <View style={styles.detailsCard}>
            <Text style={styles.successTitle}>✓ Partia odnaleziona</Text>

            <Text style={styles.lotTitle}>
              {getProductionLotNumber(selectedProductionLot)}
            </Text>

            <DetailRow
              label="ID partii"
              value={getProductionLotId(selectedProductionLot)}
            />

            <DetailRow
              label="Numer LOT"
              value={getProductionLotNumber(selectedProductionLot)}
            />

            <DetailRow
              label="Zlecenie produkcyjne"
              value={getValue(
                selectedProductionLot,
                "productionOrderNumber",
                "ProductionOrderNumber",
              )}
            />

            <DetailRow
              label="ID zlecenia produkcyjnego"
              value={getValue(
                selectedProductionLot,
                "productionOrderId",
                "ProductionOrderId",
              )}
            />

            <DetailRow
              label="Kod produktu"
              value={getValue(
                selectedProductionLot,
                "productCode",
                "ProductCode",
              )}
            />

            <DetailRow
              label="Nazwa produktu"
              value={getValue(
                selectedProductionLot,
                "productName",
                "ProductName",
              )}
            />

            <DetailRow
              label="Wyprodukowana ilość"
              value={getValue(
                selectedProductionLot,
                "producedQuantity",
                "ProducedQuantity",
              )}
            />

            <DetailRow
              label="Status"
              value={getValue(selectedProductionLot, "status", "Status")}
            />

            <DetailRow
              label="Data produkcji"
              value={getValue(
                selectedProductionLot,
                "productionDate",
                "ProductionDate",
              )}
            />

            <DetailRow
              label="Data ważności"
              value={
                getValue(
                  selectedProductionLot,
                  "expirationDate",
                  "ExpirationDate",
                ) || "Brak"
              }
            />

            <DetailRow
              label="Linia produkcyjna"
              value={
                getValue(
                  selectedProductionLot,
                  "productionLine",
                  "ProductionLine",
                ) || "Brak"
              }
            />

            <DetailRow
              label="Zmiana"
              value={
                getValue(selectedProductionLot, "shiftCode", "ShiftCode") ||
                "Brak"
              }
            />
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

  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0e1d77",
  },

  loadingText: {
    marginTop: 14,
    color: "#ffffff",
    fontSize: 16,
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

  loadedInfo: {
    marginTop: 16,
    color: "#6b7280",
    textAlign: "center",
  },

  refreshButton: {
    minHeight: 44,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0e1d77",
    borderRadius: 8,
  },

  refreshButtonText: {
    color: "#0e1d77",
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

  lotTitle: {
    marginBottom: 20,
    color: "#0e1d77",
    fontSize: 19,
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
