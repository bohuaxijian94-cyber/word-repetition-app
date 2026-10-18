import { useEffect, useRef, useState } from "react";
import { isDemo } from "./demo";
import {
  dayKey,
  defaultSettings,
  type Settings,
  type Practice,
  type Night,
  type LearningBackup,
} from "./learning";
const prefix = isDemo ? "mon-francais-demo:" : "mon-francais:";
export function stored<T>(name: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem(prefix + name) || "null") ?? fallback
    );
  } catch {
    return fallback;
  }
}
export function saveStored(name: string, value: unknown) {
  localStorage.setItem(prefix + name, JSON.stringify(value));
}
export function useLearning() {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...defaultSettings,
    ...stored<Partial<Settings>>("settings", {}),
  }));
  const [practice, setPractice] = useState<Practice[]>(() =>
    stored("practice", []),
  );
  const [night, setNight] = useState<Night | null>(() => stored("night", null));
  const [listeningDays, setListeningDays] = useState<string[]>(() =>
    stored("listeningDays", []),
  );
  const [reminder, setReminder] = useState("");
  const reminded = useRef(new Set<string>());
  useEffect(() => {
    if (!settings.reminders) return;
    const check = () => {
      const d = new Date();
      const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      for (const [at, message, kind] of [
        [settings.wake, "朝の5分。起床後ブースターを始めましょう。", "morning"],
        [
          settings.bed,
          "寝る前の5分。今日覚えた言葉を思い出しましょう。",
          "night",
        ],
      ]) {
        const key = "reminded:" + dayKey() + ":" + kind;
        if (time !== at || reminded.current.has(key) || stored(key, false))
          continue;
        reminded.current.add(key);
        try {
          saveStored(key, true);
        } catch {
          /* In-app reminders still work without storage. */
        }
        setReminder(message);
        if ("Notification" in window && Notification.permission === "granted") {
          void (async () => {
            try {
              const registration =
                await navigator.serviceWorker?.getRegistration();
              if (registration?.active)
                await registration.showNotification("Mon Français", {
                  body: message,
                  tag: kind,
                });
              else
                new Notification("Mon Français", { body: message, tag: kind });
            } catch {
              /* The visible reminder is the fallback. */
            }
          })();
        }
      }
    };
    check();
    const interval = window.setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [settings]);
  const updateSettings = (value: Settings) => {
    saveStored("settings", value);
    setSettings(value);
  };
  const addPractice = (value: Practice) => {
    const next = [...practice, value];
    saveStored("practice", next);
    setPractice(next);
  };
  const saveNight = (value: Night) => {
    saveStored("night", value);
    setNight(value);
  };
  const restore = (value: LearningBackup) => {
    const values = {
      settings: value.settings,
      practice: value.practice,
      night: value.night,
      listeningDays: value.listeningDays || [],
    };
    const old = new Map(
      Object.keys(values).map((key) => [
        key,
        localStorage.getItem(prefix + key),
      ]),
    );
    try {
      for (const [key, data] of Object.entries(values)) saveStored(key, data);
    } catch (error) {
      for (const [key, data] of old) {
        try {
          if (data === null) localStorage.removeItem(prefix + key);
          else localStorage.setItem(prefix + key, data);
        } catch {
          /* Report original storage failure. */
        }
      }
      throw error;
    }
    setSettings(value.settings);
    setPractice(value.practice);
    setNight(value.night);
    setListeningDays(value.listeningDays || []);
  };
  const reset = () => {
    reminded.current.clear();
    for (const key of Object.keys(localStorage))
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    setSettings(defaultSettings);
    setPractice([]);
    setNight(null);
    setListeningDays([]);
    setReminder("");
  };
  const markListening = () => {
    const next = [...new Set([...listeningDays, dayKey()])];
    saveStored("listeningDays", next);
    setListeningDays(next);
  };
  return {
    listeningDays,
    markListening,
    settings,
    updateSettings,
    practice,
    addPractice,
    night,
    saveNight,
    reminder,
    setReminder,
    reset,
    restore,
  };
}
