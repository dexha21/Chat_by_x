import { StyleSheet, Text, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import React, { useContext, useEffect, useState } from 'react'
import { useSystemColors } from '../../constants/useSystemColors'
import { StatusBar } from 'expo-status-bar'
import { AuthContext } from '../../contexts/AuthContext'
import Loading from '../../components/public/Loading'

const AuthLayout = () => {
  const [ loading, setLoading ] = useState(true)

  const systemColor = useSystemColors()
  const { isAuthenticated, wait } = useContext(AuthContext)
  const router = useRouter()

  useEffect(() => {
    if (!wait && isAuthenticated) {
      router.replace('/messages')
    } else {
      setLoading(false)
    }
  }, [wait, isAuthenticated])

  return (
    <>
      <Loading running={loading} />
      <StatusBar value="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: systemColor.statusbar }
        }}
      >
        <Stack.Screen name='signin' options={{ headerShown: false }} />
        <Stack.Screen name='signup' options={{ headerShown: false }} />
        <Stack.Screen name='googleSignin' options={{ headerShown: false }} />
      </Stack>
    </>
  )
}

export default AuthLayout

const styles = StyleSheet.create({})