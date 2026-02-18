import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ExpoLocation from "expo-location";
import { Magnetometer } from "expo-sensors";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, {
    Circle,
    G,
    Line,
    Polygon,
    Text as SvgText,
} from "react-native-svg";
import { CARD_SHADOW, THEME_BLUE, styles } from "./index";

const QIBLA_LAT = 21.4225;
const QIBLA_LON = 39.8262;

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_RING = 118;
const R_LABELS = 88;
const DIAL_EDGE = "#2A9EC4";

const EARTH_RADIUS_KM = 6371;

function bearingInDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1r = (lat1 * Math.PI) / 180;
  const lat2r = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2r);
  const x =
    Math.cos(lat1r) * Math.sin(lat2r) -
    Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLon);
  let b = (Math.atan2(y, x) * 180) / Math.PI;
  return (b + 360) % 360;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

const Compass = () => {
  const [heading, setHeading] = useState(0);
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const sub = Magnetometer.addListener((data) => {
      const { x, y } = data;
      let angle = (Math.atan2(y, x) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      setHeading(angle);
    });
    Magnetometer.setUpdateInterval(100);
    return () => sub.remove();
  }, []);

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied");
        return;
      }
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setUserCoords({ lat, lon });
      setQiblaBearing(bearingInDegrees(lat, lon, QIBLA_LAT, QIBLA_LON));
      setDistanceKm(haversineKm(lat, lon, QIBLA_LAT, QIBLA_LON));
      setLocationError(null);
    } catch (e) {
      setLocationError(
        e instanceof Error ? e.message : "Unable to get location",
      );
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const qiblaAngle = qiblaBearing != null ? qiblaBearing - heading : null;

  return (
    <View style={[styles.card, CARD_SHADOW, styles.sectionEqual]}>
      <View style={styles.compassCardHeader}>
        <View style={styles.compassTitleRow}>
          <View style={styles.compassIconWrap}>
            <MaterialIcons name="explore" size={22} color={THEME_BLUE} />
          </View>
          <Text style={styles.compassCardTitle}>Compass</Text>
        </View>
        {/* <TouchableOpacity style={styles.homeIconButton}>
          <MaterialIcons name="home" size={24} color={THEME_BLUE} />
        </TouchableOpacity> */}
      </View>

      <View style={compassStyles.compassBlock}>
        <View style={compassStyles.compassSvgWrap}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {/* Dial rotates with heading; needle stays fixed pointing up */}
            <G
              transform={`translate(${CX},${CY}) rotate(${-heading}) translate(${-CX},${-CY})`}
            >
              {/* Simple compass circle */}
              <Circle
                cx={CX}
                cy={CY}
                r={R_RING}
                fill={THEME_BLUE}
                stroke={DIAL_EDGE}
                strokeWidth={2}
              />

              {/* Simple ticks every 30° */}
              {Array.from({ length: 12 }, (_, i) => {
                const deg = i * 30;
                const a = degToRad(deg - 90);
                const x1 = CX + (R_RING - 10) * Math.cos(a);
                const y1 = CY + (R_RING - 10) * Math.sin(a);
                const x2 = CX + R_RING * Math.cos(a);
                const y2 = CY + R_RING * Math.sin(a);
                return (
                  <Line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              })}

              {/* Cardinal: N, E, S, W */}
              {[
                { text: "N", angle: 0 },
                { text: "E", angle: 90 },
                { text: "S", angle: 180 },
                { text: "W", angle: 270 },
              ].map(({ text, angle }) => {
                const a = degToRad(angle - 90);
                const r = R_LABELS;
                const x = CX + r * Math.cos(a);
                const y = CY + r * Math.sin(a);
                return (
                  <SvgText
                    key={text}
                    x={x}
                    y={y}
                    fill="#fff"
                    fontSize={14}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {text}
                  </SvgText>
                );
              })}

              {/* Center dot */}
              <Circle cx={CX} cy={CY} r={6} fill="#fff" />
            </G>

            {/* Needle – fixed (red North up, grey South down), no image */}
            <G>
              <Polygon
                points={`${CX},${CY - 70} ${CX - 10},${CY} ${CX},${CY - 8} ${CX + 10},${CY}`}
                fill="#E53935"
              />
              <Polygon
                points={`${CX},${CY + 70} ${CX - 10},${CY} ${CX},${CY + 8} ${CX + 10},${CY}`}
                fill="#78909C"
              />
              <Circle cx={CX} cy={CY} r={8} fill="#ECEFF1" />
            </G>
          </Svg>

          {/* Kaaba icon overlay – points toward Qibla (21.4225° N, 39.8262° E) */}
          {qiblaAngle != null && (
            <View
              style={[
                compassStyles.qiblaIconOverlay,
                { transform: [{ rotate: `${qiblaAngle}deg` }] },
              ]}
              pointerEvents="none"
            >
              <Image
                source={require("@/assets/images/Kaaba.png")}
                style={compassStyles.qiblaIcon}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        <Text style={compassStyles.qiblaLabel}>
          Qibla: 21.4225° N, 39.8262° E
        </Text>
        {distanceKm != null && (
          <Text style={compassStyles.distanceText}>
            Distance:{" "}
            {distanceKm.toLocaleString(undefined, { maximumFractionDigits: 0 })}{" "}
            km
          </Text>
        )}

        <View style={compassStyles.coordsRow}>
          <Text style={compassStyles.coordsLabel}>Current location: </Text>
          <Text style={compassStyles.coordsValue} numberOfLines={1}>
            {locationError
              ? locationError
              : userCoords
                ? `${userCoords.lat.toFixed(4)}° N, ${userCoords.lon.toFixed(4)}° E`
                : "Getting…"}
          </Text>
        </View>

        <View style={compassStyles.keyRow}>
          <View style={compassStyles.keyItem}>
            <View style={[compassStyles.keyDot, compassStyles.keyDotNeedle]} />
            <Text style={compassStyles.keyText}>Needle: North/South</Text>
          </View>
          <View style={compassStyles.keyItem}>
            <Image
              source={require("@/assets/images/Kaaba.png")}
              style={compassStyles.keyIcon}
              resizeMode="contain"
            />
            <Text style={compassStyles.keyText}>Qibla direction</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const KABA_ICON_SIZE = 26;
const KABA_OFFSET = R_RING + 150;

const compassStyles = StyleSheet.create({
  compassBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  compassSvgWrap: {
    width: SIZE,
    height: SIZE,
    position: "relative",
  },
  qiblaIconOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  qiblaIcon: {
    width: KABA_ICON_SIZE,
    height: KABA_ICON_SIZE,
    marginBottom: KABA_OFFSET,
  },
  qiblaLabel: {
    fontSize: 11,
    color: "#687076",
    marginTop: 8,
  },
  distanceText: {
    fontSize: 13,
    color: "#11181C",
    fontWeight: "600",
    marginTop: 4,
  },
  coordsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },
  coordsLabel: {
    fontSize: 12,
    color: "#687076",
  },
  coordsValue: {
    fontSize: 12,
    color: "#11181C",
    fontWeight: "600",
  },
  keyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  keyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  keyDotNeedle: {
    backgroundColor: "#E53935",
  },
  keyIcon: {
    width: 16,
    height: 16,
  },
  keyText: {
    fontSize: 11,
    color: "#687076",
  },
});

export default Compass;
