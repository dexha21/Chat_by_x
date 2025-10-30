import { Tabs, useRouter, useSegments, Slot } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSystemColors } from "../../constants/useSystemColors";
import { View, TouchableOpacity, Text, useWindowDimensions } from "react-native";

export default function TabLayout() {
  const systemColor = useSystemColors();
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800; // treat this as "desktop mode"

  const activeRoute = segments[1] ?? "messages"; 

  if (isLargeScreen) {
    return (
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View
          style={{
            width: 60,
            backgroundColor: systemColor.background,
            borderRightWidth: 1,
            borderColor: "#ddd",
            alignItems: "center",
            paddingTop: 20,
          }}
        >
          <TabButton
            label="Messages"
            icon="chatbubble-ellipses-outline"
            active={activeRoute === "messages"}
            onPress={() => router.replace("/(tabs)/messages")}
            activeColor={systemColor.primary}
          />
          <TabButton
            label="Stories"
            icon="book"
            active={activeRoute === "stories"}
            onPress={() => router.replace("/(tabs)/stories")}
            activeColor={systemColor.primary}
          />
          <TabButton
            label="Profile"
            icon="person-outline"
            active={activeRoute === "profile"}
            onPress={() => router.replace("/(tabs)/profile")}
            activeColor={systemColor.primary}
          />
        </View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          {/* This renders whichever tab is active */}
          <Slot />
        </View>
      </View>
    );
  }

  // Normal mobile horizontal tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: systemColor.primary,
        tabBarStyle: { backgroundColor: systemColor.background },
        tabBarHideOnKeyboard: true,
        animation: "shift", 
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: "Stories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabButton({ label, icon, active, onPress, activeColor }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginVertical: 10,
        alignItems: "center",
        opacity: active ? 1 : 0.5,
      }}
    >
      <Ionicons name={icon} size={28} color={active ? activeColor : "#888"} />
      {/* <Text style={{ fontSize: 12, color: active ? activeColor : "#888" }}>
        {label}
      </Text> */}
    </TouchableOpacity>
  );
}
