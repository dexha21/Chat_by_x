import React, { useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Buttons from "./Buttons";
import { NotificationManager } from "./NotificationManager";

const FilePicker = ({
  onPick,
  type = "any",
  children = "Pick a file",
  multiple = false,
  buttonType = "null",
  buttonStyle = {},
}) => {
  const [loading, setLoading] = useState(false);

  // ✅ Helper: safely attach size in MB
  const enrichFilesWithSize = async (files) => {
    const enriched = await Promise.all(
      files.map(async (file) => {
        try {
          let sizeBytes = 0;

          if (file.fileSize) sizeBytes = file.fileSize; // from ImagePicker
          else if (file.size) sizeBytes = file.size; // from DocumentPicker
          else {
            const info = await FileSystem.getInfoAsync(file.uri);
            sizeBytes = info.size || 0;
          }

          const sizeMB = +(sizeBytes / (1024 * 1024)).toFixed(2);
          return { ...file, size: sizeMB };
        } catch (error) {
          console.log("Error getting size:", error?.message);
          return { ...file, size: 0 };
        }
      })
    );
    return enriched;
  };

  // ✅ Pick image/video (optimized)
  const pickImage = async () => {
    try {
      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: multiple,
      });

      if (result.canceled) return;

      const files = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `media-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        fileSize: asset.fileSize,
      }));

      const enrichedFiles = await enrichFilesWithSize(files);
      onPick(enrichedFiles);
    } catch (error) {
      NotificationManager.push({
        message: error?.message || "Failed to pick image/video",
        type: "error",
      });
      console.log("Error:", error?.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Pick documents (optimized)
  const pickDocument = async () => {
    try {
      setLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: type === "any" ? "*/*" : type,
        multiple,
        copyToCacheDirectory: false, // ⚡ avoid slow copy
      });

      if (result.type !== "success") return;

      let files = [];
      if (Array.isArray(result.output)) {
        files = result.output.map((f) => ({
          uri: f.uri,
          name: f.name,
          type: f.mimeType || "application/octet-stream",
          size: f.size || 0,
        }));
      } else {
        files = [
          {
            uri: result.uri,
            name: result.name,
            type: result.mimeType || "application/octet-stream",
            size: result.size || 0,
          },
        ];
      }

      const enrichedFiles = await enrichFilesWithSize(files);
      onPick(enrichedFiles);
    } catch (error) {
      NotificationManager.push({
        message: error?.message || "Failed to pick document",
        type: "error",
      });
      console.log("Error:", error?.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Main entry
  const handlePick = async () => {
    try {
      setLoading(true);
      if (type === "image" || type === "video") {
        await pickImage();
      } else {
        await pickDocument();
      }
    } catch (error) {
      NotificationManager.push({
        message: error?.message || "Something went wrong while picking file",
        type: "error",
      });
      console.log("Error:", error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ position: "relative" }}>
      <Buttons
        type={buttonType}
        style={buttonStyle}
        resetStyle
        onPress={handlePick}
        disabled={loading}
      >
        {children}
      </Buttons>

      {loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: 8,
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 8 }}>
            Loading file...
          </Text>
        </View>
      )}
    </View>
  );
};

export default FilePicker;
