import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import BackgroundContainer from '../components/public/BackgroundContainer'
import darkLogo from '../assets/dark_logo.png'
import Textx from '../components/public/Textx'
import Logo from '../components/public/Logo'
import Spacer from '../components/public/Spacer'
import Buttons from '../components/public/Buttons'
import { Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSystemColors } from '../constants/useSystemColors'
import { AuthContext } from '../contexts/AuthContext'
import { useChatDb } from '../components/public/hooks/useChatDb'

const Welcome = () => {
  const [guest, setGuest] = useState(true)

  const router = useRouter()
  const systemColor = useSystemColors()
  const screenWidth = Dimensions.get('window').width
  const { isAuthenticated, wait, token } = useContext(AuthContext)
  const { isReady, loading, downloadMessages } = useChatDb()

  const authPage = (url) => {
    router.push(url)
  }

  useEffect(() => {
    if (!wait && isAuthenticated) {
      if (isReady) {
        router.replace('/messages')
      }
    }
  }, [router, wait, isAuthenticated, isReady])

  return (
    <BackgroundContainer
      style={styles.container}
      safe
    >

      {
        (wait || isAuthenticated) ? (
          <>
            <Logo />
            <Spacer height={12} />
            <Textx style={ styles.logoText } title >
              Chat_by_x
            </Textx>
          </>
        ) : 
        (
          <>
            <BackgroundContainer
              style={styles.subContainer}
            >
              <Logo />
              <Spacer height={12} />
              <Textx style={ styles.logoText } title >
                Chat_by_x
              </Textx>
              
              <Spacer height={45} />

              <Textx style={styles.bigText} title >
                Get Started!
              </Textx>
              <Spacer height={5} />
              <Textx style={styles.avgText} >
                This chat_by_x is for educational and testing purpose only. Should not include important data.
              </Textx>
              <Spacer height={18} />
              <Buttons style={ [styles.proceedButton, { width: screenWidth - 40, maxWidth: 500 }] } onPress = {() => authPage("/signup")} >
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
                  onPress = {() => authPage("/signin")}
                >
                  <Textx
                    style={{ fontSize: 16 }}
                    info
                  >
                    Log in
                  </Textx>
                </Buttons>
              </BackgroundContainer>
            </BackgroundContainer>
          </>
        )
      }

      

    </BackgroundContainer>
  )
}

export default Welcome

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  subContainer: {
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "600px",
    margin: "auto",
    padding: 20
  },
  logoText: {
    fontSize: 20
  },
  bigText: {
    fontSize: 32
  },
  avgText: {
    fontSize: 16,
    textAlign: "center"
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
    margin: "auto"
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
})