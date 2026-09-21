import React from "react";
import { Redirect } from "expo-router";

/**
 * OKA CONTROL 2.0
 * The native app opens directly into the operational product.
 * Public marketing remains on oka-bau.eu and is intentionally not duplicated here.
 */
export default function AppEntry() {
  return <Redirect href="/(tabs)/mein-projekt" />;
}
