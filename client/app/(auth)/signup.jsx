import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Dimensions,
  TextInput
} from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
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
import useREmail from '../../components/public/hooks/useREmail'
import CodeInput from '../../components/public/CodeInput'
import BlockAlert from '../../components/public/BlockAlert'
import CountdownTimer from '../../components/public/CountdownTimer'
import axious from '../../components/public/utils/axious'
import Loading from '../../components/public/Loading'
import { NotificationManager } from '../../components/public/NotificationManager'
import { AuthContext } from '../../contexts/AuthContext'
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';
import EmailInputWithButton from '../../components/public/EmailInputWithButton'

const generateAndStoreEncryptionKey = async (email) => {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const key = Buffer.from(bytes).toString('hex');
  return key;

};


const SignUp = () => {
  const [ loading, setLoading ] = useState(false)
  const [ name, setName ] = useState('')
  const [ eBtn, setEBtn ] = useState(false)
  const [ email, setEmail ] = useState('')
  const [ emailValid, setEmailValid ] = useState(false)
  const [ emailCode, setEmailCode ] = useState(false)
  const [ resend, setResend ] = useState(false)
  const [ password, setPassword ] = useState('')
  const [ rPassword, setRPassword ] = useState('')

  const router = useRouter()
  const systemColor = useSystemColors()
  const screenWidth = Dimensions.get('window').width
  const { setUser } = useContext(AuthContext)

  const isEmail = useREmail(email);

  const sendCode = async () => {
    if (!email) {
      return
    }

    setLoading(true)

    try {
      await axious('/api/send-code', (res) => {
        if (res.success) {
          NotificationManager.push({ message: "Email sent.", type: "success"})
          setEBtn(true)
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
          email
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

  const registerUser = async () => {
    setLoading(true)

    try {
      const encryptionKey = await generateAndStoreEncryptionKey(email);

      await axious('/api/register', async(res) => {
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
        data: {
          name,
          verification_code: emailCode,
          email,
          password,
          password_confirmation: rPassword,
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

  useEffect(() => {
    setEmailValid(isEmail)
  },[email, isEmail])

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
            <Spacer height={12} />
            <Textx style={ styles.logoText } title >
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
              label="Name"
              placeholder="Ex: John Doe"
              placeholderTextColor={systemColor.text}
              value={name}
              onChangeText={(text) => setName(text)}
            />
            
            <Spacer />

            <EmailInputWithButton
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEBtn(false);
              }}
              onPressButton={sendCode}
              buttonLabel={eBtn ? "re-send code" : "send code"}
              buttonDisabled={!emailValid || Boolean(emailCode) || (eBtn && !resend)}
              inputDisabled={emailCode}
            />

            {
              emailValid && (
                <>
                  <Spacer height={10} />
                  {
                    !emailCode && (
                      <BlockAlert
                        containerStyle={{
                          padding: 8,
                          borderRadius: 6
                        }}
                        textStyle={{
                          fontSize: 16,
                          fontStyle: "italic"
                        }}
                      >
                        {
                          !eBtn ? (
                            <>
                              Click the "send code" button to send a verification code to {email}.
                            </>
                          ) : (
                            !resend ?
                            <>
                              You can re-send verification code in <CountdownTimer phpTimestamp={Number(Number(Date.now())/1000)+45} extFunc={() => setResend(true)} sec />
                            </> :
                            <>
                              Didn't get the code? Click the "re-send code" button to re-send code.
                            </>
                          )
                        }
                      </BlockAlert>
                    )
                  }

                  <Spacer height={10} />

                  <CodeInput
                    length={6}
                    label={'Verification Code'}
                    onCodeChange={(code) => setEmailCode(code)}
                    boxStyle={{ borderColor: systemColor.infoBorder }}
                  />
                </>
              )
            }            

            <Spacer />

            <TextxInput
              label="Password"
              type="password"
              value={password}
              onChangeText={(text) => setPassword(text)}
              password
            />

            <Spacer />

            <TextxInput
              label="Confirm Password"
              type="password"
              value={rPassword}
              onChangeText={(text) => setRPassword(text)}
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
              disabled={ !name || !email || !password || !rPassword }
              onPress = { registerUser }
            >
              <Textx
                style={{ textAlign: "center", fontSize: 16 }}
                primary
              >
                Sign Up
              </Textx>
            </Buttons>
            <Spacer height={12} />
            <SecondaryContainer style={styles.alreadyContainer}>
              <Textx style={{ fontWeight: "bold", fontSize: 16 }}>
                Already have an account?
              </Textx>
              <Buttons
                type='secondary'
                style={{ paddingVertical: 0, paddingLeft: 5 }}
                onPress = {() => router.replace("/signin")}
              >
                <Textx
                  style={{ fontSize: 16 }}
                  info
                >
                  Log in
                </Textx>
              </Buttons>
            </SecondaryContainer>
          </SecondaryContainer>
        </BackgroundContainer>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

export default SignUp

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
    padding: 20
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
    borderTopLeftRadius: 50
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
    paddingRight: 0,
    
  }
})