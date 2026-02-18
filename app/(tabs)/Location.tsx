import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Text, View } from "react-native";
import { styles } from "./index";

const Location = () => {
    return (
        <View style={styles.locationRow}>
        <View style={styles.dot} />
        <View style={styles.locationField}>
          <Text style={styles.locationText}>Noida</Text>
          <MaterialIcons name="place" size={20} color="#fff" />
        </View>
      </View>
    )
}

export default Location;