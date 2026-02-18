import { useTranslation } from "@/context/TranslationContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ExpoLocation from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { styles } from "./index";

export type LocationInfo = {
  city: string;
  country: string;
  locationName: string;
};

type LocationProps = {
  onLocationLoaded?: (info: LocationInfo) => void;
};

const Location = ({ onLocationLoaded }: LocationProps) => {
  const { t } = useTranslation();
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setErrorCode("permissionDenied");
          return;
        }

        const position = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });

        if (cancelled) return;

        const [address] = await ExpoLocation.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (cancelled || !address) return;

        const city = (address.city ?? address.subregion ?? "").trim();
        const country = (address.country ?? "").trim();
        const parts = [city, address.region, country].filter(Boolean);
        const name = parts.length > 0 ? parts.join(", ") : "";
        setLocationName(name);
        if (city && country) {
          onLocationLoaded?.({ city, country, locationName: name });
        }
      } catch {
        if (!cancelled) {
          setErrorCode("unableToGetLocation");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLocation();
    return () => {
      cancelled = true;
    };
  }, [onLocationLoaded]);

  return (
    <View style={styles.locationRow}>
      <View style={styles.dot} />
      <View style={styles.locationField}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.locationText} numberOfLines={1}>
            {errorCode ? t(`location.${errorCode}`) : locationName === "" ? t("location.currentLocation") : locationName ?? t("location.locationUnavailable")}
          </Text>
        )}
        <MaterialIcons name="place" size={20} color="#fff" />
      </View>
    </View>
  );
};

export default Location;
