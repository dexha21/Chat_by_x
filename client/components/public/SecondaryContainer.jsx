import { ScrollView, StyleSheet, View } from 'react-native'
import { useSystemColors } from '../../constants/useSystemColors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SecondaryContainer = ({ style, scrollable = false, safe = false, ...props }) => {
  const systemColor = useSystemColors()

  if (!safe) {
    scrollable ?
    <ScrollView
      style={[
        { backgroundColor: systemColor.secondary },
        style
      ]}
      {...props}
    /> :
    <View
      style={[
        { backgroundColor: systemColor.secondary },
        style
      ]}
      {...props}
    />
  }

  const insets = useSafeAreaInsets()

  return (
    scrollable ?
    <ScrollView
      style={[
        {
          backgroundColor: systemColor.secondary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right
        },
        style
      ]}
      {...props}
    /> :
    <View
      style={[
        {
          backgroundColor: systemColor.secondary,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right
        },
        style
      ]}
      {...props}
    />
  )
}

export default SecondaryContainer

const styles = StyleSheet.create({})