import { Animated, FlatList, ImageBackground, Keyboard, Platform, SectionList, StyleSheet, Text, TextInput, useWindowDimensions, View, Image } from "react-native";
import BackgroundContainer from "../../../components/public/BackgroundContainer";
import Textx from "../../../components/public/Textx";
import { KeyboardAvoidingView, TouchableWithoutFeedback } from "react-native";
import Buttons from "../../../components/public/Buttons";
import { Ionicons } from "@expo/vector-icons";
import { useSystemColors } from "../../../constants/useSystemColors";
import Spacer from "../../../components/public/Spacer";
import { useCallback, useContext, useEffect, useState } from "react";
import TextxInput from "../../../components/public/TextxInput";
import { useChatDb } from "../../../components/public/hooks/useChatDb";
import { NotificationManager } from "../../../components/public/NotificationManager";
import { AuthContext } from "../../../contexts/AuthContext";
import dbEvents from "../../../components/public/hooks/dbEvents";
import { useRouter } from "expo-router";
import StoryView from "../../../components/stories/StoryView";
import FilePicker from "../../../components/public/FilePicker";
import axious from "../../../components/public/utils/axious";
import { Video } from "expo-av";
import { Dropdown } from "react-native-element-dropdown";
import Loading from "../../../components/public/Loading";

