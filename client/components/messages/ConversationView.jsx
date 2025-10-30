import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Pressable, useWindowDimensions, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2, Bookmark, BookMarked } from 'lucide-react-native';
import Buttons from '../public/Buttons';
import Textx from '../public/Textx';
import { adjustColor } from '../public/utils/adjustedColor';
import { useSystemColors } from '../../constants/useSystemColors';
import { Ionicons } from '@expo/vector-icons';
import { useChatDb } from '../public/hooks/useChatDb';
import { AuthContext } from '../../contexts/AuthContext';
import { NotificationManager } from '../public/NotificationManager';
import { useRouter } from 'expo-router';
import BackgroundContainer from '../public/BackgroundContainer';
import Spacer from '../public/Spacer';
import TextxInput from '../public/TextxInput';

const ConversationView = ({ conversation }) => {
  const [isSwiping, setIsSwiping] = useState(false);
  const [eCont, setECont] = useState(false)
  const [cName, setCName] = useState('')
  const [user2Image, setUser2Image] = useState('')

  const systemColor = useSystemColors();
  const swipeRef = useRef(null);
  const { width } = useWindowDimensions()

  const { isAuthenticated, wait, token, userid } = useContext(AuthContext)
  const { isReady, loading, getUserProfilePicture, getMedia } = useChatDb()

  const route = useRouter()

  const del = () => {
    if (!isAuthenticated || wait || !isReady) return NotificationManager.push('an error occured') 

    
    if (loading) return NotificationManager.push('please try again later')
    

    // deleteContact(contact.id, token )
  }

  // console.log(conversation);
  
  useEffect(() => {
    console.log(conversation);
    
  }, [])


  // Right-side swipe actions
  const renderRightActions = () => (
    <View style={styles.actions}>

      <TouchableOpacity
        style={[styles.action, { backgroundColor: 'red' }]}
        onPress={() => {
          del()
          swipeRef.current?.close();
        }}
      >
        <Ionicons name="trash" style={{ color: systemColor.primaryText }} size={20} />
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    const getConversationName = () => {
      if (conversation.name) {
        return conversation.name
      } else {
        if (conversation.type === "group") {
          const allPart = conversation.participants.reverse().map((p) => {
            return p?.user_id !== userid ? p?.contact?.name ? p.contact.name : p?.email : "me"
          }).join(', ')
          return allPart || "No group name yet"
        } else {
          const user2 = conversation.participants.find((p) => p.user_id != userid)
          if (user2) {
            if (user2?.contact?.name) {
              return user2.contact.name
            } else {
              return user2?.email
            }
          } else {
            const me = conversation?.participants[0]
            if (me?.contact?.name) {
              return me.contact.name+", me" || "me"
            } else {
              return me?.email+", me" || me
            }
          }
        }
      }
    }

    const cn = getConversationName()

    if (cn) {
      setCName(cn)
    }

  }, [conversation, userid])

  useEffect(() => {
    (async () => {  
      if (isReady && !wait && isAuthenticated) {
        if(conversation?.file_id) {
          getMedia(conversation.file_id, token, (file) => {
            console.log(file);
            
          })
        } else {
          if (conversation.type === "group") {

          } else {
            const user2 = conversation?.participants?.find((p) => p.user_id != userid)
            if (user2) {
              if (user2?.user_id) {
                getUserProfilePicture(user2?.user_id, token, (file) => {
                  if (file?.type === "image") {
                    setUser2Image(file.url)
                  } else {
                    setUser2Image('')
                  }       
                })
              } else {
                setUser2Image('')
              }
            } else {
              const me = conversation?.participants[0]
              if (me?.user_id) {
                getUserProfilePicture(me?.user_id, token, (file) => {
                  if (file?.type === "image") {
                    setUser2Image(file.url)
                  } else {
                    setUser2Image('')
                  }       
                })
              } else {
                setUser2Image('')
              }
            }
            
          }
        }
        
        
      }
    })();
    
  }, [isReady, wait, isAuthenticated, userid, token])

  return (
    <>
      
      {
        !eCont && (
          <Swipeable 
            ref={swipeRef}
            renderRightActions={renderRightActions} 
            overshootRight={false}
            onSwipeableWillOpen={() => setIsSwiping(true)}
            onSwipeableWillClose={() => setIsSwiping(false)}
            containerStyle={{
              position: 'relative'
            }}
          >
            <View
              style={[
                styles.container
              ]}
            >
              <Pressable
                onPress={() => {
                  if (isSwiping) return;

                  route.push("/messages/"+conversation.id)

                }}
                type="null"

                style={{
                  flex: 1,
                  padding: 0,
                  paddingHorizontal: 0,
                  paddingVertical: 0,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                
              >
                <BackgroundContainer type='primary' style={{ width: 40, height: 40, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }} >
                  {
                    user2Image ?
                    <Image
                      source={
                        typeof user2Image === 'string'
                          ? { uri: user2Image }
                          : user2Image?.uri
                          ? { uri: user2Image.uri }
                          : user2Image
                      }
                      style={{ width: '100%', height: '100%', borderRadius: 75 }}
                      resizeMode={"cover"}
                    />
                    :
                    <Textx style={{ fontSize: 25 }}>
                      { cName[0] ? String(cName[0]).toUpperCase() : "" }
                    </Textx>
                  }
                </BackgroundContainer>

                <View style={styles.content}>
                  <Textx style={styles.title}>{ cName || "loading..." }</Textx>
                  <Textx style={{ fontSize: 18 }}>{ conversation?.last_chat && conversation.last_chat?.message || "loading..." }</Textx>
                </View>

                <Buttons
                  onPress={() => {
                    swipeRef.current?.openRight(); 
                  }}
                  type='null'
                  style={[
                    {
                      padding: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }
                  ]}
                >
                  <Textx style={{ fontSize: 22 }}>⋮</Textx>
                </Buttons>
              </Pressable>
            </View>
          </Swipeable>
        )
      }
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 3,
  },
  content: {
    flex: 1,
    marginVertical: 12,
    marginLeft: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  body: {
    marginTop: 12,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120
    
  },
  action: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: "50%",
    marginHorizontal: 5
  },
  actionText: {
    color: 'white',
    marginTop: 4,
    fontWeight: '600',
  }
});

export default ConversationView;
