import React from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import Textx from './Textx';
import Buttons from './Buttons';
import { useSystemColors } from '../../constants/useSystemColors';

const EmailInputWithButton = ({
  label = 'Email',
  value,
  onChangeText,
  onPressButton,
  buttonLabel = 'send code',
  disabled = false,
  buttonVisible = true,
  containerStyle = {},
  buttonDisabled = false,
  inputDisabled = false
}) => {
  const systemColor = useSystemColors();

  return (
    <View style={[containerStyle]}>
      <Textx style={[{ marginBottom: 6 }, styles.label]}>{label}</Textx>

      <View style={styles.row}>
        <TextInput
          keyboardType="email-address"
          placeholder="Ex: johndoe@example.com"
          placeholderTextColor={systemColor.text}
          value={value}
          onChangeText={onChangeText}
          style={[
            styles.input,
            {
              backgroundColor: systemColor.background,
              color: systemColor.text,
              borderColor: systemColor.infoBorder
            }
          ]}
          editable={!inputDisabled}
        />

        {buttonVisible && (
          <Buttons
            style={[
              styles.button,
              {
                borderColor: systemColor.infoBorder,
                backgroundColor: systemColor.background
              }
            ]}
            type="secondary"
            disabled={buttonDisabled}
            onPress={onPressButton}
          >
            <Textx style={styles.buttonText}>{buttonLabel}</Textx>
          </Buttons>
        )}
      </View>
    </View>
  );
};

export default EmailInputWithButton;

const styles = StyleSheet.create({
  label: {
    fontSize: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    fontSize: 20,
    padding: 12,
    borderWidth: 1,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0, // Let button overlap border
    outlineStyle: 'none'
  },
  button: {
    borderWidth: 1,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0 // no double border between input & button
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 10.5
  }
});
