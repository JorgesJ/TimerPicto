import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useScale } from './src/useScale';
import { Ring } from './src/Ring';
import { startAlarm, stopAlarm } from './src/alarm';
import { setupNotifications, scheduleEnd, cancelEnd } from './src/notify';

type Status = 'idle' | 'running' | 'paused' | 'finished';

const pad = (n: number) => String(n).padStart(2, '0');

function format(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type StepperProps = {
  label: string;
  value: number;
  max: number;
  size: number;
  disabled: boolean;
  onChange: (v: number) => void;
};

function Stepper({ label, value, max, size, disabled, onChange }: StepperProps) {
  const btn = size;
  const dec = () => onChange(value <= 0 ? max : value - 1);
  const inc = () => onChange(value >= max ? 0 : value + 1);
  const round = {
    width: btn,
    height: btn,
    borderRadius: btn / 2,
    opacity: disabled ? 0.35 : 1,
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.label, { fontSize: Math.max(12, Math.round(btn * 0.36)) }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Math.round(btn * 0.12) }}>
        <Pressable disabled={disabled} onPress={dec} style={[styles.round, round]}>
          <Text style={[styles.roundText, { fontSize: Math.round(btn * 0.55) }]}>−</Text>
        </Pressable>
        <Text style={[styles.value, { fontSize: Math.round(btn * 0.75), minWidth: Math.round(btn * 1.3) }]}>{pad(value)}</Text>
        <Pressable disabled={disabled} onPress={inc} style={[styles.round, round]}>
          <Text style={[styles.roundText, { fontSize: Math.round(btn * 0.55) }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

type ActionProps = {
  text: string;
  color: string;
  enabled: boolean;
  onPress: () => void;
  flex?: boolean;
};

function Action({ text, color, enabled, onPress, flex }: ActionProps) {
  const { s } = useScale();
  return (
    <Pressable
      disabled={!enabled}
      onPress={onPress}
      style={[
        styles.action,
        {
          backgroundColor: enabled ? color : '#1b2a4a',
          paddingVertical: s(16, 22),
          borderRadius: s(18, 24),
          opacity: enabled ? 1 : 0.55,
        },
        flex ? { flex: 1 } : null,
      ]}
    >
      <Text style={[styles.actionText, { fontSize: s(18, 26) }]}>{text}</Text>
    </Pressable>
  );
}

function Timer() {
  const { width: sw, height: sh, s } = useScale();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const width = box ? box.w : sw;
  const height = box ? box.h : sh;
  const isLandscape = width > height;
  const onBox = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setBox((p) => (p && p.w === w && p.h === h ? p : { w, h }));
  };
  const insets = useSafeAreaInsets();
  const pad = s(16, isLandscape ? 24 : 28);
  const gap = s(10, 22);
  const bottomPad = Math.max(insets.bottom, 34) + s(24, 32);
  const availW = isLandscape ? ((width - 2 * pad) * 1.1) / 2.1 : width - 2 * pad;
  const stepSize = Math.floor(Math.min((availW - 2 * gap) / 3 / 3.3, s(44, 56)));
  const [h, setH] = useState(0);
  const [m, setM] = useState(5);
  const [sec, setSec] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [remaining, setRemaining] = useState(0);
  const [runTotal, setRunTotal] = useState(0);
  const endAt = useRef(0);
  const notifId = useRef<string | null>(null);

  const total = h * 3600 + m * 60 + sec;

  useEffect(() => {
    setupNotifications();
  }, []);

  const finish = useCallback(() => {
    setStatus('finished');
    setRemaining(0);
    deactivateKeepAwake();
    startAlarm();
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const left = Math.ceil((endAt.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        finish();
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(id);
  }, [status, finish]);

  const start = async () => {
    const rem = status === 'paused' ? remaining : total;
    if (rem <= 0) return;
    if (status === 'idle') setRunTotal(rem);
    endAt.current = Date.now() + rem * 1000;
    setRemaining(rem);
    setStatus('running');
    activateKeepAwakeAsync();
    notifId.current = await scheduleEnd(rem);
  };

  const pause = async () => {
    const left = Math.max(1, Math.ceil((endAt.current - Date.now()) / 1000));
    setRemaining(left);
    setStatus('paused');
    deactivateKeepAwake();
    await cancelEnd(notifId.current);
    notifId.current = null;
  };

  const stop = async () => {
    stopAlarm();
    setStatus('idle');
    setRemaining(0);
    deactivateKeepAwake();
    await cancelEnd(notifId.current);
    notifId.current = null;
  };

  const shown = status === 'idle' ? total : remaining;
  const progress =
    status === 'idle' ? 1 : status === 'finished' ? 0 : runTotal > 0 ? remaining / runTotal : 0;
  const label =
    status === 'idle'
      ? 'Listo'
      : status === 'running'
        ? 'En marcha'
        : status === 'paused'
          ? 'En pausa'
          : '¡Tiempo!';

  const ringSize = isLandscape
    ? Math.min(height * 0.82, width * 0.45)
    : Math.min(width * 0.8, height * 0.42);

  const locked = status !== 'idle';

  const steppers = (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.title, { fontSize: s(18, 24), marginBottom: s(8, 12) }]}>Ajusta el tiempo:</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap }}>
        <Stepper label="Horas" value={h} max={23} size={stepSize} disabled={locked} onChange={setH} />
        <Stepper label="Minutos" value={m} max={59} size={stepSize} disabled={locked} onChange={setM} />
        <Stepper label="Segundos" value={sec} max={59} size={stepSize} disabled={locked} onChange={setSec} />
      </View>
    </View>
  );

  const ring = (
    <Ring size={ringSize} progress={progress}>
      <Text style={[styles.time, { fontSize: ringSize * (shown >= 3600 ? 0.17 : 0.22) }]}>{format(shown)}</Text>
      <Text style={[styles.status, { fontSize: ringSize * 0.075 }]}>{label}</Text>
    </Ring>
  );

  const actions = (
    <View style={{ flexDirection: 'row', gap: s(10, 16), width: '100%', paddingBottom: bottomPad }}>
      <Action
        text={status === 'paused' ? '▶ Reanudar' : '▶ Empezar'}
        color="#10b981"
        enabled={(status === 'idle' && total > 0) || status === 'paused'}
        onPress={start}
        flex
      />
      <Action text="⏸ Pausa" color="#f59e0b" enabled={status === 'running'} onPress={pause} flex />
      <Action
        text="⏹ Detener"
        color={status === 'finished' ? '#ef4444' : '#64748b'}
        enabled={status !== 'idle'}
        onPress={stop}
        flex
      />
    </View>
  );

  if (isLandscape) {
    return (
      <View onLayout={onBox} style={[styles.fill, { flexDirection: 'row', paddingTop: pad, paddingHorizontal: pad, paddingBottom: pad, alignItems: 'center' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{ring}</View>
        <View style={{ flex: 1.1, justifyContent: 'space-around', alignItems: 'center', height: '100%', gap: s(12, 20) }}>
          {steppers}
          {actions}
        </View>
      </View>
    );
  }

  return (
    <View onLayout={onBox} style={[styles.fill, { paddingTop: pad, paddingHorizontal: pad, paddingBottom: pad, justifyContent: 'space-between', alignItems: 'center' }]}>
      {steppers}
      {ring}
      {actions}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <Timer />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1b3d' },
  fill: { flex: 1 },
  title: { color: '#a8b3d1', textAlign: 'center' },
  label: { color: '#a8b3d1' },
  value: { color: '#ffffff', fontWeight: '800', textAlign: 'center' },
  round: { backgroundColor: '#2b3957', alignItems: 'center', justifyContent: 'center' },
  roundText: { color: '#ffffff', fontWeight: '700' },
  time: { color: '#ffffff', fontWeight: '800', fontVariant: ['tabular-nums'] },
  status: { color: '#a8b3d1', marginTop: 6 },
  action: { alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#ffffff', fontWeight: '800' },
});
