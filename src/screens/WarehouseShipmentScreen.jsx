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
import { getLogisticUnitsRequest } from "../api/logisticUnitsApi";
import {
  getWarehouseOrdersRequest,
  shipLogisticUnitRequest,
} from "../api/warehouseShipmentApi";
import { SelectionModal } from "../components/SelectionModal";

const normalizeValue = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase();
};

const normalizeSscc = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");

  // Kod GS1-128 może zwrócić AI "00"
  // przed właściwym 18-cyfrowym SSCC.
  if (digits.length === 20 && digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  return digits;
};

const getWarehouseOrderId = (warehouseOrder) => {
  return warehouseOrder?.warehouseOrderId ?? warehouseOrder?.WarehouseOrderId;
};

const getWarehouseOrderStatus = (warehouseOrder) => {
  return (
    warehouseOrder?.status ??
    warehouseOrder?.warehouseOrderStatus ??
    warehouseOrder?.Status ??
    warehouseOrder?.WarehouseOrderStatus ??
    "Brak"
  );
};

const getWarehouseOrderNumber = (warehouseOrder) => {
  return (
    warehouseOrder?.orderNumber ??
    warehouseOrder?.OrderNumber ??
    `ID: ${getWarehouseOrderId(warehouseOrder)}`
  );
};

const getWarehouseOrderCustomerName = (warehouseOrder) => {
  return (
    warehouseOrder?.customerName ??
    warehouseOrder?.CustomerName ??
    "Brak klienta"
  );
};

const getLogisticUnitId = (logisticUnit) => {
  return logisticUnit?.logisticUnitId ?? logisticUnit?.LogisticUnitId;
};

