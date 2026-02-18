import { useTranslation } from "@/context/TranslationContext";
import { CARD_SHADOW, styles, THEME_BLUE } from "./index";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  removeAlarm as removeNativeAlarm,
  scheduleAlarm as scheduleNativeAlarm,
} from "expo-alarm-module";

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

const ALADHAN_API_BASE = "https://api.aladhan.com/v1/timingsByCity";
const DEFAULT_CITY = "Delhi";
const DEFAULT_COUNTRY = "India";

const PRAYER_ICONS: PrayerTimeEntry["icon"][] = [
  "nightlight-round",
  "light-mode",
  "wb-sunny",
  "wb-twilight",
  "bedtime",
];

const DEFAULT_PRAYER_TIMES: PrayerTimeEntry[] = [
  { name: "Fajr", time: "05:24 am", icon: "nightlight-round" },
  { name: "Dhuhr", time: "12:18 pm", icon: "light-mode" },
  { name: "Asr", time: "03:42 pm", icon: "wb-sunny" },
  { name: "Maghrib", time: "06:06 pm", icon: "wb-twilight" },
  { name: "Isha", time: "07:24 pm", icon: "bedtime" },
];

type AladhanTimings = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

/** Convert API 24h "HH:mm" to display "h:mm am/pm". */
function formatTime24to12(hhmm: string): string {
  const [hStr, mStr] = hhmm.trim().split(":");
  const h = parseInt(hStr ?? "0", 10);
  if (h === 12) return `12:${(mStr ?? "00").padStart(2, "0")} pm`;
  if (h === 0) return `12:${(mStr ?? "00").padStart(2, "0")} am`;
  const hour = h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? "pm" : "am";
  return `${hour}:${(mStr ?? "00").padStart(2, "0")} ${ampm}`;
}

