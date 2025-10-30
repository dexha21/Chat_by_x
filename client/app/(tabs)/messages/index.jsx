import { Animated, FlatList, Keyboard, Platform, SectionList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
import ContactView from "../../../components/messages/ContactView";
import { useRouter } from "expo-router";
import ConversationView from "../../../components/messages/ConversationView";

const MessagesIndex = () => {
  const [addNewChat, setAddNewChat] = useState(false)
  const [newContact, setNewContact] = useState(false)
  const [conversation, setConversation] = useState([])

  const [xUsers, setXUsers] = useState([])
  const [nonXUsers, setNonXUsers] = useState([])

  const [refreshing, setRefreshing] = useState(false);

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')


  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 800; 
  const slideYAnim = useState(new Animated.Value(300))[0];
  const { isReady, loading, createContact, refreshContacts, getAllContacts, getAllConversations } = useChatDb()
  const { isAuthenticated, wait, token, userid } = useContext(AuthContext)

  const route = useRouter()



  const toggleChat = () => {
    if (addNewChat) {
      Animated.timing(slideYAnim, {
        toValue: 300, // slide down
        duration: 300,
        useNativeDriver: false,
      }).start(() => setAddNewChat(false));
    } else {
      setAddNewChat(true);
      Animated.timing(slideYAnim, {
        toValue: 0, // slide up into view
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };


  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshContacts(); 
    } finally {
      setRefreshing(false);
    }
  }, [refreshContacts]);

  const closeNewContact = () => {
    setNewContact(false)
    setEmail('')
    setName('')
  }

  const saveContact = () => {
    if (!isReady || !isAuthenticated || wait) return;

    if (!name || !email) {
      NotificationManager.push({ message: "All input are required", type: "error" })
    }

    createContact(token, email, name, (contact) => {
      NotificationManager.push({ message: `${contact.name} has been saved to your contacts`, type: 'success' });
      closeNewContact()
    })

    
  }

  const editConObj = (id, key, value, setArray) => {
    setArray((prev) =>
      prev.map((contact) =>
        contact.id === id
          ? { ...contact, [key]: value } // update only this contact
          : contact
      )
    );
  };

  const putConversation = (data) => {
    console.log(data);
    
    // setConversation(data)
    setConversation(prev => {
      const prevMap = new Map(prev.map(c => [c.id, c]));

      data.forEach(c => {
        const newObj = { ...c };
        const existing = prevMap.get(c.id);

        if (!existing) {
          console.log(`🆕 Adding conversation ${c.id}`);
          prevMap.set(c.id, newObj);
        } else if (JSON.stringify(existing) !== JSON.stringify(newObj)) {
          console.log(`🔄 Updating conversation ${c.id}`);
          prevMap.set(c.id, newObj);
        } else {
          console.log(`✅ No change for conversation ${c.id}`);
        }
      });

      return Array.from(prevMap.values())
        .sort((a, b) => new Date(b?.last_chat?.created_at).getTime() - new Date(a?.last_chat?.created_at).getTime());
    });
  }

  const systemColor = useSystemColors()


  useEffect(() => {
    if (isReady) {
      getAllConversations(userid, (res) => {
        putConversation(res)
      })

      getAllContacts((contacts) => {
        if (!contacts) return;
        
        // console.log(contacts);
        
        setXUsers(contacts?.filter((c) => c.recipient_id))
        setNonXUsers(contacts?.filter((c) => !c.recipient_id))
      })
    }
  }, [isReady])

  useEffect(() => {
    if (!wait && isAuthenticated) {
      if (isReady) {
        refreshContacts(token)
      }
    }
  }, [wait, isAuthenticated, token, isReady])

  useEffect(() => {
    const listener = () => {
      getAllContacts((contacts) => {
        if (!contacts) return;
        
        setXUsers(contacts?.filter((c) => c.recipient_id))
        setNonXUsers(contacts?.filter((c) => !c.recipient_id))
      })
    }

    const converListener = () => {
      getAllConversations(userid, (res) => {
        console.log("event triggered", res);
        
        putConversation(res)
      })
    }

    dbEvents.on('contacts-changed', listener)
    dbEvents.on('conversations_participants-changed', converListener);
    dbEvents.on('chats-changed', converListener);
    dbEvents.on('conversations-changed', converListener)

    return () => {
      dbEvents.off('contacts-changed', listener)
      dbEvents.off('conversations_participants-changed', converListener);
      dbEvents.off('chats-changed', converListener);
      dbEvents.off('conversations-changed', converListener)
    }

  }, [isReady, userid])

  // useEffect(() => {
  //   console.log(conversation);
    
  // }, [conversation])

  return (
    <KeyboardAvoidingView
      behavior={'padding'}
      style={{ flex: 1 }}
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
          style={[ styles.container ]}

        >
          <Spacer height={10} />
          <BackgroundContainer style={{ padding: 12, borderBottomWidth: !isLargeScreen && 1, borderColor: "#ddd", display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Textx title style={{ fontSize: 22, flex: 1 }}>
              Messages
            </Textx>
            {
              isLargeScreen && (
                <Buttons
                  style={[ {  } ]}
                  type='null'
                  onPress={() => toggleChat(true)}
                >
                  <Ionicons name='add' style={{ color: systemColor.text }} size={25} />
                </Buttons>
              )
            }
          </BackgroundContainer>
          <BackgroundContainer style={{ flex: 1 }}>
            {
              <SectionList
                sections={[
                  { title: "", data: conversation, setData: putConversation },
                ]}
                keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
                renderItem={({ item, section }) => (
                  <ConversationView
                    conversation={item}
                    // editConObj={(key, value) => editConObj(item.id, key, value, section.setData)}
                  />
                )}
                contentContainerStyle={{ paddingVertical: 10, flexGrow: 1  }}
                ListEmptyComponent={<Textx>No Conversation here. Click the plus (+) button to start a conversation</Textx>}
              />
            }
          </BackgroundContainer>
          <BackgroundContainer
            style={styles.convBody}
          >
            {
              !isLargeScreen && (
                <Buttons
                  style={[ styles.fab ]}
                  type='primary'
                  onPress={() => toggleChat(true)}
                >
                  <Ionicons name='add' style={{ color: systemColor.primaryText }} size={36} />
                </Buttons>
              )
            }
          </BackgroundContainer>

          {/* contact list */}

          {addNewChat && (
            <View style={styles.contactsOverlay}>
              <TouchableWithoutFeedback onPress={toggleChat}>
                <View style={styles.contactsBackdrop} />
              </TouchableWithoutFeedback>

              <Animated.View
                style={[
                  styles.bottomSheet,
                  {
                    transform: [{ translateY: slideYAnim }],
                    backgroundColor: systemColor.background,
                  },
                ]}
              >
                <BackgroundContainer style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                  <Buttons type="null" onPress={() => { newContact ? closeNewContact() : toggleChat() }}>
                    <Textx>
                      <Ionicons name={ newContact ? "chevron-back" : "chevron-down" } style={{ color: systemColor.text }} size={25} />
                    </Textx>
                  </Buttons>
                  <Textx style={{ flex: 1, fontSize: 18 }} title>
                    {
                      newContact ?
                      "Add New Contact" :
                      "Add Chat"
                    }
                  </Textx>
                  {
                    !newContact &&
                    <>
                      <Buttons type="null" onPress={onRefresh} >
                        <Textx>
                          <Ionicons name='reload-outline' style={{ color: systemColor.text }} size={18} />
                        </Textx>
                      </Buttons>
                      <Buttons type="null" onPress={() => setNewContact(true)}>
                        <Textx>
                          <Ionicons name='person-add' style={{ color: systemColor.text }} size={18} />
                        </Textx>
                      </Buttons>
                    </>
                  }
                </BackgroundContainer>

                <BackgroundContainer>
                  {!newContact && (
                    <SectionList
                      sections={[
                        { title: "X Users", data: xUsers, setData: setXUsers },
                        { title: "Non-X Users", data: nonXUsers, setData: setNonXUsers },
                      ]}
                      keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
                      renderItem={({ item, section }) => (
                        <ContactView
                          contact={item}
                          editConObj={(key, value) => editConObj(item.id, key, value, section.setData)}
                        />
                      )}
                      renderSectionHeader={({ section: { title } }) => (
                        <Textx style={{ fontWeight: "bold", marginVertical: 10 }}>
                          {title}
                        </Textx>
                      )}
                      contentContainerStyle={{ paddingVertical: 10 }}
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      ListEmptyComponent={<Textx>No contact here on X Chats</Textx>}
                    />
                  )}
                </BackgroundContainer>

                {
                  newContact && (
                    <BackgroundContainer
                    
                    >
                      <Spacer />
                      <TextxInput
                        label="Name"
                        type="type"
                        placeholder="Ex: John Doe"
                        placeholderTextColor={systemColor.text}
                        value={name}
                        onChangeText={(text) => setName(text)}
                      />
                      <Spacer height={10} />
                      <TextxInput
                        label="Email"
                        type="email"
                        placeholder="Ex: johndoe@example.com"
                        placeholderTextColor={systemColor.text}
                        value={email}
                        onChangeText={(text) => setEmail(text)}
                      />
                      <Spacer />
                      <Buttons
                        style={{
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderColor: systemColor.infoBorder,
                          borderWidth: 1,
                          borderRadius: 40
                        }}
                        type="info"
                        onPress={saveContact}
                      >
                        <Textx
                          style={{
                            fontSize: 22,
                            padding: 5

                          }}

                          info
                        >
                          Save Contact
                        </Textx>
                      </Buttons>
                    </BackgroundContainer>
                  )
                }
                

              </Animated.View>
            </View>
          )}
        </BackgroundContainer>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    
  );
};

export default MessagesIndex;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  convBody: {
    position: "relative"
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
    height: '80%',
    padding: 20,
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
