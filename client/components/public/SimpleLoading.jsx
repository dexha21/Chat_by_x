import React, { useRef, useEffect } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

import loadingIcon from '../../assets/loading.png'; // make sure it's correctly imported

const SimpleLoading = ({ running }) => {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;

    if (running) {
      animation = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    }

    return () => {
      if (animation) {
        animation.stop(); // ✅ clean up the loop on unmount or when `running` becomes false
      }
    };
  }, [running]);

  if (!running) return null;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={{ marginHorizontal: 8 }}>
      <Animated.Image
        source={loadingIcon}
        style={{
          width: 20,
          height: 20,
          transform: [{ rotate: spin }],
        }}
      />
    </View>
  );
};

export default SimpleLoading;
