import { StyleSheet, TextInput, View, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Textx from './Textx'
import { useSystemColors } from '../../constants/useSystemColors'
import { Ionicons } from '@expo/vector-icons' // For eye icon

const TextxInput = ({
  label = '',
  labelStyle = {},
  viewStyle = {},
  password = false,
  style,
  type = 'text', // default to text
  ...props
}) => {
  const systemColor = useSystemColors()
  const [secure, setSecure] = useState(password)

  // Map HTML-like type to React Native keyboard types
  const getKeyboardType = (type) => {
    switch (type) {
      case 'email':
        return 'email-address'
      case 'number':
        return 'numeric'
      case 'phone':
        return 'phone-pad'
      default:
        return 'default'
    }
  }

  return (
    <View style={[viewStyle]}>
      {label && (
        <Textx
          style={[
            {
              fontSize: 24,
              marginBottom: 6
            },
            labelStyle
          ]}
        >
          {label}
        </Textx>
      )}

      <View style={styles.inputWrapper}>
      <TextInput
        style={[
          styles.textInput,
          style,
          {
            backgroundColor: systemColor.background,
            color: systemColor.text,
            flex: 1,
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            borderTopRightRadius: password ? 0 : 8,
            borderBottomRightRadius: password ? 0 : 8,
            outlineStyle: "none",
            borderWidth: 1,
            borderTopColor: systemColor.infoBorder,
            borderBottomColor: systemColor.infoBorder,
            borderLeftColor: systemColor.infoBorder,
            borderRightColor: systemColor.infoBorder,
            borderRightWidth: password ? 0 : 1, // ✅ FIX: hide border when password field
          }
        ]}
        secureTextEntry={secure}
        keyboardType={getKeyboardType(type)}
        {...props}
      />

        {password && (
          <TouchableOpacity
            onPress={() => setSecure(!secure)}
            style={[
              styles.eyeIcon,
              {
                backgroundColor: systemColor.background,
                borderTopColor: systemColor.infoBorder,
                borderBottomColor: systemColor.infoBorder,
                borderLeftWidth: 0, // ✅ FIX: properly hide left border
                borderRightColor: systemColor.infoBorder,
                borderWidth: 1,
              }
            ]}
          >
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={24}
              color={systemColor.text}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default TextxInput

const styles = StyleSheet.create({
  textInput: {
    fontSize: 20,
    padding: 12
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative'
  },
  eyeIcon: {
    paddingHorizontal: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 10,
  }
})
