import React, { useEffect, useState } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  TouchableWithoutFeedback, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import { Video } from 'expo-av';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import { useWindowDimensions } from 'react-native';

/**
 * FullScreenFileViewer
 * 
 * Props:
 * - visible (boolean): controls visibility
 * - fileUrl (string): the URL or local URI of the file
 * - fileType (string): e.g. "image", "video", "pdf", "other"
 * - onClose (function): called when user taps outside or closes
 */
export default function FullScreenFileViewer({ visible, fileUrl, fileType, onClose }) {
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);

  if (!visible) return null;

  const handlePress = () => {
    if (fileType === 'pdf' || fileType === 'other') {
      // open in browser if it's not viewable inline
      WebBrowser.openBrowserAsync(fileUrl);
    } else {
      onClose?.();
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        { width, height }
      ]}
    >
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.container}>
          {loading && (
            <ActivityIndicator size="large" color="#fff" style={styles.loader} />
          )}

          {fileType === 'image' && (
            <Image
              source={{ uri: fileUrl }}
              style={styles.media}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {fileType === 'video' && (
            <Video
              source={{ uri: fileUrl }}
              style={styles.media}
              resizeMode="contain"
              useNativeControls
              shouldPlay
              onLoad={() => setLoading(false)}
            />
          )}

          {(fileType === 'pdf' || fileType === 'other') && (
            <Ionicons name="document-text-outline" size={80} color="white" />
          )}

          {/* Close Button */}
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.closeButton}>
              <Ionicons name="close" size={30} color="#fff" />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 999999,
    elevation: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loader: {
    position: 'absolute',
    top: '50%',
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 10,
  },
});
