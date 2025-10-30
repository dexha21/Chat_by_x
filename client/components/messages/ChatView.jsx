import { StyleSheet, Text, View } from 'react-native'
import React, { useContext } from 'react'
import BackgroundContainer from '../public/BackgroundContainer'
import Textx from '../public/Textx'
import { AuthContext } from '../../contexts/AuthContext'
import { useSystemColors } from '../../constants/useSystemColors'

const ChatView = ({ chat }) => {

  const systemColor = useSystemColors()

  const { userid } = useContext(AuthContext)

  return (
    <BackgroundContainer
      style={[
        styles.container,
        {
          flexDirection: chat.sender_id == userid ? "row-reverse" : "row"
        }
      ]}
    >
      <View
        style={[
          styles.content,
          {
            backgroundColor:
              chat.sender_id == userid ? systemColor.secondary : systemColor.primary,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            borderTopLeftRadius: chat.sender_id == userid ? 12 : 0,
            borderTopRightRadius: chat.sender_id == userid ? 0 : 12,
            alignSelf: chat.sender_id == userid ? "flex-end" : "flex-start",
          },
        ]}
      >
        <Textx>{chat.message}</Textx>
      </View>

    </BackgroundContainer>
  )
}

export default ChatView

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 8
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    maxWidth: "80%"
  }
})