const API_URL = process.env.EXPO_PUBLIC_API_URL;

const sendRequest = async (path, token, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();

  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof responseData === "string"
        ? responseData
        : responseData?.message ||
          responseData?.title ||
          "Wystąpił błąd podczas komunikacji z API.";

    throw new Error(errorMessage);
  }

  return responseData;
};

export const getWarehouseOrdersRequest = async (token) => {
  return sendRequest("/warehouse-orders", token);
};

export const shipLogisticUnitRequest = async (
  warehouseOrderId,
  shipmentData,
  token,
) => {
  return sendRequest(
    `/warehouse-orders/${warehouseOrderId}/ship-logistic-unit`,
    token,
    {
      method: "POST",
      body: JSON.stringify(shipmentData),
    },
  );
};
