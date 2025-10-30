import { StyleSheet, View } from 'react-native'
import { useSystemColors } from '../../constants/useSystemColors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const InfoContainer = ({ style, safe = false, ...props }) => {
  const systemColor = useSystemColors()

  if (!safe) {
    <View
      style={[
        {
          backgroundColor: systemColor.info
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
          backgroundColor: systemColor.info,
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

export default InfoContainer

const styles = StyleSheet.create({})