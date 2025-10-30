import { FlatList, Keyboard, Platform, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRoute } from "@react-navigation/native"
import React, { useCallback, useContext, useEffect, useState } from 'react'
import BackgroundContainer from '../../../components/public/BackgroundContainer';
import Textx from '../../../components/public/Textx';
import { AuthContext } from '../../../contexts/AuthContext';
import { useChatDb } from '../../../components/public/hooks/useChatDb';
import Buttons from '../../../components/public/Buttons';
import { Ionicons } from '@expo/vector-icons';
import Spacer from '../../../components/public/Spacer';
import TextxInput from '../../../components/public/TextxInput';
import { useSystemColors } from '../../../constants/useSystemColors';
import { TextInput } from 'react-native-gesture-handler';
import { KeyboardAvoidingView, TouchableWithoutFeedback } from 'react-native';
import { NotificationManager } from '../../../components/public/NotificationManager';
import dbEvents from '../../../components/public/hooks/dbEvents';
import ChatView from '../../../components/messages/ChatView';
import Loading from '../../../components/public/Loading';

const Chat = () => {
  const [chatType, setChatType] = useState("none");
  const [conversation, setConversation] = useState(null);
  const [chats, setChats] = useState([])
  const [participants, setParticipants] = useState([])
  const [loadingConversation, setLoadingConversation] = useState(true); 
  const [inputMsg, setInputMsg] = useState('')
  const [covnName, setCovnName] = useState('')

  const { id, user2id } = useLocalSearchParams();
  const { isAuthenticated, wait, token, userid } = useContext(AuthContext);
  const { isReady, loading, getContact, createMessage, getMessages } = useChatDb();
  const route = useRouter()
  const system = useSystemColors()

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800;

  const sndMsg = () => {    
    if (id !== "new") {
      createMessage(conversation.id, user2id, token, userid, inputMsg, 'text', (res) => console.log(res))
    } else {
      createMessage(null, user2id, token, userid, inputMsg, 'text', (res) => {
        if (!res.conversation_id) {
          return NotificationManager.push({ message: 'an error occured sending message', type: 'error' })
        }
        route.replace('/messages/'+res.conversation_id)
      })
    }

    setInputMsg('')
  }

  const getConversationName = useCallback((conversation) => {
    if (conversation.name) {
      setCovnName( conversation.name)
    } else {
      if (conversation.type === "group") {
        const allPart = conversation.participants.reverse().map((p) => {
          return p?.user_id !== userid ? p?.contact?.name ? p.contact.name : p?.email : "me"
        }).join(', ')
        setCovnName( allPart || "No group name yet")
      } else {
        const user2 = conversation.participants.find((p) => p.user_id != userid)
        if (user2) {
          if (user2?.contact?.name) {
            setCovnName( user2.contact.name)
          } else {
            setCovnName( user2?.email)
          }
        } else {
          const me = conversation?.participants[0]
          if (me?.contact?.name) {
            setCovnName( me.contact.name+", me" || "me")
          } else {
            setCovnName( me?.email+", me" || me)
          }
        }
      }
    }
  }, [conversation])


  const putChat = (data) => {
    setChats(data);
  }

  const fetchConversation = useCallback(async () => {

    // console.log("conversation id",id);
    if (id === "new" && user2id) {
      setChatType("user");

      getContact(user2id, (contact) => {
        setConversation(contact);
        getConversationName(contact)
        
        setLoadingConversation(false);
      });
    } else {
      // setLoadingConversation(false);
      getMessages(id, userid, async (res) => {

        if (res.conversation && res.conversation.type) {
          

          const conv = res.conversation

          

          setConversation(conv)
          getConversationName(conv)

          if (conv.type == "single") {
            setChatType('user')
          } else {
            setChatType('group')
          }
        }

        if (res.chats && res.chats.length>0) {
          putChat(res.chats)
        }

        if (res.conversations_participants && res.conversations_participants.length>0) {
          setParticipants(res.conversations_participants)
        }
        setLoadingConversation(false)

      })
    }
  }, [id, user2id, userid])


  useEffect(() => {
    if (!isReady || loading || wait) return;

    fetchConversation();
  }, [isReady, loading, wait, fetchConversation]);

  useEffect(() => {
    if (!loadingConversation) {
      if (!wait && isAuthenticated && !userid) {
        route.push('/messages/')
      }
      if (!conversation && chatType === "none") {
        route.push('/messages/')
      }
    }
  }, [conversation, loadingConversation, wait, isAuthenticated, userid])

  useEffect(() => {
    const chatListener = () => {
      fetchConversation()
    }

    dbEvents.on('conversations_participants-changed', chatListener);
    dbEvents.on('chats-changed', chatListener);
    dbEvents.on('conversations-changed', chatListener)

    return () => {
      dbEvents.off('conversations_participants-changed', chatListener);
      dbEvents.off('chats-changed', chatListener);
      dbEvents.off('conversations-changed', chatListener)
    }

  }, [isReady, fetchConversation])


  useEffect(() => {
    console.log("line 109 > conversation", conversation);

    console.log("line 111 > chats", chats);

    console.log("line 113 > participants", participants);
    
  }, [conversation, chats, participants])

  if (loadingConversation) {
    return (
      <BackgroundContainer style={[styles.container]}>
        <Loading running={true} text='Loading Chat...' />
      </BackgroundContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // 👈 add 'height' for Android
      keyboardVerticalOffset={10}
    >
      <BackgroundContainer style={[styles.container]}>
          <BackgroundContainer style={[styles.header, { padding: 16 }]}>
            {
              !isLargeScreen && (
                <>
                  <Buttons type="null" onPress={
                    () => {
                      if (route.canGoBack?.()) {
                        route.back();
                      } else {
                        route.replace("/messages");
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
            <Textx
              title
              style={{ flex: 1, fontSize: 18, textTransform: "capitalize" }}
            >
              {
                covnName
              }
            </Textx>
          </BackgroundContainer>
          <FlatList
            data={chats}
            inverted
            style={{ flex: 1, padding: 8 }}
            contentContainerStyle={{ paddingVertical: 10 }}
            keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
            renderItem={({ item }) => <ChatView chat={item} />}
            ListEmptyComponent={<Textx>No Chat Yet. Please send a message</Textx>}
            keyboardShouldPersistTaps="handled"
          />
          <BackgroundContainer style={[styles.footer]}>
            <BackgroundContainer type='secondary' style={{ flex: 1, display: 'flex', flexDirection: 'row', borderRadius: 25 }}>
              <TextInput 
                placeholder='type message...'
                placeholderTextColor={system.text}
                onChangeText={(text) => setInputMsg(text)}
                value={ inputMsg }
                style={{
                  flex: 1,
                  fontSize: 20,
                  padding: 16,
                  outlineStyle: 'none',
                  color: system.text
                }}
              />
            </BackgroundContainer>
            <Spacer width={5} />
            <View style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <Buttons
                onPress={sndMsg}
                style={{
                  flex: 1, 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  borderRadius: 50
                }}
              >
                <Ionicons name='send' size={25} color={system.text} />
              </Buttons>
            </View>
          </BackgroundContainer>
        </BackgroundContainer>  
    </KeyboardAvoidingView>
  );
};


export default Chat

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
  body: {
    flex: 1,
    display: 'flex',
    padding: 6,
  },
  footer: {
    display: 'flex',
    padding: 6,
    flexDirection: 'row'
  }
})