/** Fetch prayer times from Aladhan API for a given date and city. */
async function fetchPrayerTimesFromAPI(
  city: string,
  country: string,
  date?: Date
): Promise<PrayerTimeEntry[]> {
  const d = date ?? new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;
  const url = `${ALADHAN_API_BASE}/${dateStr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
  const json = (await res.json()) as {
    code?: number;
    data?: { timings?: AladhanTimings };
  };
  if (json.code !== 200 || !json.data?.timings) throw new Error("Invalid Aladhan response");
  const t = json.data.timings;
  const names: (keyof AladhanTimings)[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  return names.map((name, i) => ({
    name,
    time: formatTime24to12(t[name]),
    icon: PRAYER_ICONS[i],
  }));
}

/** Returns stored times or null if nothing saved. */
async function loadPrayerTimes(): Promise<PrayerTimeEntry[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PRAYER_TIMES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrayerTimeEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
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

/** Schedules a native Android alarm (full-screen, default alarm sound). Returns true if scheduled, false to fall back to notification. */
async function tryScheduleNativeAlarm(
  uid: string,
  triggerAt: Date,
  prayerName: string,
  timeLabel: string
): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    await scheduleNativeAlarm({
      uid,
      day: triggerAt,
      title: `${prayerName} – Salah`,
      description: `Alarm at ${timeLabel}`,
      showDismiss: true,
      showSnooze: true,
      snoozeInterval: 5,
      repeating: false,
      active: true,
    });
    return true;
  } catch {
    return false;
  }
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

const PRAYER_KEYS: Record<string, string> = {
  Fajr: "prayerFajr",
  Dhuhr: "prayerDhuhr",
  Asr: "prayerAsr",
  Maghrib: "prayerMaghrib",
  Isha: "prayerIsha",
};

type SalahProps = {
  city?: string | null;
  country?: string | null;
};

function Salah({ city = null, country = null }: SalahProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerTimeEntry | null>(null);
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimeEntry[]>(DEFAULT_PRAYER_TIMES);
  const { t } = useTranslation();

  const loadStoredAlarms = useCallback(async () => {
    const stored = await loadAlarms();
    setAlarms(stored);
  }, []);

  const loadStoredPrayerTimes = useCallback(async () => {
    const stored = await loadPrayerTimes();
    if (stored != null) {
      setPrayerTimes(stored);
      return;
    }
    if (city && country) {
      try {
        const apiTimes = await fetchPrayerTimesFromAPI(city, country);
        await savePrayerTimes(apiTimes);
        setPrayerTimes(apiTimes);
      } catch {
        setPrayerTimes(DEFAULT_PRAYER_TIMES);
      }
    } else {
      try {
        const apiTimes = await fetchPrayerTimesFromAPI(DEFAULT_CITY, DEFAULT_COUNTRY);
        await savePrayerTimes(apiTimes);
        setPrayerTimes(apiTimes);
      } catch {
        setPrayerTimes(DEFAULT_PRAYER_TIMES);
      }
    }
  }, [city, country]);

  useEffect(() => {
    loadStoredAlarms();
    loadStoredPrayerTimes();
  }, [loadStoredAlarms, loadStoredPrayerTimes]);

  useEffect(() => {
    if (!city || !country) return;
    let cancelled = false;
    (async () => {
      try {
        const apiTimes = await fetchPrayerTimesFromAPI(city, country);
        if (!cancelled) {
          await savePrayerTimes(apiTimes);
          setPrayerTimes(apiTimes);
        }
      } catch {
        if (!cancelled) setPrayerTimes(DEFAULT_PRAYER_TIMES);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city, country]);

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
        text1: t("salah.alarmSaved"),
        text2: `${selectedPrayer.name} at ${timeStr}. ${t("salah.useDevBuild")}`,
      });
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Toast.show({
        type: "error",
        text1: t("salah.permissionNeeded"),
        text2: t("salah.enableNotifications"),
      });
      return;
    }

    const alarmId = `${selectedPrayer.name}-${triggerAt.getTime()}`;
    const existingAlarm = alarms.find((a) => a.prayerName === selectedPrayer.name);
    if (existingAlarm && Platform.OS === "android") {
      try {
        await removeNativeAlarm(existingAlarm.id);
      } catch {
        // ignore (e.g. was notification-only)
      }
    }

    try {
      const usedNativeAlarm =
        (await tryScheduleNativeAlarm(alarmId, triggerAt, selectedPrayer.name, timeStr)) === true;
      const notificationId = usedNativeAlarm
        ? "native"
        : await scheduleAlarmNotification(triggerAt, selectedPrayer.name, timeStr);

      const newAlarm: AlarmItem = {
        id: alarmId,
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
        text1: t("salah.alarmSet"),
        text2: `${selectedPrayer.name} at ${timeStr}`,
      });
    } catch (e) {
      Toast.show({
        type: "error",
        text1: t("salah.alarmFailed"),
        text2: e instanceof Error ? e.message : t("salah.couldNotSetAlarm"),
      });
    }
  };

  const hasAlarmFor = (prayerName: string) => alarms.some((a) => a.prayerName === prayerName);

  const removeAlarm = async (prayerName: string) => {
    const alarm = alarms.find((a) => a.prayerName === prayerName);
    if (!alarm) return;
    if (Platform.OS === "android") {
      try {
        await removeNativeAlarm(alarm.id);
      } catch {
        // ignore if was notification-only
      }
    }
    if (
      alarm.notificationId &&
      alarm.notificationId !== "native" &&
      alarm.notificationId !== "expo-go"
    ) {
      try {
        await Notifications.cancelScheduledNotificationAsync(alarm.notificationId);
      } catch {
        // ignore
      }
    }
    const updatedAlarms = alarms.filter((a) => a.prayerName !== prayerName);
    await saveAlarms(updatedAlarms);
    setAlarms(updatedAlarms);
    Toast.show({
      type: "success",
      text1: t("salah.alarmRemoved"),
      text2: `${prayerName} ${t("salah.alarmCancelled")}`,
    });
  };

  const onPrayerCardPress = (p: PrayerTimeEntry) => {
    if (hasAlarmFor(p.name)) {
      Alert.alert(
        `${t(`salah.${PRAYER_KEYS[p.name] ?? "prayerFajr"}`)} ${t("salah.alarmTitle")}`,
        t("salah.changeTimeOrRemove"),
        [
          { text: t("salah.cancel"), style: "cancel" },
          { text: t("salah.removeAlarm"), style: "destructive", onPress: () => removeAlarm(p.name) },
          { text: t("salah.changeTime"), onPress: () => openTimePicker(p) },
        ]
      );
    } else {
      openTimePicker(p);
    }
  };

  return (
    <View style={[styles.card, CARD_SHADOW, styles.sectionEqual]}>
      <View style={styles.salahHeader}>
        <View style={styles.salahTitleRow}>
          <View style={styles.clockIconWrap}>
            <MaterialIcons name="schedule" size={22} color={THEME_BLUE} />
          </View>
          <Text style={styles.salahTitle}>{t("salah.salahTimings")}</Text>
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
            onPress={() => onPrayerCardPress(p)}
            activeOpacity={0.8}
          >
            {hasAlarmFor(p.name) && (
              <View style={salahStyles.alarmBadge}>
                <MaterialIcons name="alarm" size={12} color="#fff" />
              </View>
            )}
            <MaterialIcons name={p.icon} size={28} color="#fff" />
            <Text style={styles.prayerName}>{t(`salah.${PRAYER_KEYS[p.name] ?? "prayerFajr"}`)}</Text>
            <Text style={styles.prayerTime}>{p.time}</Text>
            <Text style={salahStyles.alarmHint}>
              {hasAlarmFor(p.name) ? t("salah.tapToChangeOrRemove") : t("salah.tapToSetAlarm")}
            </Text>
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
