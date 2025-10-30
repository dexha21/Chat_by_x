import { StyleSheet, View } from 'react-native'
import { useSystemColors } from '../../constants/useSystemColors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const PrimaryContainer = ({ style, safe = false, ...props }) => {
  const systemColor = useSystemColors()

  if (!safe) {
    <View
      style={[
        {
          backgroundColor: systemColor.primary
        },
        style
      ]}
      { ...props }
    />
  }

  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        {
          backgroundColor: systemColor.primary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right
        },
        style
      ]}
      { ...props }
    />
  )
}

export default PrimaryContainer

const styles = StyleSheet.create({})