import React, { useContext, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
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

const ContactView = ({ contact, editConObj }) => {
  const [isSwiping, setIsSwiping] = useState(false);
  const [eCont, setECont] = useState(false)

  const systemColor = useSystemColors();
  const swipeRef = useRef(null);
  const { width } = useWindowDimensions()

  const { isAuthenticated, wait, token, userid } = useContext(AuthContext)
  const { isReady, loading, deleteContact, editContact, conversationExist } = useChatDb()

  const route = useRouter()

  const del = () => {
    if (!isAuthenticated || wait || !isReady) return NotificationManager.push('an error occured') 

    
    if (loading) return NotificationManager.push('please try again later')
    

    deleteContact(contact.id, token )
  }

  const edit = async () => {
    if (!isAuthenticated || wait || !isReady) return NotificationManager.push('an error occured') 

    
    if (loading) return NotificationManager.push('please try again later')

    
    await editContact(token, contact.name, contact.email, contact.id)

    setECont(false)
  }

  const sendInvite = () => {
    console.log('sending invite');
    
  }

  const convExist = () => {

    conversationExist(userid, contact.recipient_id, (c) => {
      // console.log(c, contact.recipient_id);
      if (!c) {
        
        route.push({
          pathname: '/messages/new',
          params: {
            'user2id': contact.recipient_id
          }
        })
      } else {
        route.push({
          pathname: '/messages/'+c
        })
      }
    })

    
  }


  // Right-side swipe actions
  const renderRightActions = () => (
    <View style={styles.actions}>
      {/* Bookmark */}
      <TouchableOpacity
        style={[styles.action, { backgroundColor: 'orange' }]}
        onPress={() => {
          setECont(true)
          swipeRef.current?.close();
        }}
      >
        <Ionicons name="pencil" style={{ color: systemColor.primaryText }} size={20} />
      </TouchableOpacity>

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

                  if (contact.recipient_id) {
                    convExist()
                  } else {
                    sendInvite()
                  }

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
                  <Textx style={{ fontSize: 25 }}>
                    { String(contact?.name[0]).toUpperCase() }
                  </Textx>
                </BackgroundContainer>

                <View style={styles.content}>
                  <Textx style={styles.title}>{contact.name}</Textx>

                  <Textx style={styles.body}>
                    {
                      contact.email
                    }
                  </Textx>
                </View>
                {
                  !contact.recipient_id && (
                    <View style={{ backgroundColor: systemColor.secondary, padding: 8, borderRadius: 14 }}>
                      <Textx>
                        invite
                      </Textx>
                    </View>
                  )
                }
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

      {
        eCont && (
          <BackgroundContainer
            style={{
              borderColor: systemColor.infoBorder,
              borderWidth: 1,
              padding: 15,
              borderRadius: 12
            }}
          >
            <TextxInput
              type="type"
              placeholder="Name"
              placeholderTextColor={systemColor.text}
              value={contact.name}
              onChangeText={(text) => editConObj('name',text)}
            />
            <Spacer height={10} />
            <TextxInput
              type="email"
              placeholder="Email"
              placeholderTextColor={systemColor.text}
              value={contact.email}
              onChangeText={(text) => editConObj('email',text)}
            />
            <Spacer />
            <View style={{ flexDirection: 'row' }}>
              <Buttons
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: systemColor.infoBorder,
                  borderWidth: 1,
                  borderRadius: 40,
                  flex: 1
                }}
                type="error"
                onPress={ () => setECont(false) }
              >
                <Textx
                  style={{
                    fontSize: 22,
                    padding: 5

                  }}

                  primaryText
                >
                  Cancel
                </Textx>
              </Buttons>
              <Spacer width='20' />
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

                onPress={edit}
              >
                <Textx
                  style={{
                    fontSize: 22,
                    padding: 5

                  }}

                  info
                >
                  Save
                </Textx>
              </Buttons>
            </View>
          </BackgroundContainer>
        )
      }
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 3,
  },
  content: {
    flex: 1,
    marginVertical: 22,
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

export default ContactView;