export const WarehouseShipmentScreen = ({ onBack }) => {
  const { token } = useAuth();

  const ssccInputRef = useRef(null);
  const isSearchingRef = useRef(false);

  const lastScanRef = useRef({
    value: "",
    timestamp: 0,
  });

  const [warehouseOrders, setWarehouseOrders] = useState([]);
  const [selectedWarehouseOrder, setSelectedWarehouseOrder] = useState(null);

  const [isWarehouseOrderModalVisible, setIsWarehouseOrderModalVisible] =
    useState(false);

  const [sscc, setSscc] = useState("");
  const [logisticUnit, setLogisticUnit] = useState(null);
  const [notes, setNotes] = useState("");

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [shipmentResult, setShipmentResult] = useState(null);

  const focusSsccInput = () => {
    setTimeout(() => {
      ssccInputRef.current?.focus();
    }, 150);
  };

  const filterAvailableWarehouseOrders = (warehouseOrdersData) => {
    return warehouseOrdersData.filter((warehouseOrder) => {
      const status = normalizeValue(getWarehouseOrderStatus(warehouseOrder));

      return !["COMPLETED", "CANCELLED"].includes(status);
    });
  };

  const loadWarehouseOrders = async () => {
    const warehouseOrdersData = await getWarehouseOrdersRequest(token);

    const availableWarehouseOrders =
      filterAvailableWarehouseOrders(warehouseOrdersData);

    setWarehouseOrders(availableWarehouseOrders);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      try {
        setError("");
        setIsInitialLoading(true);

        const warehouseOrdersData = await getWarehouseOrdersRequest(token);

        if (isCancelled) {
          return;
        }

        const availableWarehouseOrders =
          filterAvailableWarehouseOrders(warehouseOrdersData);

        setWarehouseOrders(availableWarehouseOrders);
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            requestError.message || "Nie udało się pobrać zleceń magazynowych.",
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

  const handleOpenWarehouseOrderModal = () => {
    if (warehouseOrders.length === 0) {
      return;
    }

    setIsWarehouseOrderModalVisible(true);
  };

  const handleCloseWarehouseOrderModal = () => {
    setIsWarehouseOrderModalVisible(false);
  };

  const handleWarehouseOrderSelect = (warehouseOrder) => {
    setSelectedWarehouseOrder(warehouseOrder);
    setLogisticUnit(null);
    setShipmentResult(null);
    setSscc("");
    setNotes("");
    setError("");
    setIsWarehouseOrderModalVisible(false);

    focusSsccInput();
  };

  const handleSearch = async (scannedValue = sscc, showEmptyError = true) => {
    const normalizedSscc = normalizeSscc(scannedValue);

    //console.log("RAW SSCC:", JSON.stringify(scannedValue));

    //console.log("NORMALIZED SSCC:", normalizedSscc);

    if (!selectedWarehouseOrder) {
      setError("Najpierw wybierz zlecenie magazynowe.");

      return;
    }

    if (!normalizedSscc) {
      if (showEmptyError) {
        setError("Zeskanuj lub wpisz numer SSCC.");
      }

      focusSsccInput();

      return;
    }

    if (isSearchingRef.current) {
      return;
    }

    const currentTimestamp = Date.now();

    const isDuplicateScan =
      lastScanRef.current.value === normalizedSscc &&
      currentTimestamp - lastScanRef.current.timestamp < 700;

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
      setShipmentResult(null);
      setLogisticUnit(null);
      setIsSearching(true);

      const logisticUnits = await getLogisticUnitsRequest(token);

      const foundLogisticUnit = logisticUnits.find(
        (item) => normalizeSscc(item.sscc) === normalizedSscc,
      );

      if (!foundLogisticUnit) {
        setError(`Nie znaleziono jednostki o numerze SSCC: ${normalizedSscc}`);

        return;
      }

      const logisticUnitStatus = normalizeValue(foundLogisticUnit.status);

      if (logisticUnitStatus === "SHIPPED") {
        setError("Ta jednostka logistyczna została już wydana z magazynu.");

        return;
      }

      setLogisticUnit(foundLogisticUnit);
    } catch (requestError) {
      setError(
        requestError.message || "Nie udało się pobrać jednostki logistycznej.",
      );
    } finally {
      setIsSearching(false);
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
    setLogisticUnit(null);
    setShipmentResult(null);

    if (error) {
      setError("");
    }
  };

  const handleShipment = async () => {
    if (!selectedWarehouseOrder) {
      setError("Wybierz zlecenie magazynowe.");

      return;
    }

    if (!logisticUnit) {
      setError("Zeskanuj prawidłową jednostkę logistyczną.");

      focusSsccInput();

      return;
    }

    const warehouseOrderId = getWarehouseOrderId(selectedWarehouseOrder);

    const logisticUnitId = getLogisticUnitId(logisticUnit);

    if (!warehouseOrderId) {
      setError("Wybrane zlecenie nie posiada prawidłowego ID.");

      return;
    }

    if (!logisticUnitId) {
      setError("Wybrana jednostka nie posiada prawidłowego ID.");

      return;
    }

    try {
      setError("");
      setShipmentResult(null);
      setIsSubmitting(true);

      const shipmentData = {
        logisticUnitId,
        notes: notes.trim() || null,
      };

      //console.log("DANE WYDANIA:", shipmentData);

      const result = await shipLogisticUnitRequest(
        warehouseOrderId,
        shipmentData,
        token,
      );

      setShipmentResult(result);
    } catch (requestError) {
      setError(
        requestError.message || "Nie udało się wykonać wydania magazynowego.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrepareNextShipment = async () => {
    try {
      setSelectedWarehouseOrder(null);
      setLogisticUnit(null);
      setShipmentResult(null);
      setSscc("");
      setNotes("");
      setError("");
      setIsInitialLoading(true);

      await loadWarehouseOrders();
    } catch (requestError) {
      setError(
        requestError.message || "Nie udało się odświeżyć zleceń magazynowych.",
      );
    } finally {
      setIsInitialLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <View style={styles.loadingPage}>
        <StatusBar style="light" />

        <ActivityIndicator size="large" color="#ffffff" />

        <Text style={styles.loadingText}>
          Pobieranie zleceń magazynowych...
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

        <Text style={styles.title}>Wydanie z magazynu</Text>

        <Text style={styles.subtitle}>
          Zeskanuj SSCC i przypisz jednostkę do zlecenia
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Zlecenie magazynowe</Text>

          <Text style={styles.label}>Zlecenie</Text>

          <Pressable
            style={({ pressed }) => [
              styles.selectionField,
              warehouseOrders.length === 0 && styles.selectionFieldDisabled,
              pressed && warehouseOrders.length > 0 && styles.buttonPressed,
            ]}
            onPress={handleOpenWarehouseOrderModal}
            disabled={warehouseOrders.length === 0}
          >
            <Text
              style={[
                styles.selectionFieldText,
                !selectedWarehouseOrder && styles.selectionPlaceholder,
              ]}
              numberOfLines={2}
            >
              {selectedWarehouseOrder
                ? `${getWarehouseOrderNumber(
                    selectedWarehouseOrder,
                  )} — ${getWarehouseOrderCustomerName(selectedWarehouseOrder)}`
                : warehouseOrders.length === 0
                  ? "Brak aktywnych zleceń"
                  : "Wybierz zlecenie magazynowe"}
            </Text>

            <Text style={styles.selectionArrow}>▼</Text>
          </Pressable>

          {warehouseOrders.length === 0 ? (
            <Text style={styles.infoText}>
              Brak aktywnych zleceń magazynowych.
            </Text>
          ) : null}

          {selectedWarehouseOrder ? (
            <View style={styles.orderDetails}>
              <DetailRow
                label="Numer zlecenia"
                value={getWarehouseOrderNumber(selectedWarehouseOrder)}
              />

              <DetailRow
                label="Status"
                value={getWarehouseOrderStatus(selectedWarehouseOrder)}
              />

              <DetailRow
                label="Klient"
                value={getWarehouseOrderCustomerName(selectedWarehouseOrder)}
              />

              <DetailRow
                label="Data utworzenia"
                value={
                  selectedWarehouseOrder.createdAt ??
                  selectedWarehouseOrder.CreatedAt
                }
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Jednostka logistyczna</Text>

          <Text style={styles.label}>Numer SSCC</Text>

          <TextInput
            ref={ssccInputRef}
            style={[styles.input, logisticUnit && styles.inputSuccess]}
            value={sscc}
            onChangeText={handleSsccChange}
            onSubmitEditing={handleScanSubmit}
            placeholder={
              selectedWarehouseOrder
                ? "Zeskanuj SSCC"
                : "Najpierw wybierz zlecenie"
            }
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            showSoftInputOnFocus={false}
            blurOnSubmit={false}
            returnKeyType="search"
            editable={
              Boolean(selectedWarehouseOrder) && !isSearching && !isSubmitting
            }
          />

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              (!selectedWarehouseOrder || isSearching) && styles.buttonDisabled,
            ]}
            onPress={handleManualSearch}
            disabled={!selectedWarehouseOrder || isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#0e1d77" />
            ) : (
              <Text style={styles.secondaryButtonText}>Sprawdź SSCC</Text>
            )}
          </Pressable>

          {logisticUnit ? (
            <View style={styles.logisticUnitCard}>
              <Text style={styles.logisticUnitTitle}>
                ✓ Jednostka odnaleziona
              </Text>

              <DetailRow label="SSCC" value={logisticUnit.sscc} />

              <DetailRow label="Typ jednostki" value={logisticUnit.unitType} />

              <DetailRow label="Status" value={logisticUnit.status} />

              <DetailRow
                label="Łączna ilość"
                value={logisticUnit.totalQuantity}
              />

              {logisticUnit.items?.map((item) => (
                <View key={item.logisticUnitItemId} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {item.productCode} — {item.productName}
                  </Text>

                  <DetailRow label="LOT" value={item.lotNumber} />

                  <DetailRow label="Ilość" value={item.quantity} />
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Potwierdzenie wydania</Text>

          <Text style={styles.label}>Uwagi</Text>

          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Opcjonalne uwagi do wydania"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleShipment}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submitLoading}>
                <ActivityIndicator color="#ffffff" />

                <Text style={styles.submitButtonText}>Wydawanie...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>
                Potwierdź wydanie z magazynu
              </Text>
            )}
          </Pressable>
        </View>

        {shipmentResult ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>✓ Wydanie zakończone</Text>

            <DetailRow label="Zlecenie" value={shipmentResult.orderNumber} />

            <DetailRow
              label="Status zlecenia"
              value={shipmentResult.warehouseOrderStatus}
            />

            <DetailRow label="SSCC" value={shipmentResult.sscc} />

            <DetailRow
              label="Status jednostki"
              value={shipmentResult.logisticUnitStatus}
            />

            <DetailRow label="Ilość" value={shipmentResult.quantity} />

            <DetailRow label="Typ ruchu" value={shipmentResult.movementType} />

            <DetailRow
              label="Utworzone ruchy"
              value={shipmentResult.stockMovementIds?.join(", ") || "Brak"}
            />

            <Pressable
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handlePrepareNextShipment}
            >
              <Text style={styles.nextButtonText}>Wydaj kolejną jednostkę</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <SelectionModal
        visible={isWarehouseOrderModalVisible}
        title="Wybierz zlecenie magazynowe"
        items={warehouseOrders}
        keyExtractor={(warehouseOrder) => getWarehouseOrderId(warehouseOrder)}
        getTitle={(warehouseOrder) => getWarehouseOrderNumber(warehouseOrder)}
        getSubtitle={(warehouseOrder) => {
          const customerName = getWarehouseOrderCustomerName(warehouseOrder);

          const status = getWarehouseOrderStatus(warehouseOrder);

          return `${customerName} • ${status}`;
        }}
        onSelect={handleWarehouseOrderSelect}
        onClose={handleCloseWarehouseOrderModal}
      />
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
    fontSize: 25,
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
    padding: 18,
    paddingBottom: 50,
  },

  card: {
    marginBottom: 18,
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },

  cardTitle: {
    marginBottom: 20,
    color: "#111827",
    fontSize: 19,
    fontWeight: "700",
  },

  label: {
    marginBottom: 8,
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },

  selectionField: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },

  selectionFieldDisabled: {
    backgroundColor: "#e5e7eb",
    opacity: 0.65,
  },

  selectionFieldText: {
    flex: 1,
    marginRight: 10,
    color: "#111827",
    fontSize: 15,
  },

  selectionPlaceholder: {
    color: "#9ca3af",
  },

  selectionArrow: {
    color: "#6b7280",
    fontSize: 13,
  },

  input: {
    minHeight: 52,
    marginBottom: 16,
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

  notesInput: {
    minHeight: 90,
    paddingTop: 14,
  },

  secondaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0e1d77",
    borderRadius: 8,
  },

  secondaryButtonText: {
    color: "#0e1d77",
    fontSize: 15,
    fontWeight: "700",
  },

  orderDetails: {
    marginTop: 18,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
  },

  logisticUnitCard: {
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
  },

  logisticUnitTitle: {
    marginBottom: 14,
    color: "#15803d",
    fontSize: 17,
    fontWeight: "700",
  },

  itemCard: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#bbf7d0",
  },

  itemTitle: {
    marginBottom: 12,
    color: "#0e1d77",
    fontSize: 16,
    fontWeight: "700",
  },

  submitButton: {
    minHeight: 56,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#0e1d77",
  },

  submitLoading: {
    flexDirection: "row",
    alignItems: "center",
  },

  submitButtonText: {
    marginLeft: 8,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },

  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    textAlign: "center",
  },

  infoText: {
    marginTop: 14,
    color: "#6b7280",
    textAlign: "center",
  },

  successCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
  },

  successTitle: {
    marginBottom: 18,
    color: "#15803d",
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

  nextButton: {
    minHeight: 48,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#15803d",
  },

  nextButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
