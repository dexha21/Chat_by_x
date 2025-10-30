import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  Animated,
  Pressable,
} from 'react-native';
import BackgroundContainer from './BackgroundContainer';
import Buttons from './Buttons';
import { useSystemColors } from '../../constants/useSystemColors';
import Textx from './Textx';

const OptionPopUp = ({
  options = [],
  containerStyle,
  childStyle,
  type = 'secondary',
  visible = false,          // 🔸 Controlled visibility
  overlay = true,           // 🔸 Overlay mode on/off
  onClose = () => {},       // 🔸 Close handler (for overlay click)
  cancelBtn = true,
}) => {
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

  const systemColor = useSystemColors()

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacity.__getValue() === 0) return null; // Avoid render when hidden

  const PopupContent = (
    <Animated.View
      style={[
        styles.popupContainer,
        {
          width: width <= 500 ? width - 50 : 420,
          transform: [{ scale }],
          opacity,
          backgroundColor: systemColor.secondary
        },
        containerStyle,
      ]}
    >
      {options.filter((l) => l.name ).map((option, key) => (
        <Buttons
          key={key}
          style={[styles.option, childStyle]}
          onPress={() => option.onPress && option.onPress()}
        >
          {option.icon && <View style={styles.iconContainer}>{option.icon}</View>}
          {option.name}
        </Buttons>
      ))}
      {
        cancelBtn && (
          <Buttons
            style={[styles.option, childStyle]}
            onPress={() => onClose && onClose()}
            type='error'
          >
            <Textx style={{ textAlign: 'center' }}>
              Cancel
            </Textx>
          </Buttons>
        )
      }
    </Animated.View>
  );

  if (!overlay) return PopupContent; // Inline version (no overlay)

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.center}>{PopupContent}</View>
    </Animated.View>
  );
};

export default OptionPopUp;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  popupContainer: {
    borderRadius: 16,
    padding: 20,
  },
  option: {
    marginVertical: 6,
    width: '100%',
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    textAlign: 'center',
  },
  iconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
