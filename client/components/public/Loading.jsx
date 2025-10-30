import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import SimpleLoading from './SimpleLoading';
import { useSystemColors } from '../../constants/useSystemColors';

const { width, height } = Dimensions.get('window');

const Loading = ({ running, text = 'Please wait...' }) => {
  if (!running) return null;

  const systemColor = useSystemColors();

  return (
    <View style={[styles.overlay]}>
      <View style={[styles.modal, { backgroundColor: systemColor.secondary }]}>
        <SimpleLoading running={true} />
        <Text style={[styles.text, { color: systemColor.text }]}>
          {text}
        </Text> 
      </View>
    </View>
  );
};

export default Loading;

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#000000aa',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
    alignItems: 'center',
  },
  text: {
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },
});

