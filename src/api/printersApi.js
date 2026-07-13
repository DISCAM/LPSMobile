import { API_URL, getAuthHeaders, readErrorMessage } from "./apiUtils";

export const getPrintersRequest = async (token) => {
  const response = await fetch(`${API_URL}/printers`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Nie udało się pobrać drukarek.",
    );

    throw new Error(errorMessage);
  }

  return response.json();
};
