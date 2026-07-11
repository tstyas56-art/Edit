import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import CreateChapterScreen from './screens/CreateChapterScreen';
import ChapterScreen from './screens/ChapterScreen';
import EditorScreen from './screens/EditorScreen';
import SettingsScreen from './screens/SettingsScreen';

const NavigationContext = createContext(null);

function parseRoute(path) {
  if (!path || path === '/') return { name: 'home', params: {} };
  const parts = String(path).replace(/^\//, '').split('/');
  if (parts[0] === 'create') return { name: 'create', params: {} };
  if (parts[0] === 'settings') return { name: 'settings', params: {} };
  if (parts[0] === 'chapter') return { name: 'chapter', params: { id: parts[1] } };
  if (parts[0] === 'editor') return { name: 'editor', params: { id: parts[1] } };
  return { name: 'home', params: {} };
}

function screenForRoute(name) {
  switch (name) {
    case 'create': return CreateChapterScreen;
    case 'settings': return SettingsScreen;
    case 'chapter': return ChapterScreen;
    case 'editor': return EditorScreen;
    default: return HomeScreen;
  }
}

export function NavigationProvider() {
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const route = stack[stack.length - 1];

  const router = useMemo(() => ({
    push(path) {
      setStack(current => [...current, parseRoute(path)]);
    },
    replace(path) {
      setStack(current => [...current.slice(0, -1), parseRoute(path)]);
    },
    back() {
      setStack(current => (current.length > 1 ? current.slice(0, -1) : current));
    },
  }), []);

  const value = useMemo(() => ({ router, params: route.params, route }), [router, route]);
  const Screen = screenForRoute(route.name);

  return (
    <NavigationContext.Provider value={value}>
      <Screen />
    </NavigationContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useRouter must be used inside NavigationProvider');
  return ctx.router;
}

export function useLocalSearchParams() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useLocalSearchParams must be used inside NavigationProvider');
  return ctx.params;
}

export function useFocusEffect(effect) {
  const ctx = useContext(NavigationContext);
  const stableEffect = useCallback(effect, [effect, ctx?.route?.name, JSON.stringify(ctx?.params || {})]);
  React.useEffect(() => stableEffect(), [stableEffect]);
}
