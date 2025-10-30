import React from 'react';
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSystemColors } from '../../constants/useSystemColors';

const predefinedColors = [
  // Reds & Pinks
  '#FF0000', // Red
  '#FF6B6B', // Soft red
  '#FFC1CC', // Light pink
  '#E91E63', // Hot pink

  // Oranges & Yellows
  '#FFA500', // Orange
  '#FFB347', // Soft orange
  '#FFD700', // Gold
  '#FFFF00', // Yellow
  '#FFFACD', // Lemon chiffon

  // Greens
  '#00FF00', // Lime
  '#32CD32', // Lime green
  '#2ECC71', // Emerald
  '#006400', // Dark green
  '#98FB98', // Pale green

  // Blues
  '#0000FF', // Blue
  '#1E90FF', // Dodger blue
  '#87CEFA', // Light sky blue
  '#4682B4', // Steel blue
  '#00CED1', // Dark turquoise

  // Purples
  '#800080', // Purple
  '#DA70D6', // Orchid
  '#D8BFD8', // Thistle
  '#8A2BE2', // Blue violet

  // Browns & Neutrals
  '#A52A2A', // Brown
  '#D2B48C', // Tan
  '#C0C0C0', // Silver
  '#808080', // Gray

  // Black, White, Misc
  '#000000', // Black
  '#FFFFFF', // White
  '#F5F5F5', // Light gray
  '#333333', // Dark gray
];



const ColorSelectorModal = ({ visible, onSelect, setColPalId }) => {

  const systemColor = useSystemColors()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setColPalId('')}
    >
      {/* Background overlay */}
      <Pressable style={styles.overlay} onPress={() => setColPalId('')}>
        {/* Prevent touch from closing when interacting with content */}
        <Pressable style={[styles.container, { backgroundColor: systemColor.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: systemColor.text }]}>Select a color</Text>
            <TouchableOpacity onPress={() => setColPalId('')}>
              <Text style={[styles.closeBtn, { color: systemColor.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.palette}>
            {predefinedColors.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => onSelect(color)}
                style={[styles.colorBox, { backgroundColor: color }]}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ColorSelectorModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    borderRadius: 12,
    minWidth: 250,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    fontSize: 20,
    color: '#888',
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
