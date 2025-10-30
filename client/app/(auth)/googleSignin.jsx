import { StyleSheet } from "react-native"
import { WebView } from "react-native-webview"
import BackgroundContainer from "../../components/public/BackgroundContainer"

const GoogleSignin = () => {

  const handleMessage = (event) => {
    try {
      const data = event.nativeEvent.data;

      // In your google-login.html, you should call:
      // window.ReactNativeWebView.postMessage(access_token);
      console.log("Access Token from Web:", data);

      // You can now store this in secure storage, AsyncStorage, or send to backend
      // Example: AsyncStorage.setItem("google_access_token", data);
    } catch (error) {
      console.error("Error receiving token:", error);
    }
  };
  
  return (
    <BackgroundContainer
      style={styles.container}
      safe
    >
      <WebView
        source={{ uri: "https://kikae.com.ng/testAccessToken.php" }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </BackgroundContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
})

export default GoogleSignin