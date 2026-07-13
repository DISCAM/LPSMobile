const API_URL = process.env.EXPO_PUBLIC_API_URL;

const readErrorMessage = async (response) => {
  const errorText = await response.text();

  return errorText || "Wystąpił błąd podczas komunikacji z API.";
};

export const loginRequest = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);

    throw new Error(errorMessage);
  }

  return response.json();
};

export const getMeRequest = async (token) => {
  const response = await fetch(`${API_URL}/me`, {
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
