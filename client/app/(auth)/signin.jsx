import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Dimensions
} from 'react-native'
import React, { useContext, useState } from 'react'
import BackgroundContainer from '../../components/public/BackgroundContainer'
import Textx from '../../components/public/Textx'
import Logo from '../../components/public/Logo'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSystemColors } from '../../constants/useSystemColors'
import Buttons from '../../components/public/Buttons'
import SecondaryContainer from '../../components/public/SecondaryContainer'
import TextxInput from '../../components/public/TextxInput'
import Spacer from '../../components/public/Spacer'
import { AuthContext } from '../../contexts/AuthContext'
import { NotificationManager } from '../../components/public/NotificationManager'
import Loading from '../../components/public/Loading'
import axious from '../../components/public/utils/axious'

const SignIn = () => {
  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ loading, setLoading ] = useState(false)


  const router = useRouter()
  const systemColor = useSystemColors()
  const screenWidth = Dimensions.get('window').width
  const { setUser } = useContext(AuthContext)

  const loginUser = async () => {
    setLoading(true)

    try {
      await axious('/api/login', async(res) => {
        console.log(res);
        
        if (res.success) {
          await setUser(res.token, res.user.name, res.user.email, res.user.id)
            .catch(err => console.error("Failed to save user:", err));

          NotificationManager.push({ message: "You have been logged in.", type: "success"});
          router.replace("/messages");
        } else {
          NotificationManager.push({
            message: res.message, 
            type: "error"
          })
        }
      }, {
        method: 'POST',
        token: false,
        data: {
          email,
          password,
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

  return (
    <KeyboardAvoidingView
      behavior={'padding'}
      style={{ flex: 1 }}
    >
      <Loading running={loading} /> 
      <TouchableWithoutFeedback 
        onPress={(e) => {
          const isInput = e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA'
          if (!isInput) {
            Keyboard.dismiss()
          }
        }}
      >
        <BackgroundContainer style={styles.container} safe>
          <BackgroundContainer style={styles.subContainer}>
            <Logo />
            <Textx style={styles.logoText} title>
              Chat_by_x
            </Textx>
          </BackgroundContainer>

          <SecondaryContainer
            scrollable
            style={[styles.secondaryContainer, { width: '100%', maxWidth: 600 }]}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <TextxInput
              label="Email"
              type="email"
              placeholder="Ex: johndoe@example.com"
              placeholderTextColor={systemColor.text}
              value={email}
              onChangeText={(text) => setEmail(text)}
            />
            
            <Spacer height={10} />

            <TextxInput
              label="Password"
              type="password"
              value={password}
              onChangeText={(text) => setPassword(text)}
              password
            />
            
            <Spacer />
            <Buttons
              style={[
                styles.submitBtn,
                {
                  width: screenWidth - 40,
                  maxWidth: 500,
                  margin: "auto"
                }
              ]}
              onPress={ loginUser }
              disabled={ !email || !password }
            >
              <Textx
                style={{ textAlign: "center", fontSize: 16 }}
                primary
              >
                Log In
              </Textx>
            </Buttons>
            <Spacer height={12} />
            <SecondaryContainer style={styles.alreadyContainer}>
              <Textx style={{ fontWeight: "bold", fontSize: 16 }}>
                Don't have an account?
              </Textx>
              <Buttons
                type='secondary'
                style={{ paddingVertical: 0, paddingLeft: 5 }}
                onPress = {() => router.replace("/signup")}
              >
                <Textx
                  style={{ fontSize: 16 }}
                  info
                >
                  Sign Up
                </Textx>
              </Buttons>
            </SecondaryContainer>
          </SecondaryContainer>
        </BackgroundContainer>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

export default SignIn

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  subContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    margin: 'auto',
    padding: 20,
    flex: 1,
  },
  submitBtn: {
    paddingVertical: 20,
    borderRadius: 30,
    marginVertical: 0
  },
  secondaryContainer: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 20,
    paddingRight: 20,
    borderTopLeftRadius: 50,
    flex: 1
  },
  logoText: {
    fontSize: 20
  },
  alreadyContainer: {
    display: "flex",
    flexDirection: "row",
    margin: "auto",
    paddingTop: 0
  },
  backBtn: {
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
  }
})