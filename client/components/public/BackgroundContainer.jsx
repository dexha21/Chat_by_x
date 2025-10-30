import { ScrollView, StyleSheet, View } from "react-native";
import { useSystemColors } from "../../constants/useSystemColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BackgroundContainer = ({
  style,
  safe = false,
  scrollable = false,
  type = "background",
  children,
  ...props
}) => {
  const systemColor = useSystemColors();
  const insets = useSafeAreaInsets();

  const backgroundColor =
    type === "secondary" ? systemColor.secondary :
    type === "info" ? systemColor.info :
    type === "background" ? systemColor.background :
    type === "error" ? systemColor.error :
    type === "success" ? systemColor.success :
    type === "null" ? "transparent" :
    systemColor.primary;

  const safeAreaStyle = safe
    ? {
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }
    : {};

  if (scrollable) {
    return (
      <ScrollView
        style={{ backgroundColor }}
        contentContainerStyle={[safeAreaStyle, style]}
        keyboardShouldPersistTaps="handled"
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[{ backgroundColor }, safeAreaStyle, style]}
      {...props}
    >
      {children}
    </View>
  );
};

export default BackgroundContainer;

const styles = StyleSheet.create({});
