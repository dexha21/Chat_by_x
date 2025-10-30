import { Image, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from 'react'
import BackgroundContainer from '../../../components/public/BackgroundContainer';
import Textx from '../../../components/public/Textx';
import { AuthContext } from '../../../contexts/AuthContext';
import { useChatDb } from '../../../components/public/hooks/useChatDb';
import { useSystemColors } from '../../../constants/useSystemColors';
import { Ionicons } from '@expo/vector-icons';
import Buttons from '../../../components/public/Buttons';
import Spacer from '../../../components/public/Spacer';
import ViewTime from '../../../components/public/ViewTime';
import { Video } from 'expo-av';

const ViewStories = () => {
  const [story, setStory] = useState({})
  const [userImage, setUserImage] = useState("")
  const [file, setFileURL] = useState("")
  const [fileType, setFileType] = useState("")
  const [jsTime, setJsTime] = useState(0)
  const [hideFooter, setHideFooter] = useState(false)

  const { id } = useLocalSearchParams();
  const { isAuthenticated, wait, token, userid, email } = useContext(AuthContext);
  const { isReady, loading, getAStory, getUserProfilePicture, getMedia, storeViewedStories } = useChatDb();
  const route = useRouter()
  const systemColor = useSystemColors()

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800;

  const getStory = useCallback(async () => {
    if (!id) {
      return null
    }

    

    const story = await getAStory(Number(id))

    if (story) {
      setStory(story)
      storeViewedStories(story?.id)
      setJsTime(new Date(story?.created_at || 0) || 0)
      
      getUserProfilePicture(story?.user_id, token, (file) => {
        if (file?.type === "image") {
          setUserImage(file.url)
        }          
      })
      if (story?.file_id) {
        if (!story?.file_url || !story?.file_type) {

          getMedia(story.file_id, token, (file) => {
            setFileURL(file.url)
            setFileType(file.type)
            console.log("getMedia loaded, returned: ", file);
            
          })
          return
        }
        console.log("getMedia was not loaded, existing file: ", story.file_url, story.file_type);
        setFileURL(story.file_url)
        setFileType(story.file_type)
        // console.log(story.file_url, story.file_type);
        
      }
    } else {
      setStory({})
    }
  }, [id, token])

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
          style={{ width: '100%', height: '100%' }}
          resizeMode={"contain"}
        />
      )
    }

    if (String(fileType).toLowerCase() === "video") {
      console.log(file);

      const platform = Platform.OS
      
      if (platform === 'web' ) {
        return (
          <video 
            src={file}
            style={{ width: '100%', height: '100%', objectFit: "contain" }}
            controls
            autoFocus
            autoPlay
            // resizeMode={"contain"}
            // useNativeControls
            // shouldPlay={true}
            // focusable
          />
        )
      }
      return (
        <Video 
          source={{ uri: file }}
          style={{ width: '100%', height: '100%', objectFit: "contain" }}
          resizeMode={"contain"}
          useNativeControls
          shouldPlay={true}
          focusable
        />
      )
    }

    return (
      <Textx>
        Invalid story file
      </Textx>
    )
  }

  useEffect(() => {
    if (id && isReady && !wait && isAuthenticated && token && userid) {
      getStory()      
    }
  }, [id, isReady, getStory, wait, isAuthenticated, token, userid])


  return (
    <BackgroundContainer
      style={[
        styles.container,
        {

        }
      ]}
    >
      <BackgroundContainer style={[styles.header, { padding: 16 }]}>
        {
          !isLargeScreen && (
            <>
              <Buttons type="null" onPress={
                () => {
                  if (route.canGoBack?.()) {
                    route.back();
                  } else {
                    route.replace("/stories");
                  }
                }
              }>
                <Textx>
                  <Ionicons name="chevron-back" size={20} />
                </Textx>
              </Buttons>
          
              <Spacer width={6} />
            </>
          )
        }
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
              {story?.name?.[0] || <Ionicons name='person' size={18} color={systemColor.text} />}
            </Textx>
          )}
        </Buttons>
        <Spacer width={12} />
        <Textx
          title
          style={{ flex: 1, fontSize: 18 }}
        >
          { story?.name && story.name }
          {
            (story?.user_id == userid && !story?.name) &&
            email
          }
          {
            story?.user_id == userid &&
            ' (Me)'
          }
        </Textx>
        <Buttons
          onPress={() => setHideFooter(!hideFooter)}
        >
          {
            !hideFooter ?
            <Textx>
              Hide Text
            </Textx> :
            <Textx>
              Show Text
            </Textx>
          }
        </Buttons>
      </BackgroundContainer>

      <BackgroundContainer
        style={{
          flex: 1,
          alignItems: 'center'
        }}
      >
        {/* Media */}
        <BackgroundContainer
          style={{
            flex: 1,
            width: "100%",
            justifyContent: "center",
            alignItems: "center"
          }}

          type={ story?.text && !story?.file_id ? 'primary' : 'secondary' }
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
        {/* Footer */}
        
        {
          !hideFooter && (
            <BackgroundContainer
              style={[
                styles.footer,
                {

                }
              ]}
            >
              <Textx
                style={{
                  fontSize: 16
                }}
              >
                { story?.file_id && story?.text && story.text }
              </Textx>
              <Spacer height={10} />
              <Textx style={{ fontSize: 12, fontStyle: 'italic' }}>
                <ViewTime addedDate={jsTime} />
              </Textx>
              {/* views here later */}
            </BackgroundContainer>
          )
        }
      </BackgroundContainer>
      
    </BackgroundContainer>
  );
};


export default ViewStories

const styles = StyleSheet.create({
  container : {
    flex: 1
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    padding: 6,
    alignItems: 'center'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.9)'
  },
  headerProfileIcon: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  }
})