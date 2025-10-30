// components/CodeInput.js
import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useSystemColors } from '../../constants/useSystemColors';
import Textx from './Textx';

const CodeInput = ({
  length = 6,
  onCodeChange = () => {},
  boxStyle = {},
  containerStyle = {},
  keyboardType = 'numeric',
  label,
  labelStyle
}) => {
  const [code, setCode] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  useEffect(() => {
    onCodeChange(code.join(''));
  }, [code]);

  const handleChange = (text, index) => {
    if (text.length > 1) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const systemColor = useSystemColors()

  return (
    <View style={[styles.mainContainer, containerStyle]}>
      {label && (
        <View>
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
        </View>
      )}
      <View
        style={[styles.container]}
      >
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => (inputs.current[index] = el)}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            maxLength={1}
            keyboardType={keyboardType}
            style={[styles.input, { color: systemColor.text, backgroundColor: systemColor.secondary }, boxStyle]}
            textAlign="center"
          />
        ))}
      </View>
    </View>
  );
};

export default CodeInput;

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: 'column'
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    width: 50,
    height: 60,
    borderRadius: 8,
    fontSize: 22,
    textAlign: 'center'
  },
});
