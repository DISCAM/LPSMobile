import { API_URL, getAuthHeaders, readErrorMessage } from "./apiUtils";

export const createWarehouseReceiptRequest = async (receiptData, token) => {
  const response = await fetch(`${API_URL}/warehouse-receipts`, {
    method: "POST",
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(receiptData),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Nie udało się utworzyć przyjęcia magazynowego.",
    );

    throw new Error(errorMessage);
  }

  return response.json();
};
