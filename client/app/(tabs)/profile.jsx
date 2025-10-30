import { View, Text, StyleSheet, Dimensions, Platform, Keyboard, TouchableWithoutFeedback, Image, useWindowDimensions } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import BackgroundContainer from '../../components/public/BackgroundContainer'
import Buttons from '../../components/public/Buttons'
import { useSystemColors } from '../../constants/useSystemColors'
import { useRouter } from 'expo-router'
import { AuthContext } from '../../contexts/AuthContext';
import Textx from '../../components/public/Textx'
import Spacer from '../../components/public/Spacer'
import TextxInput from '../../components/public/TextxInput'
import { NotificationManager } from '../../components/public/NotificationManager'
import axious from '../../components/public/utils/axious'
import { KeyboardAvoidingView } from 'react-native'
import FilePicker from '../../components/public/FilePicker'
import OptionPopUp from '../../components/public/OptionPopUp'
import { useChatDb } from '../../components/public/hooks/useChatDb'
import * as FileSystem from 'expo-file-system';
import FullScreenFileViewer from '../../components/public/FullScreenFileViewer'

const Profile = ({  }) => {
  const [editP, setEditP] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visibility, setVisibility] = useState(false)
  const [fScreen, setFScreen] = useState(false)
  const [uploadingPP, setUploadingPP] = useState(false)
  const [uProgress, setUpProgress] = useState(0)

  const [pP, setPP] = useState(null)


  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userImage, setUserImage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const systemColor = useSystemColors()
  const router = useRouter()

  const { width, height } = useWindowDimensions()


  const { isAuthenticated, wait, token, name, email, removeUser, userid } = useContext(AuthContext);

  const { isReady, getUserProfilePicture, removePP } = useChatDb()


  const changePassword = async () => {
    setLoading(true)
    try {
      await axious('/api/change-password', async(res) => {

        if (res.success) {
          NotificationManager.push({ message: 'Password changed', type: "success" })
          setEditP(false)
          setCurrentPassword('')
          setPassword('')
          setPasswordConfirm('')
        } else {
          NotificationManager.push({ message: res.message, type: "error" })
        }
      }, {
        method: 'POST',
        token,
        data: {
          current_password: currentPassword,
          new_password: password,
          new_password_confirmation: passwordConfirm
        },
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `failed. ${e.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const optionList = [
    {
      name: userImage && 
        <Textx style={{ textAlign: 'center' }}>
          View Image
        </Textx>,
      onPress: () => {
        setFScreen(true)
        setVisibility(false)
      }, 
    },
    {
      name: 
        <FilePicker
          type='image'
          onPick={(files) => {
            setVisibility(false)
            console.log(files);
            setUserImage(files[0].uri)
            uploadFile(files[0])
          }}
        > 
          <Textx style={{ textAlign: 'center' }}>
            {
              !userImage ?
              "Add Profile Picture" :
              "Change Profile Picture"
            }
          </Textx>
        </FilePicker>,
      onPress: null
    },
    {
      name: userImage && 
        <Textx style={{ textAlign: 'center' }}>
          Delete Image
        </Textx>,
      onPress: () => {
        setFScreen(false)
        setVisibility(false)
        deleteP()
      }, 
    },
  ]

  const deleteP = async() => {
    try {
      await axious('/api/delete-pp', async (res) => {
        if (res?.success) {
          removePP(userid, (res) => {
            if (res) {
              setUserImage('')
            } else {
              setUserImage('')

            }
          })
        } 
      }, {
        method: 'POST',
        token,
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (e) {
      NotificationManager.push({
        message: `Failed. ${e.message}`,
        type: 'error',
      });
    }
  }

  const uploadFile = async (file) => {
    setUploadingPP(true);

    try {
      const formData = new FormData();

      let fileUri = file.uri;
      let fileName = file.name || 'upload';
      let mimeType = file.type || 'image/jpeg';

      console.log(mimeType);
      
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

      // Append correctly based on platform
      if (Platform.OS === 'web') {
        formData.append('file', blob, fileName); // ✅ Web needs Blob
      } else {
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: mimeType,
        }); // ✅ Native needs { uri, name, type }
      }

      formData.append('text', 'p>p+');

      await axious('/api/save-file', async (res) => {
        if (res.success) {
          try {
            await axious('/api/edit-user', async (res2) => {
              console.log(res2);
            }, {
              method: 'POST',
              token,
              data: {
                file_id: res.file.id,
              },
              headers: {
                Accept: 'application/json',
              },
            });
          } catch (e) {
            NotificationManager.push({
              message: `Failed. ${e.message}`,
              type: 'error',
            });
          }
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
          const progress = Math.round((p.loaded / p.total) * 100);
          setUpProgress(progress);
        },
      });
    } catch (e) {
      NotificationManager.push({
        message: `failed. ${e.message}`,
        type: 'error',
      });
    } finally {
      setUploadingPP(false);
    }
  };

  useEffect(() => {
    if (!wait) {
      if (isAuthenticated && name) {
        setUserName(name);
      } else {
        setUserName('');
      }
      if (isAuthenticated && email) {
        setUserEmail(email)
      }
    }
  }, [isAuthenticated, wait, name]);

  useEffect(() => {
    (async () => {  
      if (isReady && !wait && isAuthenticated) {
        getUserProfilePicture(userid, token, (file) => {
          if (file?.type === "image") {
            setUserImage(file.url)
          }          
        })
        
      }
    })();
    
  }, [isReady, wait, isAuthenticated, userid, token])

  return (
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
        <BackgroundContainer
          style={styles.container}
        >
          {
            !wait && (
              isAuthenticated && userName ?
              (
                <>
                  {
                    visibility && (
                      <OptionPopUp
                        options={optionList}
                        visible={visibility}
                        onClose={() => setVisibility(false)}
                      />
                    )
                  }

                  <FullScreenFileViewer
                    fileType={'image'}
                    fileUrl={userImage}
                    visible={fScreen}
                    onClose={() => setFScreen(false)}
                  />
                  {
                    !editP && (
                      <>
                        <Buttons onPress={() => {
                          setVisibility(true)
                        }} style={[
                          styles.headerProfileIcon,
                          {
                            height: 150,
                            width: 150,
                            borderRadius: 75,
                          }
                        ]} >
                          {userImage ? (
                            <Image
                              source={
                                typeof userImage === 'string'
                                  ? { uri: userImage }
                                  : userImage?.uri
                                  ? { uri: userImage.uri }
                                  : userImage
                              }
                              style={{ width: '100%', height: '100%', borderRadius: 75 }}
                              resizeMode={"cover"}
                            />
                          ) : (
                            <Textx
                              style={{
                                color: systemColor.primaryText,
                                fontSize: 100,
                                fontWeight: 'bold',
                              }}
                            >
                              {userName[0]}
                            </Textx>
                          )}
                        </Buttons>
                        
                        <Spacer />
                        <Textx style={{ fontSize: 20 }}>
                          {userName?.toUpperCase()}
                        </Textx>
                        <Spacer height={6} />
                        <Textx style={{ fontSize: 20 }}>
                          {userEmail?.toLowerCase()}
                        </Textx>
                        <Spacer height={30} />
                        <Buttons style={ [styles.proceedButton, { width: width - 40, maxWidth: 500 }] } onPress = {() => setEditP(true)} >
                          <Textx primary style={{ textAlign: "center", fontWeight: "bold", fontSize: 15 }}>
                            Change password
                          </Textx>
                        </Buttons>
                        <Spacer height={18} />
                        <Buttons style={ [styles.proceedButton, { width: width - 40, maxWidth: 500 }] } onPress = {() => removeUser()} type='secondary' >
                          <Textx style={{ textAlign: "center", fontWeight: "bold", fontSize: 15 }}>
                            Logout
                          </Textx>
                        </Buttons>
                      </>
                    )
                  }
                  {
                    editP && (
                      <BackgroundContainer
                        style={{
                          width: 300
                        }}
                      >
                        <Spacer />
                        <TextxInput
                          label="Current Password"
                          labelStyle={{
                            fontSize: 18
                          }}
                          type="password"
                          placeholderTextColor={systemColor.text}
                          value={currentPassword}
                          onChangeText={(text) => setCurrentPassword(text)}
                          password
                        />
                        <Spacer height={10} />
                        <TextxInput
                          label="New Password"
                          labelStyle={{
                            fontSize: 18
                          }}
                          type="password"
                          placeholderTextColor={systemColor.text}
                          value={password}
                          onChangeText={(text) => setPassword(text)}
                          password
                        />
                        <Spacer height={10} />
                        <TextxInput
                          label="Repeat New Password"
                          labelStyle={{
                            fontSize: 18
                          }}
                          type="password"
                          placeholderTextColor={systemColor.text}
                          value={passwordConfirm}
                          onChangeText={(text) => setPasswordConfirm(text)}
                          password
                        />
                        <Spacer height={20} />
                        <BackgroundContainer
                          style={{
                            display: 'flex',
                            flexDirection: 'row'
                          }}
                        >
                          <Buttons
                            style={{
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderColor: systemColor.infoBorder,
                              borderWidth: 1,
                              borderRadius: 40,
                              flex: 1
                            }}
                            disabled={loading}
                            type="error"
                            onPress={() => setEditP(false)}
                          >
                            <Textx
                              style={{
                                fontSize: 18,
                                padding: 5

                              }}

                              primary
                            >
                              Cancel
                            </Textx>
                          </Buttons>
                          <Spacer width={10} />
                          <Buttons
                            style={{
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderColor: systemColor.infoBorder,
                              borderWidth: 1,
                              borderRadius: 40,
                              flex: 1
                            }}
                            type="info"
                            disabled={loading}
                            onPress={changePassword}
                          >
                            <Textx
                              style={{
                                fontSize: 18,
                                padding: 5

                              }}

                              info
                            >
                              Save
                            </Textx>
                          </Buttons>
                        </BackgroundContainer>
                      </BackgroundContainer>
                    )
                  }
                </>
              ) : 
              (
                <>
                  <Buttons style={styles.headerProfileIcon}>
                    <Ionicons name="person" size={100} color={systemColor.primaryText} />
                  </Buttons>
                  <Spacer />
                  <Textx style={{ fontSize: 20 }}>
                    Don't have an account?
                  </Textx>
                  <Spacer height={48} />
                  <Buttons style={ [styles.proceedButton, { width: width - 40, maxWidth: 500 }] } onPress = {() => router.push("/signup")} >
                    <Textx primary style={{ textAlign: "center", fontWeight: "bold", fontSize: 15 }}>
                      Proceed To Sign Up
                    </Textx>
                  </Buttons>
                  <Spacer height={18} />
                  <BackgroundContainer style={styles.alreadyContainer}>
                    <Textx style={{ fontWeight: "bold", fontSize: 16 }}>
                      Already have an account?
                    </Textx>
                    <Buttons
                      type='background'
                      style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: 5 }}
                      onPress = {() => router.push("/signin")}
                    >
                      <Textx
                        style={{ fontSize: 16 }}
                        info
                      >
                        Log in
                      </Textx>
                    </Buttons>
                  </BackgroundContainer>
                </>
              )
            )
          }
        </BackgroundContainer>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

export default Profile


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerProfileIcon: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    top: 30,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0
  },
  proceedButton: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 0,
    paddingRight: 0,
    borderRadius: 25
  },
  alreadyContainer: {
    display: "flex",
    flexDirection: "row",
  },
})
