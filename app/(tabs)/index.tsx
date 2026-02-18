import { useTranslation } from '@/context/TranslationContext';
import type { Language } from '@/context/TranslationContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Location from './Location';
import Compass from './Compass';
import Salah from './Salah';
import type { LocationInfo } from './Location';

export const THEME_BLUE = '#34AED6';
export const COMPASS_BG = '#2A9EC4';
export const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 8 },
});



const ALADHAN_GTOH = 'https://api.aladhan.com/v1/gToH';

const LANGUAGE_OPTIONS: { value: Language }[] = [
  { value: 'hindi' },
  { value: 'english' },
  { value: 'arabic' },
];

function formatEnglishDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).replace(/\s+(\d{4})$/, ', $1');
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const { language, setLanguage, t } = useTranslation();
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [hijriText, setHijriText] = useState<string | null>(null);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  const handleLocationLoaded = useCallback((info: LocationInfo) => {
    setLocationInfo(info);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;
    fetch(`${ALADHAN_GTOH}?date=${dateStr}`)
      .then((res) => res.json())
      .then((json: { code?: number; data?: { hijri?: { day: string; month?: { en?: string }; year: string } } }) => {
        if (cancelled || json.code !== 200 || !json.data?.hijri) return;
        const h = json.data.hijri;
        const monthName = h.month?.en ?? '';
        setHijriText(`${h.day} ${monthName}, ${h.year}`);
      })
      .catch(() => {
        if (!cancelled) setHijriText(null);
      });
    return () => { cancelled = true; };
  }, []);

  const englishDate = formatEnglishDate(new Date());

  const topPadding = Math.max(insets.top, 28);
  const bottomPadding = 24 + insets.bottom;
  const contentMinHeight = windowHeight - topPadding - bottomPadding;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          minHeight: contentMinHeight,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top blue section */}
      <View style={[styles.blueSection, styles.sectionEqual]}>
        {/* Header */}
   

        {/* Date + Language row */}
        <View style={styles.dateLanguageRow}>
          <View style={styles.dateBlock}>
            <View style={styles.dot} />
            <View>
              <Text style={styles.dateText}>{englishDate}</Text>
              <Text style={styles.hijriText}>{hijriText ?? '...'}</Text>
            </View>
          </View>
          <View style={styles.languageDropdownWrap}>
            <Pressable
              style={styles.languageTrigger}
              onPress={() => setLanguageDropdownOpen((v) => !v)}
            >
              <Text style={styles.languageTriggerText}>
                {t(`common.${language}`)}
              </Text>
              <MaterialIcons
                name={languageDropdownOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
                size={24}
                color="#fff"
              />
            </Pressable>
            {languageDropdownOpen && (
              <View style={styles.languageDropdownInline}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.languageOption,
                      language === opt.value && styles.languageOptionSelected,
                    ]}
                    onPress={() => {
                      setLanguage(opt.value);
                      setLanguageDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.languageOptionText}>{t(`common.${opt.value}`)}</Text>
                    {language === opt.value && (
                      <MaterialIcons name="check" size={20} color={THEME_BLUE} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Location */}
      <Location onLocationLoaded={handleLocationLoaded} />
      </View>

      {/* Card 1: Salah Timings */}
      <Salah city={locationInfo?.city ?? null} country={locationInfo?.country ?? null} />

      {/* Card 2: Compass */}

<Compass/>
    </ScrollView>
  );
}

 export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: THEME_BLUE },
  scrollContent: {
    flexGrow: 1,
  },
  sectionEqual: {
    flex: 1,
  },
  blueSection: {
    backgroundColor: THEME_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: { opacity: 0.95 },
  ramadanText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 10,
    marginTop: 6,
  },
  dateBlock: {
    flexDirection: 'row',
  },
  dateText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  hijriText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  dateLanguageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  languageTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    gap: 4,
  },
  languageTriggerText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  languageDropdownWrap: {
    alignSelf: 'flex-end',
    zIndex: 1000,
    ...(Platform.OS === 'android' && { elevation: 10 }),
  },
  languageDropdownInline: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    zIndex: 1001,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(52, 174, 214, 0.1)',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff',
  },
  locationText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 16,
    marginHorizontal: 12,
    marginTop: 12,
  },
  prayerScroll: {
    flex: 1,
  },
  compassBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  compassWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COMPASS_BG,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardinalLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  cardinalN: { top: 16 },
  cardinalE: { right: 16 },
  cardinalS: { bottom: 16 },
  cardinalW: { left: 16 },
  compassNeedle: {
    position: 'absolute',
    width: 6,
    height: 100,
    backgroundColor: '#E53935',
    borderRadius: 2,
    transform: [{ translateY: -50 }],
  },
  kaabaIndicator: {
    position: 'absolute',
    left: -62,
    width: 26,
    height: 26,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
  },
  tapEnlarge: {
    fontSize: 12,
    color: '#687076',
    marginTop: 6,
  },
  compassCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compassTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeIconButton: {
    padding: 6,
  },
  compassIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 174, 214, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  salahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  salahTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clockIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 174, 214, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  salahTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  prayerScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
  },
  prayerCard: {
    minWidth: 88,
    backgroundColor: THEME_BLUE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  prayerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  prayerTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
});
