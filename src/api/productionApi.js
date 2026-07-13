import { API_URL, getAuthHeaders, readErrorMessage } from "./apiUtils";

export const getProductionOrdersRequest = async (token) => {
  const response = await fetch(`${API_URL}/production-orders`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Nie udało się pobrać zleceń produkcyjnych.",
    );

    throw new Error(errorMessage);
  }

  return response.json();
};

export const getProductionLotsRequest = async (productionOrderId, token) => {
  const response = await fetch(
    `${API_URL}/production-orders/${productionOrderId}/production-lots`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    },
  );

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Nie udało się pobrać partii produkcyjnych.",
    );

    throw new Error(errorMessage);
  }

  return response.json();
};
