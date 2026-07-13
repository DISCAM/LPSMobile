import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const SelectionModal = ({
  visible,
  title,
  items,
  keyExtractor,
  getTitle,
  getSubtitle,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>

            <Pressable onPress={onClose}>
              <Text style={styles.closeButton}>Zamknij</Text>
            </Pressable>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => String(keyExtractor(item))}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>Brak dostępnych pozycji.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.itemTitle}>{getTitle(item)}</Text>

                {getSubtitle?.(item) ? (
                  <Text style={styles.itemSubtitle}>{getSubtitle(item)}</Text>
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  modal: {
    maxHeight: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: "#ffffff",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  title: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
  },

  closeButton: {
    color: "#0e1d77",
    fontSize: 15,
    fontWeight: "700",
  },

  list: {
    padding: 16,
    paddingBottom: 35,
  },

  item: {
    marginBottom: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },

  itemPressed: {
    backgroundColor: "#eef0ff",
  },

  itemTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },

  itemSubtitle: {
    marginTop: 5,
    color: "#6b7280",
    fontSize: 14,
  },

  empty: {
    padding: 30,
    color: "#6b7280",
    textAlign: "center",
  },
});
