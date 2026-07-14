const API_URL = process.env.EXPO_PUBLIC_API_URL;

const readErrorMessage = async (response) => {
  const errorText = await response.text();

  if (!errorText) {
    return "Nie udało się pobrać partii produkcyjnych.";
  }

  try {
    const errorData = JSON.parse(errorText);

    return (
      errorData.message ||
      errorData.title ||
      "Nie udało się pobrać partii produkcyjnych."
    );
  } catch {
    return errorText;
  }
};

export const getProductionLotsRequest = async (token) => {
  const response = await fetch(`${API_URL}/production-lots`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);

    throw new Error(errorMessage);
  }

  const productionLots = await response.json();

  if (!Array.isArray(productionLots)) {
    throw new Error(
      "Backend zwrócił nieprawidłową listę partii produkcyjnych.",
    );
  }

  return productionLots;
};
