import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Slot, Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { useSystemColors } from "../../../constants/useSystemColors";
import { StatusBar } from "expo-status-bar";
import { AuthContext } from "../../../contexts/AuthContext";
import Loading from "../../../components/public/Loading";
import StoryList from ".";
import BackgroundContainer from "../../../components/public/BackgroundContainer";

const Stories = () => {
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, wait } = useContext(AuthContext);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800;

  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (!wait && !isAuthenticated) {
      router.replace("/signin");
    } else {
      setLoading(false);
    }
  }, [wait, isAuthenticated]);

  if (isLargeScreen) {
    return (
      <BackgroundContainer style={{ flex: 1 }}>
        <Loading running={loading} />
        <StatusBar style="auto" />
        <View style={{ flex: 1, flexDirection: "row" }}>
          {/* Left side stays mounted permanently */}
          <View style={{ flex: 1.5, borderRightWidth: 1, borderColor: "#ddd" }}>
            <StoryList />
          </View>

          {/* Right side dynamically renders the active chat */}
          <View style={{ flex: 2 }}>
            {id && id !== '0' ? <Slot /> : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Select a conversation to start messaging
                </Text>
              </View>
            )}
          </View>
        </View>
      </BackgroundContainer>
    );
  }

  return (
    <>
      <Loading running={loading} />
      <StatusBar style="auto" />
      <BackgroundContainer
        safe
        style={{ flex: 1 }}
      >
        <Stack 
          screenOptions={{ 
            headerShown: false, 
            gestureEnabled: true,
            animation: "slide_from_right",
            animationDuration: Platform.OS === "android" ? 500 : 350,
          }} 
        />
      </BackgroundContainer>
    </>
  );
};

export default Stories;

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
});
