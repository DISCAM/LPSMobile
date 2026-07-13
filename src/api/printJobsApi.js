import { API_URL, getAuthHeaders, readErrorMessage } from "./apiUtils";

export const printJobRequest = async (printJobId, token) => {
  const response = await fetch(`${API_URL}/print-jobs/${printJobId}/print`, {
    method: "POST",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(
      response,
      "Przyjęcie zostało utworzone, ale nie udało się uruchomić wydruku.",
    );

    throw new Error(errorMessage);
  }

  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  return JSON.parse(responseText);
};
