import { Text, TouchableOpacity, View } from "react-native";
import {  styles ,CARD_SHADOW, THEME_BLUE} from "./index";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const Compass = () => {
    return (
        <View style={[styles.card, CARD_SHADOW, styles.sectionEqual]}>
        <View style={styles.compassCardHeader}>
          <View style={styles.compassTitleRow}>
            <View style={styles.compassIconWrap}>
              <MaterialIcons name="explore" size={22} color={THEME_BLUE} />
            </View>
            <Text style={styles.compassCardTitle}>Compass</Text>
          </View>
          <TouchableOpacity style={styles.homeIconButton}>
            <MaterialIcons name="home" size={24} color={THEME_BLUE} />
          </TouchableOpacity>
        </View>
        <View style={styles.compassBlock}>
          <View style={styles.compassWrapper}>
            <View style={styles.compassCircle}>
              <Text style={[styles.cardinalLabel, styles.cardinalN]}>NORTH</Text>
              <Text style={[styles.cardinalLabel, styles.cardinalE]}>EAST</Text>
              <Text style={[styles.cardinalLabel, styles.cardinalS]}>SOUTH</Text>
              <Text style={[styles.cardinalLabel, styles.cardinalW]}>WEST</Text>
              <View style={styles.compassNeedle} />
              {/* <View style={styles.kaabaIndicator} /> */}
            </View>
          </View>
          <Text style={styles.tapEnlarge}>Tap to Enlarge</Text>
        </View>
      </View>
    )
}

export default Compass;