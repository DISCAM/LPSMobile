export const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getAuthHeaders = (token, includeJson = false) => {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

export const readErrorMessage = async (
  response,
  fallbackMessage = "Wystąpił błąd.",
) => {
  const errorText = await response.text();

  if (!errorText) {
    return fallbackMessage;
  }

  try {
    const errorData = JSON.parse(errorText);

    return (
      errorData.message ||
      errorData.detail ||
      errorData.title ||
      fallbackMessage
    );
  } catch {
    return errorText;
  }
};
