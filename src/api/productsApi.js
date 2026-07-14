const API_URL = process.env.EXPO_PUBLIC_API_URL;

const readErrorMessage = async (response) => {
  const errorText = await response.text();

  return errorText || "Nie udało się pobrać produktów.";
};

export const getProductsRequest = async (token) => {
  const response = await fetch(`${API_URL}/products`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);

    throw new Error(errorMessage);
  }

  return response.json();
};
