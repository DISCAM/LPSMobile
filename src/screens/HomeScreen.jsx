import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../auth/useAuth";

export const HomeScreen = ({
  onOpenWarehouseReceipt,
  onOpenLogisticUnitLookup,
}) => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.page}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Operacje magazynowe</Text>

        <Text style={styles.userText}>{user?.userName || user?.email}</Text>
      </View>

      <View style={styles.content}>
        <Pressable
          style={styles.operationButton}
          onPress={onOpenWarehouseReceipt}
        >
          <Text style={styles.operationButtonText}>Przyjęcie z produkcji</Text>
        </Pressable>

        <Pressable style={styles.operationButton}>
          <Text style={styles.operationButtonText}>Wydanie z magazynu</Text>
        </Pressable>

        <Pressable
          style={styles.operationButton}
          onPress={onOpenLogisticUnitLookup}
        >
          <Text style={styles.operationButtonText}>Sprawdź SSCC</Text>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Wyloguj</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },

  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "#0e1d77",
  },

  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
  },

  userText: {
    marginTop: 8,
    color: "#d6dcff",
    fontSize: 14,
  },

  content: {
    flex: 1,
    padding: 24,
  },

  operationButton: {
    minHeight: 76,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe3ea",
  },

  operationButtonText: {
    color: "#0e1d77",
    fontSize: 18,
    fontWeight: "700",
  },

  logoutButton: {
    minHeight: 50,
    marginTop: "auto",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#dc2626",
  },

  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
