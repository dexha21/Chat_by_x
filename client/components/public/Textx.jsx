import { StyleSheet, Text } from 'react-native'
import React from 'react'
import { useSystemColors } from '../../constants/useSystemColors'

const Textx = ({ info = false, primary = false, title = false, style, children, ...props }) => {
  const systemColor = useSystemColors()

  return (
    <Text
      style={[
        {
          color: primary
            ? systemColor.primaryText
            : info
            ? systemColor.primary
            : systemColor.text,
          fontWeight: title ? "bold" : "normal",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  )
}

export default Textx

const styles = StyleSheet.create({})
