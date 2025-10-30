import { Image, StyleSheet, Text, useColorScheme, View } from 'react-native'
import darkLogo from '../../assets/dark_logo.png'
import lightLogo from '../../assets/light_logo.png'

const Logo = ({ style, ...props }) => {

  const scheme = useColorScheme()
  
  const isDark = scheme === 'dark'

  return (
    <Image source={isDark ? darkLogo : lightLogo } style={[ { borderRadius: 18 }, style ]} {...props} />
  )
}

export default Logo

const styles = StyleSheet.create({})