const StoriesIndex = () => {
  const [addNewStories, setAddNewStories] = useState(false)
  const [myStories, setMyStories] = useState([])
  const [otherStories, setOtherStories] = useState([])
  const [viewedStories, setViewedStories] = useState([])
  const [text, setText] = useState("")
  const [selectedFileType, setSelectedFileType] = useState("")
  const [selectedFile, setSelectedFile] = useState("")
  const [uploadFileRange, setUploadFileRange] = useState(0)
  const [fileId, setFileId] = useState('')
  const [disableSave, setDisableSave] = useState(false)
  const [dur, setDur] = useState('1')

  const [userImage, setUserImage] = useState("")

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800; 
  const slideYAnim = useState(new Animated.Value(300))[0];
  const { isReady, loading, allStories, getUserProfilePicture, InsertStories } = useChatDb()
  const { isAuthenticated, wait, token, userid } = useContext(AuthContext)

  const route = useRouter()

  const toggleNewStories = () => {
    if (addNewStories) {
      Animated.timing(slideYAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setAddNewStories(false));
    } else {
      setAddNewStories(true);
      Animated.timing(slideYAnim, {
        toValue: 0, 
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const systemColor = useSystemColors()

  const putMyStories = (data) => {
    setMyStories(prev => {
      const newIds = new Set(data.map(s => s.id));
      const prevMap = new Map(prev.map(s => [s.id, s]));

      for (const id of prevMap.keys()) {
        if (!newIds.has(id)) {
          prevMap.delete(id);
        }
      }

      data.forEach(s => prevMap.set(s.id, { ...s }));

      return Array.from(prevMap.values())
        .sort((a, b) => new Date(b?.created_at) - new Date(a?.created_at));
    });
  };


  const putOtherStories = (data) => {
    setOtherStories(prev => {
      const newIds = new Set(data.map(s => s.id));
      const prevMap = new Map(prev.map(s => [s.id, s]));

      for (const id of prevMap.keys()) {
        if (!newIds.has(id)) {
          prevMap.delete(id);
        }
      }

      data.forEach(s => prevMap.set(s.id, { ...s }));

      return Array.from(prevMap.values())
        .sort((a, b) => new Date(b?.created_at) - new Date(a?.created_at));
    });
  }
  
  const putViewedStories = (data) => {
    setViewedStories(prev => {
      const newIds = new Set(data.map(s => s.id));
      const prevMap = new Map(prev.map(s => [s.id, s]));

      for (const id of prevMap.keys()) {
        if (!newIds.has(id)) {
          prevMap.delete(id);
        }
      }

      data.forEach(s => prevMap.set(s.id, { ...s }));

      return Array.from(prevMap.values())
        .sort((a, b) => new Date(b?.created_at) - new Date(a?.created_at));
    });
  }

  const processStories = (data) => {
    putMyStories(data.filter(s => s.user_id == userid))
    putOtherStories(data.filter(s => s.user_id != userid && !s.viewed))
    putViewedStories(data.filter(s => s.user_id != userid && s.viewed))
  }

  useEffect(() => {
    if (!wait && isAuthenticated && token) {
      if (isReady && !loading) {
        allStories(token, (stories) => {
          processStories(stories)
          console.log("stories - ", stories);
          
        })
      }
    }
  }, [wait, isAuthenticated, token, isReady, loading])

  useEffect(() => {
    const storiesListener = () => {
      allStories(token, (stories) => {
        processStories(stories)
        console.log(stories);
        
      })
    }

    dbEvents.on('stories-changed', storiesListener);

    return () => {
      dbEvents.off('stories-changed', storiesListener)
    }

  }, [isReady, token])

  useEffect(() => {
    if (isReady && !wait && isAuthenticated && token && userid) {
      getUserProfilePicture(userid, token, (file) => {
        if (file?.type === "image") {
          setUserImage(file.url)
        }          
      })
    }
  }, [isReady, wait, isAuthenticated, token, userid])

  const AddStory = () => {
    return (
      <View style={{ justifyContent: "center", alignItems: "center",  }} type="null">
        <Textx>
          <Ionicons name="add-circle" size={30} color={systemColor.text} />
        </Textx>
        <Spacer height={10} />
        <Textx>
          Add Story
        </Textx>
      </View>
    )
  }

  const uploadFile = async (file) => {
    setUploadFileRange(0)
    setDisableSave(true)

    try {
      const formData = new FormData();

      let fileUri = file.uri;
      let fileName = file.name || 'upload';
      let mimeType = file.type || 'image/jpeg';

      
      if (Platform.OS === 'android' && fileUri.startsWith('content://')) {
        const newPath = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: fileUri, to: newPath });
        fileUri = newPath;
      }

      if (!/\.[a-zA-Z0-9]+$/.test(fileName)) {
        const ext = mimeType.split('/')[1] || 'jpg';
        fileName = `${fileName}.${ext}`;
      }

      const response = await fetch(fileUri);
      const blob = await response.blob();

      if (Platform.OS === 'web') {
        formData.append('file', blob, fileName); 
      } else {
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: mimeType,
        }); 
      }

      await axious('/api/save-file', async (res) => {
        // console.log(res);
        
        if (res.success) {
          console.log(res);
          
          setFileId(res.file.id)
        } else {
          NotificationManager.push({
            message: res.message || 'Upload failed',
            type: 'error',
          });
        }
      }, {
        method: 'POST',
        token,
        data: formData,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (p) => {
          // const progress = Math.round((p.loaded / p.total) * 100);
          setUploadFileRange(p);
          // console.log(p);
          
        },
      });
    } catch (e) {
      NotificationManager.push({
        message: `failed. ${e.message}`,
        type: 'error',
      });
    } finally {
      setUploadFileRange(0);
      setDisableSave(false)
    }
  };

  const saveStory = async () => {
    setAddNewStories(true);

    if (!selectedFileType && !text) {
      NotificationManager.push({ message: "You must upload either text or file.", type: "error" });
      return;
    }

    const d = {};
    if (fileId) d.file_id = fileId;
    if (text) d.text = text;
    if (Number(dur)) d.duration = Number(dur);

    try {
      await axious(
        "/api/create-story",
        async (res2) => {
          if (res2.success && res2.story) {
            const story = {
              id: res2.story.id,
              text: res2.story.text,
              file_id: res2.story.file_id,
              user_id: res2.story.user_id,
              expires_at: res2.story.expires_at,
              created_at: res2.story.created_at,
              updated_at: res2.story.updated_at,
            };

            setText("");
            setFileId("");
            setSelectedFile("");
            setSelectedFileType("");
            toggleNewStories();

            if (story.id) InsertStories([story]);
          } else {
            NotificationManager.push({ message: res2.message || "Story creation failed.", type: "error" });
          }
        },
        {
          method: "POST",
          token,
          data: d, // ✅ send data properly
          headers: { Accept: "application/json" },
        }
      );
    } catch (e) {
      NotificationManager.push({ message: `Failed. ${e.message}`, type: "error" });
      console.error(e);
    } finally {
      setDisableSave(false);
    }
  };


  const dropdownData = [
    { label: 'Select duration', value: '1' },
    { label: 'One (1) day', value: '1' },
    { label: 'Two (2) day', value: '2' },
    { label: 'Three (3) day', value: '3' },
  ];

  return (
    <BackgroundContainer
      style={[ styles.container ]}

    >
      <Loading running={disableSave} text={`Uploading ${uploadFileRange}%`} />
      <Spacer height={10} />
      <BackgroundContainer style={{ padding: 12, borderBottomWidth: !isLargeScreen && 1, borderColor: "#ddd", display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
        <Textx title style={{ fontSize: 22, flex: 1 }}>
          Stories
        </Textx>
      </BackgroundContainer>
      <BackgroundContainer
        style={styles.storyBody}
      >
        <SectionList
          sections={[
            { title: "You", data: [myStories], horizontal: true }, 
            { title: "Not Viewed", data: otherStories, horizontal: false },
            { title: "Viewed", data: viewedStories, horizontal: false },
          ]}
          keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
          renderItem={({ item, section }) => {
            if (section.title === "You") {
              return (
                <FlatList
                  data={[{id: "addStory"}, ...myStories]}
                  nestedScrollEnabled
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(i, index) => i.id?.toString() ?? index.toString()}
                  renderItem={({ item }) => {
                    if (item.id === "addStory") {
                      return (
                        <Buttons
                          onPress={toggleNewStories}
                          style={{
                            paddingVertical: 0,
                            paddingHorizontal: 0
                          }}
                          type="null"
                        >
                          {
                            userImage ?
                            <ImageBackground
                              source={
                                typeof userImage === 'string'
                                  ? { uri: userImage }
                                  : userImage?.uri
                                  ? { uri: userImage.uri }
                                  : userImage
                              }
                              style={{
                                marginHorizontal: 10,
                                cursor: "pointer", 
                                paddingHorizontal: 35,
                                height: 200,
                                justifyContent: "center",
                                alignItems: "center"
                              }}
                              imageStyle={{
                                opacity: .5,
                                borderRadius: 12
                              }}
                            >
                              { AddStory() }
                            </ImageBackground> :
                            <BackgroundContainer
                              type="primary"
                              style={{
                                marginHorizontal: 10,
                                cursor: "pointer", 
                                paddingHorizontal: 35,
                                height: 200,
                                justifyContent: "center",
                                alignItems: "center",
                                borderRadius: 12
                              }}
                            >
                              { AddStory() }
                            </BackgroundContainer>
                          }
                        </Buttons>
                        
                      ) 
                    }
                    return (
                      <View style={{ marginHorizontal: 10, width: 120, height: 200 }}>
                        <StoryView story={item} />
                      </View> 
                    )
                  }}
                />
              );
            } else {
              return (
                <View style={{ height: 400 }} >
                  <StoryView story={item} />
                </View>
              );
            }
          }}
          renderSectionHeader={({ section: { title } }) => (
            <Textx style={{ fontWeight: "bold", marginVertical: 10 }}>{title}</Textx>
          )}
          contentContainerStyle={{ paddingVertical: 10, flexGrow: 1 }}
          style={{ flex: 1 }}
          ListEmptyComponent={<Textx>No Story</Textx>}
        />
      </BackgroundContainer>

      {addNewStories && (
        <View style={styles.contactsOverlay}>
          <TouchableWithoutFeedback onPress={toggleNewStories}>
            <View style={styles.contactsBackdrop} />
          </TouchableWithoutFeedback>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <TouchableWithoutFeedback 
              onPress={(e) => {
                const isInput = e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA'
                if (!isInput) {
                  Keyboard.dismiss()
                }
              }}
            >
              <Animated.View
                style={[
                  styles.bottomSheet,
                  {
                    transform: [{ translateY: slideYAnim }],
                    backgroundColor: systemColor.secondary,
                    paddingHorizontal: 8
                  },
                ]}
              >               
                <BackgroundContainer
                  style={{
                    flexDirection: 'row',
                    padding: 20,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                  }}
                  type="secondary"
                >
                  <Buttons type="null" onPress={toggleNewStories}>
                    <Textx style={{ fontSize: 18, color: systemColor.error }} title >
                      Cancel
                    </Textx>
                  </Buttons>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Textx title>
                      Add a Story
                    </Textx>
                  </View>
                  <Buttons type="null" onPress={saveStory} haptic disabled={disableSave}>
                    <Textx style={{ fontSize: 18, color: systemColor.success }} title >
                      {
                        disableSave ?
                        "Waiting..." : 
                        "Save"
                      }
                    </Textx>
                  </Buttons>
                </BackgroundContainer>
                <BackgroundContainer
                  style={{
                    flex: 1,
                  }}
                  type="secondary"
                >
                  <Spacer height={10} />
                  <Dropdown
                    style={{
                      height: 50,
                      borderWidth: 1,
                      borderColor: systemColor.infoBorder,
                      borderRadius: 8,
                      backgroundColor: systemColor.secondary,
                      paddingHorizontal: 12,
                      justifyContent: "center",
                    }}
                    containerStyle={{
                      backgroundColor: systemColor.secondary,
                      borderWidth: 1,
                      borderColor: systemColor.infoBorder,
                      borderRadius: 8,
                    }}
                    itemContainerStyle={{
                      backgroundColor: systemColor.secondary,
                    }}
                    itemTextStyle={{
                      color: systemColor.text,
                      fontSize: 16,
                    }}
                    activeColor={systemColor.primary + "20"} // subtle tint of your primary color
                    placeholderStyle={{
                      color: systemColor.text + "99", // faded text for placeholder
                      fontSize: 16,
                    }}
                    selectedTextStyle={{
                      color: systemColor.text,
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                    iconColor={systemColor.text} // ensures dropdown arrow matches your theme
                    data={dropdownData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select framework"
                    value={dur}
                    onChange={(item) => setDur(item.value)}
                  />

                  <Spacer height={10} />
                  <TextInput
                    value={text}
                    onChangeText={(text) => setText(text)}
                    placeholder="Enter story text"
                    placeholderTextColor={systemColor.text}
                    multiline
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      fontSize: 18,
                      color: systemColor.text,
                      backgroundColor: systemColor.secondary,
                      flex: .5,
                      textAlignVertical: "top",
                      outlineStyle: "none",
                      borderWidth: 1,
                      borderColor: systemColor.infoBorder,
                      borderRadius: 8,
                    }}
                  />
                  <Spacer height={10} />
                  <FilePicker
                    type='image'
                    onPick={(files) => {
                      console.log(files);
                      const fileType = String(files?.[0]?.type).split('/')?.[0]
                      const fileSize = files?.[0]?.size

                      if ( (fileType !== 'image') && (fileType !== 'video')) {
                        NotificationManager.push({ message: 'File not allowed', type: 'error' })
                        return
                      }

                      if ((fileType === 'image')) {
                        if ( fileSize > 5 ) {
                          NotificationManager.push({ message: 'Image file must be less than 5MB', type: 'error' })
                          return
                        }
                      }

                      
                      if ((fileType === 'video')) {
                        if (fileSize > 40 ) {
                          NotificationManager.push({ message: 'Video file must be less than 40MB', type: 'error' })
                          return
                        }
                      }

                      

                      setSelectedFile(files[0].uri)
                      setSelectedFileType(fileType)
                      uploadFile(files[0])

                      return
                    }}
                    buttonStyle={{
                      justifyContent: 'center', 
                      alignItems: 'center',
                      height: 250,
                      backgroundColor: systemColor.info, 
                      width: '100%',
                      boxSizing: 'border-box',
                      borderWidth: 1,
                      borderColor: systemColor.infoBorder,
                      borderRadius: 8,
                    }}
                  > 
                    {
                      !selectedFileType ?
                      <Textx style={{ textAlign: 'center' }}>
                        <Ionicons name="camera" size={40} color={systemColor.text} />
                      </Textx> : 
                      selectedFileType === "image" ?
                      <Image
                        source={{ uri: selectedFile }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode={"cover"}
                      /> : 
                      selectedFileType === "video" ?
                      <Video
                        source={{ uri: selectedFile }}
                        style={{ width: '100%', height: '100%'}}
                        resizeMode={"cover"}
                        shouldPlay={false}
                      /> :
                      null
                    }
                  </FilePicker>
                  {
                    (selectedFileType || selectedFile) && (
                      <View style={{ alignItems: 'center' }} >
                        <Spacer height={8} />
                        <Buttons type="error" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8 }} onPress={() => {
                          setSelectedFile('')
                          setSelectedFileType('')
                          setFileId('')
                        }}>
                          <Textx>
                            <Ionicons name="trash" size={20} color={systemColor.text} />
                          </Textx>
                          <Textx>
                            {" "}
                            Delete
                          </Textx>
                        </Buttons>
                      </View>
                    )
                  }
                </BackgroundContainer>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
          
        </View>
      )}
    </BackgroundContainer>
  );
};

export default StoriesIndex;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  storyBody: {
    flex: 1,
    padding: 12
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, //android shadow
    shadowColor: '#000', //ios shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0
  },
  addConBut: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, //android shadow
    shadowColor: '#000', //ios shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0
  },
  contactsOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  contactsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  bottomSheet: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1001,
    display: 'flex'
  },
  contactsTitle: {
    fontSize: 22,
    marginBottom: 10,
    fontWeight: 'bold',
  },
});
