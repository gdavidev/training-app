import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { queryClient } from "../hooks/query/queryClient";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function initDatabase() {
      try {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
        }
        setDbReady(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    }

    initDatabase();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1e1e1e" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1e1e1e" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="add-exercise"
          options={{ title: "Add Exercise", presentation: "modal" }}
        />
        <Stack.Screen
          name="add-preset"
          options={{ title: "Add Preset", presentation: "modal" }}
        />
        <Stack.Screen
          name="training-details"
          options={{ title: "Training Details" }}
        />
        <Stack.Screen
          name="manage-exercises"
          options={{ title: "My Exercises" }}
        />
        <Stack.Screen
          name="manage-presets"
          options={{ title: "My Presets" }}
        />
        <Stack.Screen
          name="training-execution"
          options={{ title: "Training" }}
        />
      </Stack>
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}