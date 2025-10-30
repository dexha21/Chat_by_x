import { View } from "react-native"
import Textx from "./Textx"
import { useSystemColors } from "../../constants/useSystemColors"

const BlockAlert = ({ children, containerStyle, textStyle, type="primary" }) => {
  const systemColor = useSystemColors()

  const backgroundColor =
    type === "secondary" ? systemColor.secondary :
    type === "info" ? systemColor.info :
    type === "background" ? systemColor.background :
    type === "error" ? systemColor.error :
    type === "success" ? systemColor.success :
    type === "null" ? "" :
    systemColor.primary

    const color =
    type === "secondary" ? systemColor.text :
    type === "info" ? systemColor.primary :
    type === "background" ? systemColor.text :
    type === "error" ? systemColor.primary :
    type === "success" ? systemColor.primary :
    type === "null" ? "" :
    systemColor.primaryText

  return (
    <View
      style={[
        {
          backgroundColor 
        },
        containerStyle
      ]}
    >
      <Textx
        style={[
          {
            color
          },
          textStyle
        ]}
      >
        {children}
      </Textx>
    </View>
  )
}

export default BlockAlert