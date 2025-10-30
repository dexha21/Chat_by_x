import { ImageBackground, StyleSheet, Text, View, Image } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import BackgroundContainer from '../public/BackgroundContainer'
import Textx from '../public/Textx'
import { AuthContext } from '../../contexts/AuthContext'
import { useSystemColors } from '../../constants/useSystemColors'
import { useChatDb } from '../public/hooks/useChatDb'
import Buttons from '../public/Buttons'
import Spacer from '../public/Spacer'
import ViewTime from '../public/ViewTime'
import { Ionicons } from '@expo/vector-icons'
import { NotificationManager } from '../public/NotificationManager'
import axious from '../public/utils/axious'
import { Video } from 'expo-av'
import { useRouter } from 'expo-router'

const StoryView = ({ story }) => {
  const [userImage, setUserImage] = useState("")
  const [file, setFileURL] = useState("")
  const [fileType, setFileType] = useState("")

  const systemColor = useSystemColors()

  const { wait, isAuthenticated, userid, token } = useContext(AuthContext)
  const { isReady, deleteStory, getUserProfilePicture, getMedia } = useChatDb()

  const route = useRouter()

  useEffect(() => {
    const file__ = () => {
      
      if (isReady && !wait && isAuthenticated && token) {
        if (story?.file_id) {
          if (!story?.file_url || !story?.file_type) {

            getMedia(story.file_id, token, (file) => {
              setFileURL(file.url)
              setFileType(file.type)
            })
            return
          }
          setFileURL(story.file_url)
          setFileType(story.file_type)
          // console.log(story.file_url, story.file_type);
          
        }
      }
    }

    file__()
  }, [isReady, wait, isAuthenticated, token, story])

  useEffect(() => {
    if (isReady && !wait && isAuthenticated && token && userid) {
      getUserProfilePicture(story?.user_id, token, (file) => {
        if (file?.type === "image") {
          setUserImage(file.url)
        }          
      })
    }
  }, [isReady, wait, isAuthenticated, token, userid, story?.user_id])

  const jsTime = new Date(story?.created_at) || 0

  const returnFile = () => {
    // const file = ''

    if (!file) {
      return (
        <Textx>
          <Ionicons name='arrow-down-circle' size={30} />
        </Textx>
      )
    }
    if (String(fileType).toLowerCase() === "image") {
      return (
        <Image 
          source={{ uri: file }}
          style={{ width: '100%', height: '100%', borderRadius: 12}}
          resizeMode={"cover"}
        />
      )
    }

    if (String(fileType).toLowerCase() === "video") {
      return (
        <Video 
          source={{ uri: file }}
          style={{ width: '100%', height: '100%', borderRadius: 12}}
          resizeMode={"cover"}
          //useNativeControls
          shouldPlay={false}
        />
      )
    }

    return (
      <Textx>
        Invalid story file
      </Textx>
    )
  }

  const deleteAStory = async () => {
    NotificationManager.push('Deleting story...')
    try {

      await axious('/api/delete-story', async(res) => {
        NotificationManager.clear()
        if (res.success && await deleteStory(story?.id)) {
          NotificationManager.push({ message: 'Story deleted!', type: 'success' })
        } else {
          NotificationManager.push({ message: 'Failed to delete story', type: 'error' })
        }
      }, {
        method: 'POST',
        data: {
          id: story?.id
        },
        token,
        headers: {
          'Accept' : 'application/json' 
        }
      })
    } catch (e) {
      NotificationManager.push({ message: `Failed to delete story. ${e.message}`, type: "error" })
    }
  }

  return (
    <Buttons
      style={[
        styles.container,
        {
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 12,
          paddingHorizontal: story?.user_id != userid ? 15 : 0,
          paddingVertical: story?.user_id != userid ? 6 : 0,
          marginVertical: story?.user_id != userid ? 10 : 0,
          position: 'relative',
          boxSizing: 'border-box'
        }
      ]}
      onPress={() => {
        route.push(`/stories/${story.id}`)
      }}
      type='secondary'
    >
      { story?.user_id != userid && <Spacer height={15} /> }
      { story?.user_id == userid && <Buttons onPress={ () => NotificationManager.push('Press and hold to delete')} hapticLongPress onLongPress={() => deleteAStory()
      } delayLongPress={1000} style={[ { position: 'absolute', top: 12, right: 12, borderRadius: 28, justifyContent: 'center', alignItems: 'center', zIndex: 9999999, paddingVertical: 8, paddingHorizontal: 8 } ]} type='error'>
        <Textx>
          <Ionicons name='trash' color={systemColor.primaryText} size={20} />
        </Textx>
      </Buttons> }
      {
        story?.user_id != userid && (
          <>
            <View style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}>
              <Buttons style={[
                styles.headerProfileIcon,
                {
                  height: 50,
                  width: 50,
                  borderRadius: 50,
                }
              ]} >
                {userImage ? (
                  <Image
                    source={{ uri: userImage }}
                    style={{ width: '100%', height: '100%', borderRadius: 75 }}
                    resizeMode={"cover"}
                  />
                ) : (
                  <Textx
                    style={{
                      color: systemColor.primaryText,
                      fontSize: 20,
                      fontWeight: 'bold',
                    }}
                  >
                    {story?.name[0]}
                  </Textx>
                )}
              </Buttons>
              <Spacer width={10} />
              <View style={{ flex: 1 }}>
                <Textx>
                  { String(story?.name)?.toUpperCase() }
                </Textx>
                <Spacer height={5} />
                <Textx style={{ fontSize: 12 }}>
                  <ViewTime addedDate={jsTime} />
                </Textx>
              </View>
            </View>
            {
              story?.file_id && (
                <>
                  <Spacer height={10} />
                  <View style={{ flexDirection: 'row', width: "100%" }}>
                    <Textx style={{ flex: 1, textAlign: 'left' }}>
                      { story?.text }
                    </Textx>
                  </View>
                </>
              )
            }
            <Spacer height={10} />
          </>
        )
      }
      <BackgroundContainer
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 350,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 12
        }}

        type={ story?.text ? 'primary' : 'secondary' }
      >
        {
          story?.file_id ?
          <>  
            { returnFile() }
          </>:
          <Textx>
            { story?.text }
          </Textx>        
        }
      </BackgroundContainer>
      {story?.user_id != userid && (
        <>
          <Spacer height={15} />
        </>
      )}
    </Buttons>
  )
}

export default StoryView

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerProfileIcon: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
})