import { CARD_SHADOW, styles, THEME_BLUE } from "./index";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScrollView, Text, View } from "react-native";

const PRAYER_TIMES = [
  { name: 'Fajr', time: '05:24 am', icon: 'nightlight-round' as const },
  { name: 'Dhuhr', time: '12:18 pm', icon: 'light-mode' as const },
  { name: 'Asr', time: '03:42 pm', icon: 'wb-sunny' as const },
  { name: 'Maghrib', time: '06:06 pm', icon: 'wb-twilight' as const },
  { name: 'Isha', time: '07:24 pm', icon: 'bedtime' as const },
];    
    
    function Salah() {
    return (
        <View style={[styles.card, CARD_SHADOW, styles.sectionEqual]}>
        <View style={styles.salahHeader}>
          <View style={styles.salahTitleRow}>
            <View style={styles.clockIconWrap}>
              <MaterialIcons name="schedule" size={22} color={THEME_BLUE} />
            </View>
            <Text style={styles.salahTitle}>Salah Timings</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          style={styles.prayerScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.prayerScrollContent}
        >
          {PRAYER_TIMES.map((p) => (
            <View key={p.name} style={styles.prayerCard}>
              <MaterialIcons name={p.icon} size={28} color="#fff" />
              <Text style={styles.prayerName}>{p.name}</Text>
              <Text style={styles.prayerTime}>{p.time}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

    )
}
export default Salah;