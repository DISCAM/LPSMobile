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

import { StatusBar } from "expo-status-bar";
import {
  getProductionLotsRequest,
  getProductionOrdersRequest,
} from "../api/productionApi";

import { getPrintersRequest } from "../api/printersApi";
import { getLabelTemplatesRequest } from "../api/labelTemplatesApi";
import { createWarehouseReceiptRequest } from "../api/warehouseReceiptsApi";
import { printJobRequest } from "../api/printJobsApi";
import { SelectionModal } from "../components/SelectionModal";
import { useAuth } from "../auth/useAuth";

const UNIT_TYPES = [
  {
    value: "BOX",
    label: "Pojemnik",
  },
  {
    value: "CARTON",
    label: "Karton",
  },
  {
    value: "PALLET",
    label: "Paleta",
  },
  {
    value: "OTHER",
    label: "Inne",
  },
];

export const WarehouseReceiptScreen = ({ onBack }) => {
  const { token } = useAuth();

  const lotInputRef = useRef(null);

  const [productionOrders, setProductionOrders] = useState([]);
  const [productionLots, setProductionLots] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [labelTemplates, setLabelTemplates] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [lotSearch, setLotSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitType, setUnitType] = useState("PALLET");
  const [copies, setCopies] = useState("1");
  const [notes, setNotes] = useState("");

  const [activeModal, setActiveModal] = useState(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLotsLoading, setIsLotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [printError, setPrintError] = useState("");
  const [receiptResult, setReceiptResult] = useState(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setError("");
        setIsInitialLoading(true);

        const [productionOrdersData, printersData, labelTemplatesData] =
          await Promise.all([
            getProductionOrdersRequest(token),
            getPrintersRequest(token),
            getLabelTemplatesRequest(token),
          ]);

        const activePrinters = printersData.filter(
          (printer) => printer.isActive !== false,
        );

        const logisticTemplates = labelTemplatesData.filter(
          (template) =>
            template.isActive !== false &&
            String(template.labelType).toUpperCase() === "LOGISTIC",
        );

        setProductionOrders(productionOrdersData);
        setPrinters(activePrinters);
        setLabelTemplates(logisticTemplates);

        if (activePrinters.length > 0) {
          setSelectedPrinter(activePrinters[0]);
        }

        const defaultTemplate = logisticTemplates.find(
          (template) => template.isDefault,
        );

        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate);
        } else if (logisticTemplates.length > 0) {
          setSelectedTemplate(logisticTemplates[0]);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, [token]);

  const focusLotInput = () => {
    setTimeout(() => {
      lotInputRef.current?.focus();
    }, 150);
  };

  const handleSelectOrder = async (productionOrder) => {
    try {
      setActiveModal(null);
      setError("");
      setSelectedOrder(productionOrder);
      setSelectedLot(null);
      setLotSearch("");
      setProductionLots([]);
      setIsLotsLoading(true);

      const productionLotsData = await getProductionLotsRequest(
        productionOrder.productionOrderId,
        token,
      );

      setProductionLots(productionLotsData);
      focusLotInput();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLotsLoading(false);
    }
  };

  const handleLotSearchChange = (value) => {
    setLotSearch(value);
    setSelectedLot(null);
    setError("");
  };

  const handleFindLot = () => {
    const normalizedValue = lotSearch.trim().toLowerCase();

    if (!selectedOrder) {
      setError("Najpierw wybierz zlecenie produkcyjne.");

      return;
    }

    if (!normalizedValue) {
      setError("Zeskanuj lub wpisz numer LOT.");

      focusLotInput();

      return;
    }

    const foundLot = productionLots.find((lot) => {
      const lotNumber = String(lot.lotNumber).trim().toLowerCase();
      const lotId = String(lot.productionLotId);
      return lotNumber === normalizedValue || lotId === normalizedValue;
    });

    if (!foundLot) {
      setSelectedLot(null);
      setError("Nie znaleziono LOT-u w wybranym zleceniu produkcyjnym.");

      setLotSearch("");
      focusLotInput();

      return;
    }

    setError("");
    setSelectedLot(foundLot);
    setLotSearch(foundLot.lotNumber);
  };

  const handleSelectPrinter = (printer) => {
    setSelectedPrinter(printer);
    setActiveModal(null);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setActiveModal(null);
  };

  const validateForm = () => {
    const parsedQuantity = Number(quantity.trim().replace(",", "."));

    const parsedCopies = Number.parseInt(copies, 10);

    if (!selectedOrder) {
      return "Wybierz zlecenie produkcyjne.";
    }

    if (!selectedLot) {
      return "Zeskanuj prawidłowy LOT.";
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return "Podaj prawidłową ilość większą od zera.";
    }

    if (!unitType) {
      return "Wybierz typ jednostki logistycznej.";
    }

    if (!selectedTemplate) {
      return "Wybierz szablon etykiety logistycznej.";
    }

    if (!selectedPrinter) {
      return "Wybierz drukarkę.";
    }

    if (
      !Number.isInteger(parsedCopies) ||
      parsedCopies < 1 ||
      parsedCopies > 1000
    ) {
      return "Liczba kopii musi mieścić się w zakresie od 1 do 1000.";
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);

      return;
    }

    const receiptData = {
      productionLotId: selectedLot.productionLotId,
      quantity: Number(quantity.trim().replace(",", ".")),
      unitType,
      notes: notes.trim() || null,
      labelTemplateId: selectedTemplate.id,
      printerId: selectedPrinter.printerId,
      copies: Number.parseInt(copies, 10),
    };

    try {
      setError("");
      setPrintError("");
      setReceiptResult(null);
      setIsSubmitting(true);

      const result = await createWarehouseReceiptRequest(receiptData, token);

      setReceiptResult(result);

      try {
        await printJobRequest(result.printJobId, token);
      } catch (printRequestError) {
        setPrintError(printRequestError.message);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewReceipt = () => {
    setSelectedLot(null);
    setLotSearch("");
    setQuantity("");
    setNotes("");
    setReceiptResult(null);
    setPrintError("");
    setError("");

    focusLotInput();
  };

  if (isInitialLoading) {
    return (
      <View style={styles.loadingPage}>
        <StatusBar style="light" />

        <ActivityIndicator size="large" color="#ffffff" />

        <Text style={styles.loadingText}>Pobieranie danych...</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backButton}>← Wróć</Text>
        </Pressable>

        <Text style={styles.title}>Przyjęcie z produkcji</Text>

        <Text style={styles.subtitle}>
          Utworzenie jednostki logistycznej i etykiety SSCC
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Zlecenie produkcyjne</Text>

          <Text style={styles.label}>Zlecenie produkcyjne</Text>

          <Pressable
            style={styles.select}
            onPress={() => setActiveModal("ORDER")}
          >
            <Text
              style={[styles.selectText, !selectedOrder && styles.placeholder]}
            >
              {selectedOrder
                ? `${selectedOrder.orderNumber} — ${selectedOrder.productName}`
                : "Wybierz zlecenie produkcyjne"}
            </Text>

            <Text style={styles.selectArrow}>›</Text>
          </Pressable>

          {selectedOrder ? (
            <View style={styles.infoBox}>
              <DetailRow
                label="Numer zlecenia"
                value={selectedOrder.orderNumber}
              />

              <DetailRow
                label="Produkt"
                value={`${selectedOrder.productCode} — ${selectedOrder.productName}`}
              />

              <DetailRow
                label="Planowana ilość"
                value={selectedOrder.plannedQuantity}
              />

              <DetailRow label="Status" value={selectedOrder.status} />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Skanowanie LOT</Text>

          <Text style={styles.label}>Numer LOT</Text>

          <TextInput
            ref={lotInputRef}
            style={[styles.input, !selectedOrder && styles.inputDisabled]}
            value={lotSearch}
            onChangeText={handleLotSearchChange}
            onSubmitEditing={handleFindLot}
            placeholder={
              selectedOrder ? "Zeskanuj numer LOT" : "Najpierw wybierz zlecenie"
            }
            placeholderTextColor="#9ca3af"
            editable={Boolean(selectedOrder) && !isLotsLoading}
            showSoftInputOnFocus={false}
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
          />

          {isLotsLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#0e1d77" />

              <Text style={styles.inlineLoadingText}>Pobieranie LOT-ów...</Text>
            </View>
          ) : (
            <Pressable
              style={styles.secondaryButton}
              onPress={handleFindLot}
              disabled={!selectedOrder}
            >
              <Text style={styles.secondaryButtonText}>Sprawdź LOT</Text>
            </Pressable>
          )}

          {selectedLot ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>LOT znaleziony</Text>

              <DetailRow label="Numer LOT" value={selectedLot.lotNumber} />

              <DetailRow
                label="Produkt"
                value={`${selectedLot.productCode} — ${selectedLot.productName}`}
              />

              <DetailRow
                label="Ilość wyprodukowana"
                value={selectedLot.producedQuantity}
              />

              <DetailRow label="Status" value={selectedLot.status} />

              <DetailRow
                label="Data produkcji"
                value={selectedLot.productionDate}
              />

              <DetailRow
                label="Data ważności"
                value={selectedLot.expirationDate || "Brak"}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            3. Dane jednostki logistycznej
          </Text>

          <Text style={styles.label}>Ilość</Text>

          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Np. 500"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Typ jednostki</Text>

          <View style={styles.unitTypes}>
            {UNIT_TYPES.map((item) => (
              <Pressable
                key={item.value}
                style={[
                  styles.unitTypeButton,
                  unitType === item.value && styles.unitTypeButtonActive,
                ]}
                onPress={() => setUnitType(item.value)}
              >
                <Text
                  style={[
                    styles.unitTypeText,
                    unitType === item.value && styles.unitTypeTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Uwagi</Text>

          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Uwagi opcjonalne"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Wydruk etykiety</Text>

          <Text style={styles.label}>Szablon etykiety logistycznej</Text>

          <Pressable
            style={styles.select}
            onPress={() => setActiveModal("TEMPLATE")}
          >
            <Text
              style={[
                styles.selectText,
                !selectedTemplate && styles.placeholder,
              ]}
            >
              {selectedTemplate ? selectedTemplate.name : "Wybierz szablon"}
            </Text>

            <Text style={styles.selectArrow}>›</Text>
          </Pressable>

          <Text style={styles.label}>Drukarka</Text>

          <Pressable
            style={styles.select}
            onPress={() => setActiveModal("PRINTER")}
          >
            <Text
              style={[
                styles.selectText,
                !selectedPrinter && styles.placeholder,
              ]}
            >
              {selectedPrinter ? selectedPrinter.name : "Wybierz drukarkę"}
            </Text>

            <Text style={styles.selectArrow}>›</Text>
          </Pressable>

          <Text style={styles.label}>Liczba kopii</Text>

          <TextInput
            style={styles.input}
            value={copies}
            onChangeText={setCopies}
            placeholder="1"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Przyjmij i wydrukuj etykietę
            </Text>
          )}
        </Pressable>

        {receiptResult ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Przyjęcie zostało utworzone</Text>

            <Text style={styles.sscc}>{receiptResult.sscc}</Text>

            <DetailRow
              label="Jednostka logistyczna ID"
              value={receiptResult.logisticUnitId}
            />

            <DetailRow label="Numer LOT" value={receiptResult.lotNumber} />

            <DetailRow label="Ilość" value={receiptResult.quantity} />

            <DetailRow label="Typ jednostki" value={receiptResult.unitType} />

            <DetailRow label="Status jednostki" value={receiptResult.status} />

            <DetailRow label="Print Job ID" value={receiptResult.printJobId} />

            {printError ? (
              <Text style={styles.printError}>{printError}</Text>
            ) : (
              <Text style={styles.printSuccess}>
                Zadanie zostało przekazane do wydruku.
              </Text>
            )}

            <Pressable
              style={styles.newReceiptButton}
              onPress={handleNewReceipt}
            >
              <Text style={styles.newReceiptButtonText}>Nowe przyjęcie</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <SelectionModal
        visible={activeModal === "ORDER"}
        title="Zlecenia produkcyjne"
        items={productionOrders}
        keyExtractor={(item) => item.productionOrderId}
        getTitle={(item) => item.orderNumber}
        getSubtitle={(item) => `${item.productCode} — ${item.productName}`}
        onSelect={handleSelectOrder}
        onClose={() => setActiveModal(null)}
      />

      <SelectionModal
        visible={activeModal === "PRINTER"}
        title="Drukarki"
        items={printers}
        keyExtractor={(item) => item.printerId}
        getTitle={(item) => item.name}
        getSubtitle={(item) => item.ipAddress || item.integrationType || ""}
        onSelect={handleSelectPrinter}
        onClose={() => setActiveModal(null)}
      />

      <SelectionModal
        visible={activeModal === "TEMPLATE"}
        title="Szablony logistyczne"
        items={labelTemplates}
        keyExtractor={(item) => item.labelTemplateId}
        getTitle={(item) => item.name}
        getSubtitle={(item) => `Wersja: ${item.versionNo ?? "-"}`}
        onSelect={handleSelectTemplate}
        onClose={() => setActiveModal(null)}
      />
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
    paddingTop: 50,
    paddingHorizontal: 22,
    paddingBottom: 22,
    backgroundColor: "#0e1d77",
  },

  backButton: {
    marginBottom: 16,
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

  scrollView: {
    flex: 1,
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  card: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },

  sectionTitle: {
    marginBottom: 18,
    color: "#111827",
    fontSize: 19,
    fontWeight: "700",
  },

  label: {
    marginTop: 10,
    marginBottom: 7,
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },

  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 16,
  },

  inputDisabled: {
    backgroundColor: "#f3f4f6",
  },

  notesInput: {
    minHeight: 90,
    paddingTop: 13,
  },

  select: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },

  selectText: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
  },

  placeholder: {
    color: "#9ca3af",
  },

  selectArrow: {
    marginLeft: 10,
    color: "#0e1d77",
    fontSize: 28,
  },

  infoBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },

  successBox: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },

  successTitle: {
    marginBottom: 12,
    color: "#166534",
    fontSize: 17,
    fontWeight: "700",
  },

  detailRow: {
    marginBottom: 10,
  },

  detailLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
  },

  detailValue: {
    marginTop: 2,
    color: "#111827",
    fontSize: 15,
  },

  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  inlineLoadingText: {
    marginLeft: 10,
    color: "#4b5563",
  },

  secondaryButton: {
    minHeight: 46,
    marginTop: 14,
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

  unitTypes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  unitTypeButton: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },

  unitTypeButtonActive: {
    borderColor: "#0e1d77",
    backgroundColor: "#0e1d77",
  },

  unitTypeText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },

  unitTypeTextActive: {
    color: "#ffffff",
  },

  errorBox: {
    marginBottom: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },

  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    fontWeight: "600",
  },

  submitButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#0e1d77",
  },

  submitButtonPressed: {
    opacity: 0.85,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  resultCard: {
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
  },

  resultTitle: {
    color: "#166534",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  sscc: {
    marginVertical: 16,
    color: "#0e1d77",
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },

  printSuccess: {
    marginTop: 10,
    color: "#166534",
    fontWeight: "700",
    textAlign: "center",
  },

  printError: {
    marginTop: 10,
    color: "#b91c1c",
    fontWeight: "700",
    textAlign: "center",
  },

  newReceiptButton: {
    minHeight: 48,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#166534",
  },

  newReceiptButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
