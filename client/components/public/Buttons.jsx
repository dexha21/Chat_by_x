import { StyleSheet, Pressable, View } from 'react-native'
import React from 'react'
import { useSystemColors } from '../../constants/useSystemColors'
import * as Haptics from 'expo-haptics';

const Buttons = ({
  style,
  type = "primary",
  disabled,
  resetStyle,
  haptic = false,
  children,
  onPress,
  hapticLongPress,
  onLongPress,
  ...props
}) => {
  const systemColor = useSystemColors()

  const backgroundColor =
    type === "secondary" ? systemColor.secondary :
    type === "info" ? systemColor.info :
    type === "background" ? systemColor.background :
    type === "error" ? systemColor.error :
    type === "success" ? systemColor.success :
    type === "null" ? "" :
    systemColor.primary

  const handlePress = async (e) => {
    if (haptic) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) onPress(e);
  };

  const handleLongPress = async (e) => {
    if (hapticLongPress) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onLongPress) onLongPress(e);
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        !resetStyle && styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Pressable>
  ) 
}

export default Buttons

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 0,
  },
})
