import React from "react";
import { View, LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { makeStyles, useTheme } from "@/src/theme";

const useStyles = makeStyles((c) => ({
  track: { height: 44, justifyContent: "center" },
  line: { height: 4, borderRadius: 2, backgroundColor: c.surfaceTertiary },
  fill: { position: "absolute", left: 0, height: 4, borderRadius: 2, backgroundColor: c.brandPrimary },
  knob: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: c.surfaceInverse, borderWidth: 3, borderColor: c.surfaceSecondary, top: 8 },
}));

/** Minimal gesture slider (0..1) used for the 3D timeline and the before/after comparison. */
export default function Slider({ value, onChange, testID }: { value: number; onChange: (v: number) => void; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  const width = useSharedValue(1);
  const x = useSharedValue(value);
  const commit = (v: number) => {
    onChange(v);
  };
  const haptic = () => Haptics.selectionAsync().catch(() => {});
  const pan = Gesture.Pan()
    .onBegin((e) => {
      x.value = Math.min(1, Math.max(0, e.x / width.value));
      runOnJS(commit)(x.value);
    })
    .onUpdate((e) => {
      x.value = Math.min(1, Math.max(0, e.x / width.value));
      runOnJS(commit)(x.value);
    })
    .onEnd(() => runOnJS(haptic)());
  const knob = useAnimatedStyle(() => ({ left: x.value * width.value - 14 }));
  const fill = useAnimatedStyle(() => ({ width: x.value * width.value }));
  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
    x.value = value;
  };
  return (
    <GestureDetector gesture={pan}>
      <View style={s.track} onLayout={onLayout} testID={testID}>
        <View style={s.line} />
        <Animated.View style={[s.fill, fill]} />
        <Animated.View style={[s.knob, knob, { shadowColor: colors.nearBlack, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }]} />
      </View>
    </GestureDetector>
  );
}
