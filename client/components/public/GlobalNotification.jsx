import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { NotificationManager } from './NotificationManager';
import { Ionicons } from '@expo/vector-icons';

const typeStyles = {
  info: {
    backgroundColor: '#333',
    icon: 'information-circle',
  },
  success: {
    backgroundColor: '#2ecc71',
    icon: 'checkmark-circle',
  },
  error: {
    backgroundColor: '#e74c3c',
    icon: 'close-circle',
  },
};

const GlobalNotification = () => {
  const [notification, setNotification] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const show = ({ message, type }) => {
    setNotification({ message, type });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const hide = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setNotification(null);
    });
  };

  useEffect(() => {
    NotificationManager.setShowCallback(show);
    NotificationManager.setHideCallback(hide);

    return () => {
      NotificationManager.setShowCallback(null);
      NotificationManager.setHideCallback(null);
    };
  }, []);

  if (!notification) return null;

  const { message, type } = notification;
  const style = typeStyles[type] || typeStyles.info;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: style.backgroundColor }]}>
      <Ionicons name={style.icon} size={20} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity onPress={() => NotificationManager.dismiss()} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  closeButton: {
    marginLeft: 10,
    padding: 4,
  },
});

export default GlobalNotification;
