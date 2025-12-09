import { StyleSheet, Platform, AppState } from "react-native";
import { Stack } from "expo-router";
import React, { useContext, useEffect, useState, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSystemColors } from "../constants/useSystemColors";
import GlobalNotification from "../components/public/GlobalNotification";
import { AuthContext, AuthProvider } from "../contexts/AuthContext";
import { useChatDb } from "../components/public/hooks/useChatDb";

import EventSource from "react-native-sse";

function RootLayoutInner() {
  const [lastChatAt, setLastChatAt] = useState(null);
  const [lastStoryAt, setLastStoryAt] = useState(null);

  const systemColor = useSystemColors();
  const { isAuthenticated, wait, token, userid } = useContext(AuthContext);
  const {
    isReady,
    downloadMessages,
    getChatLastUpdatedAt,
    InsertChats,
    InsertStories,
    getStoriesLastUpdatedAt,
    downloadStories,
    cleanLocal_,
  } = useChatDb();

  const lastChatAtRef = useRef(null);
  lastChatAtRef.current = lastChatAt;

  const lastStoryAtRef = useRef(null);
  lastStoryAtRef.current = lastStoryAt;

  // Track SSE connection
  const sseRef = useRef(null);
  const reconnectRef = useRef(1000); // initial reconnect delay: 1s
  const reconnectTimeoutRef = useRef(null);

  const sseRefStory = useRef(null);
  const reconnectRefStory = useRef(1000); // initial reconnect delay: 1s
  const reconnectTimeoutRefStory = useRef(null);

  const cleanLocal = async () => {
    await cleanLocal_();
  };

  useEffect(() => {
    if (wait || !isAuthenticated || !token || !isReady) return;
    const connect = async () => {
      if (sseRef.current) return;

      let lc = await getChatLastUpdatedAt();

      if (!lc?.updated_at) {
        downloadMessages(token, () => connect());
      } else {
        setLastChatAt(lc.updated_at);
        lastChatAtRef.current = lc.updated_at;
      }

      // await new Promise(resolve => setTimeout(resolve, 1000))

      console.log("LastChatAtRef:", lastChatAtRef.current);

      if (!lastChatAtRef.current) return;

      const url = `http://192.168.0.118/Chat_by_x/server/public/api/live-chats?token=${encodeURIComponent(
        token
      )}&last_updated_at=${encodeURIComponent(lastChatAtRef.current)}`;

      console.log("Chat URL", url);

      const es =
        Platform.OS === "web"
          ? new window.EventSource(url)
          : new EventSource(url);

      sseRef.current = es;

      const handleNewMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const incoming = Array.isArray(data) ? data : [data];

          if (incoming.length > 0) {
            const latest = incoming[incoming.length - 1];
            if (latest?.updated_at) {
              setLastChatAt(latest.updated_at);
              InsertChats(incoming, () => console.log("inserted"));
            }

            console.log("sse messages", incoming);
          }
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
        }
      };

      es.addEventListener("open", () => {
        console.log("SSE connection opened for chats");
        reconnectRef.current = 1000; // reset reconnect delay on successful connection
      });

      es.addEventListener("message", handleNewMessage);

      es.addEventListener("error", (err) => {
        console.error("SSE error:", err);
        es.close();
        sseRef.current = null;
        downloadMessages(token); // optional: fetch missing messages

        // Exponential backoff for reconnect
        const delay = reconnectRef.current;
        reconnectRef.current = Math.min(reconnectRef.current * 2, 30000); // cap at 30s

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      sseRef.current?.removeAllEventListeners?.();
      sseRef.current?.close();
      sseRef.current = null;
    };
  }, [isAuthenticated, wait, token, isReady]);

  useEffect(() => {
    if (wait || !isAuthenticated || !token || !isReady) return;
    const connect = async () => {
      if (sseRefStory.current) return;

      let ls = await getStoriesLastUpdatedAt();

      console.log("point A");

      if (!ls?.updated_at) {
        downloadStories(token, () => connect());
      } else {
        setLastStoryAt(ls.updated_at);
        lastStoryAtRef.current = ls.updated_at;
      }

      console.log("point B");
      // await new Promise(resolve => setTimeout(resolve, 1000))

      console.log("lastStoryAt:", lastStoryAtRef.current);

      if (!lastStoryAtRef.current) return;

      const url = `http://192.168.0.118/Chat_by_x/server/public/api/live-stories?token=${encodeURIComponent(
        token
      )}&last_updated_at=${encodeURIComponent(lastStoryAtRef.current)}`;

      console.log("Story URL", url);

      const es =
        Platform.OS === "web"
          ? new window.EventSource(url)
          : new EventSource(url);

      sseRefStory.current = es;

      const handleNewMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const incoming = Array.isArray(data) ? data : [data];

          if (incoming.length > 0) {
            const latest = incoming[incoming.length - 1];
            if (latest?.updated_at) {
              setLastStoryAt(latest.updated_at);
              InsertStories(incoming, token, () => console.log("inserted"));
            }

            console.log(incoming);
          }
          console.log(incoming);
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
        }
      };

      es.addEventListener("open", () => {
        console.log("SSE connection opened for stories");
        reconnectRefStory.current = 20000;
      });

      es.addEventListener("message", handleNewMessage);

      es.addEventListener("error", (err) => {
        console.error("SSE error:", err);
        es.close();
        sseRefStory.current = null;
        // downloadMessages(token);

        const delay = reconnectRefStory.current;
        reconnectRefStory.current = 20000;

        reconnectTimeoutRefStory.current = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeoutRefStory.current);
      sseRefStory.current?.removeAllEventListeners?.();
      sseRefStory.current?.close();
      sseRefStory.current = null;
    };
  }, [isAuthenticated, wait, token, isReady]);

  useEffect(() => {
    if (isReady && !wait && isAuthenticated) {
      cleanLocal();
      console.log("hey");

      const interval = setInterval(cleanLocal, 300000);
      return () => clearInterval(interval);
    }
  }, [isReady, wait, isAuthenticated]);

  useEffect(() => {
    if (isReady && !wait && isAuthenticated) {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          cleanLocal();
        }
      });

      return () => sub.remove();
    }
  }, [isReady, wait, isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: systemColor.statusbar },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <GlobalNotification />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({});
