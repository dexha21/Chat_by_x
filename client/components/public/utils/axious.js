import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const axiosInstance = axios.create({
  baseURL: "http://192.168.0.118/Chat_by_x/server/public/",
  timeout: 100000,
});

const cancelTokens = {};

// fallback function if user didn't pass token explicitly
const getToken = async () => {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem("auth_token");
    } else {
      return await SecureStore.getItemAsync("auth_token");
    }
  } catch (e) {
    console.log("[Axious] Failed to get token:", e.message);
    return null;
  }
};

const axious = async (url, onSuccess, options = {}) => {
  const {
    method = "GET",
    data = null,
    headers = {},
    retry = 0,
    cancelKey = null,
    token = undefined,
    onUploadProgress = null,
    onDownloadProgress = null,
  } = options;

  const source = axios.CancelToken.source();
  if (cancelKey) {
    if (cancelTokens[cancelKey]) {
      cancelTokens[cancelKey].cancel("Canceled by new request");
    }
    cancelTokens[cancelKey] = source;
  }

  let finalToken = null;
  if (token === false) {
    finalToken = null;
  } else if (typeof token === "string") {
    finalToken = token;
  } else {
    finalToken = await getToken();
  }

  const finalHeaders = {
    ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
    ...(finalToken ? { Authorization: `Bearer ${finalToken}` } : {}),
    ...headers,
  };

  let attempt = 0;
  while (attempt <= retry) {
    try {
      const res = await axiosInstance({
        url,
        method,
        data,
        headers: finalHeaders,
        cancelToken: source.token,
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            onUploadProgress(percent, progressEvent);
          }
        },
        onDownloadProgress: (progressEvent) => {
          if (onDownloadProgress) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            onDownloadProgress(percent, progressEvent);
          }
        },
      });

      onSuccess(res.data);
      return;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`[Axious] Request canceled: ${error.message}`);
        return;
      }

      if (attempt === retry) {
        throw error;
      }

      attempt++;
    }
  }
};

export default axious;
