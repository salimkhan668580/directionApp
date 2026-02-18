import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ExpoLocation from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { styles } from "./index";

const Location = () => {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setError("Location permission denied");
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

        const parts = [
          address.city ?? address.subregion,
          address.region,
          address.country,
        ].filter(Boolean);
        setLocationName(parts.length > 0 ? parts.join(", ") : "Current location");
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Unable to get location"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.locationRow}>
      <View style={styles.dot} />
      <View style={styles.locationField}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.locationText} numberOfLines={1}>
            {error ?? locationName ?? "Location unavailable"}
          </Text>
        )}
        <MaterialIcons name="place" size={20} color="#fff" />
      </View>
    </View>
  );
};

export default Location;
