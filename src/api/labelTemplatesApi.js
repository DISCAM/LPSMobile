import { API_URL, getAuthHeaders, readErrorMessage } from "./apiUtils";

export const getLabelTemplatesRequest = async (token) => {
  const response = await fetch(`${API_URL}/label-templates`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Nie udało się pobrać szablonów etykiet.",
    );

    throw new Error(errorMessage);
  }

  return response.json();
};
