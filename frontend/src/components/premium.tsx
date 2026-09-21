import React, { createContext, useContext, useEffect, useRef } from "react";
import {
  Pressable,
  Text,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { ArrowRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { fonts, useTheme } from "@/src/theme";

type RevealContextValue = {
  scrollY: SharedValue<number>;
  viewportHeight: number;
};

const RevealContext = createContext<RevealContextValue | null>(null);

export function RevealProvider({
  scrollY,
  viewportHeight,
  children,
}: RevealContextValue & { children: React.ReactNode }) {
  return (
    <RevealContext.Provider value={{ scrollY, viewportHeight }}>
      {children}
    </RevealContext.Provider>
  );
}

function useVisibilityTrigger(delay = 0) {
  const ctx = useContext(RevealContext);
  const fallbackScroll = useSharedValue(0);
  const scrollY = ctx?.scrollY ?? fallbackScroll;
  const viewportHeight = ctx?.viewportHeight ?? 1000;
  const ref = useRef<any>(null);
  const documentY = useSharedValue(1_000_000);
  const active = useSharedValue(0);
  const reduced = useReducedMotion();

  const measure = () => {
    requestAnimationFrame(() => {
      ref.current?.measureInWindow?.((_x: number, y: number) => {
        documentY.value = y + scrollY.value;
      });
    });
  };

  useEffect(() => {
    if (reduced) active.value = 1;
  }, [reduced, active]);

  useAnimatedReaction(
    () => scrollY.value + viewportHeight * 0.92 >= documentY.value,
    (visible, wasVisible) => {
      if (visible && !wasVisible && active.value === 0) {
        active.value = withDelay(
          delay,
          withTiming(1, {
            duration: reduced ? 1 : 800,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          }),
        );
      }
    },
    [delay, viewportHeight, reduced],
  );

  return { ref, active, measure };
}

export function Reveal({
  children,
  delay = 0,
  style,
  testID,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { ref, active, measure } = useVisibilityTrigger(delay);
  const anim = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ translateY: 28 * (1 - active.value) }],
  }));
  return (
    <Animated.View ref={ref} onLayout={measure} testID={testID} style={[anim, style]}>
      {children}
    </Animated.View>
  );
}

function Word({
  text,
  index,
  active,
  style,
}: {
  text: string;
  index: number;
  active: SharedValue<number>;
  style?: StyleProp<TextStyle>;
}) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);

  useAnimatedReaction(
    () => active.value,
    (isActive) => {
      if (isActive > 0 && p.value === 0) {
        p.value = withDelay(
          reduced ? 0 : index * 70,
          withTiming(1, {
            duration: reduced ? 1 : 550,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          }),
        );
      }
    },
    [index, reduced],
  );

  const anim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: 18 * (1 - p.value) }],
  }));

  return (
    <Animated.View style={anim}>
      <Text style={style}>{text} </Text>
    </Animated.View>
  );
}

export function WordRevealHeading({
  text,
  delay = 0,
  style,
  testID,
}: {
  text: string;
  delay?: number;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const { ref, active, measure } = useVisibilityTrigger(delay);
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);

  return (
    <View ref={ref} onLayout={measure} testID={testID} style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {words.map((word, index) => (
        <Word key={`${word}-${index}`} text={word} index={index} active={active} style={style} />
      ))}
    </View>
  );
}

export function StrokeIcon({
  icon,
  size = 24,
  color = "#111111",
}: {
  icon: any;
  size?: number;
  color?: string;
}) {
  return <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={1.5} />;
}

export function ArrowPillButton({
  label,
  onPress,
  inverse = false,
  testID,
}: {
  label: string;
  onPress?: () => void;
  inverse?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = inverse ? colors.surfaceInverse : colors.surfaceSecondary;
  const fg = inverse ? colors.onSurfaceInverse : colors.onSurface;
  const circleBg = inverse ? colors.surfaceSecondary : colors.surfaceInverse;
  const circleFg = inverse ? colors.onSurface : colors.onSurfaceInverse;

  return (
    <Animated.View style={anim}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.98, { duration: 120 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 180 }))}
        style={{
          minHeight: 52,
          paddingLeft: 22,
          paddingRight: 8,
          borderRadius: 999,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: inverse ? colors.surfaceInverse : "rgba(255,255,255,0.75)",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          alignSelf: "flex-start",
        }}
      >
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: fg }}>
          {label}
        </Text>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: circleBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StrokeIcon icon={ArrowUpRight01Icon} size={19} color={circleFg} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ZoomImage({
  source,
  style,
  contentFit = "cover",
}: {
  source: any;
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onHoverIn={() => (scale.value = withTiming(1.06, { duration: 1000 }))}
      onHoverOut={() => (scale.value = withTiming(1, { duration: 1000 }))}
      onPressIn={() => (scale.value = withTiming(1.02, { duration: 180 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 300 }))}
      style={[{ overflow: "hidden" }, style]}
    >
      <Animated.View style={[{ width: "100%", height: "100%" }, anim]}>
        <Image source={source} style={{ width: "100%", height: "100%" }} contentFit={contentFit} transition={300} />
      </Animated.View>
    </Pressable>
  );
}

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: fonts.bold,
        fontSize: 13,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: light ? colors.onSurfaceInverse : colors.onSurface,
      }}
    >
      {children}
    </Text>
  );
}


export function PremiumHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 88,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceSecondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ transform: [{ rotate: "180deg" }] }}>
          <StrokeIcon icon={ArrowRight01Icon} size={20} color={colors.onSurface} />
        </View>
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.semibold,
            fontSize: 18,
            lineHeight: 23,
            color: colors.onSurface,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.regular,
              fontSize: 13,
              lineHeight: 18,
              color: colors.muted,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
