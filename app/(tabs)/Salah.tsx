import { CARD_SHADOW, styles, THEME_BLUE } from "./index";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

const isExpoGo = Constants.appOwnership === "expo";

const ALARM_STORAGE_KEY = "@salah_alarms";
const PRAYER_TIMES_STORAGE_KEY = "@salah_prayer_times";
const ALARM_CHANNEL_ID = "salah-alarm";

export type AlarmItem = {
  id: string;
  prayerName: string;
  time: string;
  triggerAt: number;
  notificationId: string;
};

export type PrayerTimeEntry = {
  name: string;
  time: string;
  icon: "nightlight-round" | "light-mode" | "wb-sunny" | "wb-twilight" | "bedtime";
};

const DEFAULT_PRAYER_TIMES: PrayerTimeEntry[] = [
  { name: "Fajr", time: "05:24 am", icon: "nightlight-round" },
  { name: "Dhuhr", time: "12:18 pm", icon: "light-mode" },
  { name: "Asr", time: "03:42 pm", icon: "wb-sunny" },
  { name: "Maghrib", time: "06:06 pm", icon: "wb-twilight" },
  { name: "Isha", time: "07:24 pm", icon: "bedtime" },
];

async function loadPrayerTimes(): Promise<PrayerTimeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(PRAYER_TIMES_STORAGE_KEY);
    if (!raw) return DEFAULT_PRAYER_TIMES;
    const parsed = JSON.parse(raw) as PrayerTimeEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRAYER_TIMES;
    return parsed;
  } catch {
    return DEFAULT_PRAYER_TIMES;
  }
}

export async function savePrayerTimes(times: PrayerTimeEntry[]): Promise<void> {
  await AsyncStorage.setItem(PRAYER_TIMES_STORAGE_KEY, JSON.stringify(times));
}

function parseTimeToDate(timeStr: string): Date {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return new Date();
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const pm = match[3].toLowerCase() === "pm";
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function getNextTriggerDate(date: Date): Date {
  const now = new Date();
  const trigger = new Date(date);
  trigger.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  if (trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }
  return trigger;
}

async function loadAlarms(): Promise<AlarmItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AlarmItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAlarms(alarms: AlarmItem[]): Promise<void> {
  await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(alarms));
}

async function setupNotificationChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
    name: "Salah Alarms",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleAlarmNotification(
  triggerAt: Date,
  prayerName: string,
  timeLabel: string
): Promise<string> {
  await setupNotificationChannel();
    const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${prayerName} – Salah`,
      body: `Alarm at ${timeLabel}`,
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
      channelId: ALARM_CHANNEL_ID,
    },
  });
  return id;
}

function Salah() {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerTimeEntry | null>(null);
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimeEntry[]>(DEFAULT_PRAYER_TIMES);

  const loadStoredAlarms = useCallback(async () => {
    const stored = await loadAlarms();
    setAlarms(stored);
  }, []);

  const loadStoredPrayerTimes = useCallback(async () => {
    const stored = await loadPrayerTimes();
    setPrayerTimes(stored);
  }, []);

  useEffect(() => {
    loadStoredAlarms();
    loadStoredPrayerTimes();
  }, [loadStoredAlarms, loadStoredPrayerTimes]);

  const openTimePicker = (p: PrayerTimeEntry) => {
    setSelectedPrayer(p);
    setAlarmTime(parseTimeToDate(p.time));
    setShowTimePicker(true);
  };

  const onTimeChange = async (_: unknown, date?: Date) => {
    setShowTimePicker(false);
    if (!date || !selectedPrayer) return;

    setAlarmTime(date);
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const triggerAt = getNextTriggerDate(date);

    const updatePrayerTimeInList = () => {
      const updated = prayerTimes.map((p) =>
        p.name === selectedPrayer.name ? { ...p, time: timeStr } : p
      );
      setPrayerTimes(updated);
      savePrayerTimes(updated);
    };

    if (isExpoGo) {
      const newAlarm: AlarmItem = {
        id: `${selectedPrayer.name}-${triggerAt.getTime()}`,
        prayerName: selectedPrayer.name,
        time: timeStr,
        triggerAt: triggerAt.getTime(),
        notificationId: "expo-go",
      };
      const updatedAlarms = [...alarms.filter((a) => a.prayerName !== selectedPrayer.name), newAlarm];
      await saveAlarms(updatedAlarms);
      setAlarms(updatedAlarms);
      updatePrayerTimeInList();
      Toast.show({
        type: "success",
        text1: "Alarm saved",
        text2: `${selectedPrayer.name} at ${timeStr}. Use a development build for real notifications.`,
      });
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Toast.show({
        type: "error",
        text1: "Permission needed",
        text2: "Enable notifications to set alarms",
      });
      return;
    }

    try {
      const notificationId = await scheduleAlarmNotification(
        triggerAt,
        selectedPrayer.name,
        timeStr
      );

      const newAlarm: AlarmItem = {
        id: `${selectedPrayer.name}-${triggerAt.getTime()}`,
        prayerName: selectedPrayer.name,
        time: timeStr,
        triggerAt: triggerAt.getTime(),
        notificationId,
      };

      const updatedAlarms = [...alarms.filter((a) => a.prayerName !== selectedPrayer.name), newAlarm];
      await saveAlarms(updatedAlarms);
      setAlarms(updatedAlarms);
      updatePrayerTimeInList();

      Toast.show({
        type: "success",
        text1: "Alarm set",
        text2: `${selectedPrayer.name} at ${timeStr}`,
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Alarm failed",
        text2: e instanceof Error ? e.message : "Could not set alarm",
      });
    }
  };

  const hasAlarmFor = (prayerName: string) => alarms.some((a) => a.prayerName === prayerName);

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
        {prayerTimes.map((p) => (
          <TouchableOpacity
            key={p.name}
            style={styles.prayerCard}
            onPress={() => openTimePicker(p)}
            activeOpacity={0.8}
          >
            {hasAlarmFor(p.name) && (
              <View style={salahStyles.alarmBadge}>
                <MaterialIcons name="alarm" size={12} color="#fff" />
              </View>
            )}
            <MaterialIcons name={p.icon} size={28} color="#fff" />
            <Text style={styles.prayerName}>{p.name}</Text>
            <Text style={styles.prayerTime}>{p.time}</Text>
            <Text style={salahStyles.alarmHint}>Tap to set alarm</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={alarmTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}

const salahStyles = StyleSheet.create({
  alarmHint: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  alarmBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Salah;
