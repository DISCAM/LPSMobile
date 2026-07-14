import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider } from "./src/auth/AuthProvider";
import { useAuth } from "./src/auth/useAuth";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { LogisticUnitLookupScreen } from "./src/screens/LogisticUnitLookupScreen";
import { WarehouseReceiptScreen } from "./src/screens/WarehouseReceiptScreen";
import { WarehouseShipmentScreen } from "./src/screens/WarehouseShipmentScreen";
import { ProductLookupScreen } from "./src/screens/ProductLookupScreen";
import { ProductionLotLookupScreen } from "./src/screens/ProductionLotLookupScreen";

const AppContent = () => {
  const { user, isAuthLoading } = useAuth();

  const [activeScreen, setActiveScreen] = useState("HOME");

  useEffect(() => {
    if (!user) {
      setActiveScreen("HOME");
    }
  }, [user]);

  if (isAuthLoading) {
    return (
      <View style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (activeScreen === "WAREHOUSE_RECEIPT") {
    return <WarehouseReceiptScreen onBack={() => setActiveScreen("HOME")} />;
  }

  if (activeScreen === "WAREHOUSE_SHIPMENT") {
    return <WarehouseShipmentScreen onBack={() => setActiveScreen("HOME")} />;
  }

  if (activeScreen === "PRODUCT_LOOKUP") {
    return <ProductLookupScreen onBack={() => setActiveScreen("HOME")} />;
  }

  if (activeScreen === "PRODUCTION_LOT_LOOKUP") {
    return <ProductionLotLookupScreen onBack={() => setActiveScreen("HOME")} />;
  }

  if (activeScreen === "LOGISTIC_UNIT_LOOKUP") {
    return <LogisticUnitLookupScreen onBack={() => setActiveScreen("HOME")} />;
  }

  return (
    <HomeScreen
      onOpenWarehouseReceipt={() => setActiveScreen("WAREHOUSE_RECEIPT")}
      onOpenWarehouseShipment={() => setActiveScreen("WAREHOUSE_SHIPMENT")}
      onOpenProductLookup={() => setActiveScreen("PRODUCT_LOOKUP")}
      onOpenProductionLotLookup={() => setActiveScreen("PRODUCTION_LOT_LOOKUP")}
      onOpenLogisticUnitLookup={() => setActiveScreen("LOGISTIC_UNIT_LOOKUP")}
    />
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0e1d77",
  },
});
