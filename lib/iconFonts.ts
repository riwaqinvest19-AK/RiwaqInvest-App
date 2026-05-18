import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/** Primary font-family names from @expo/vector-icons createIconSet. */
export const ICON_FONT_FAMILIES = {
  ionicons: 'ionicons',
  material: 'material',
  fontAwesome: 'FontAwesome',
  materialCommunity: 'material-community',
} as const;

/** Extra names sometimes referenced on web — same TTF, multiple @font-face entries. */
const FONT_FAMILY_ALIASES: Record<string, string[]> = {
  [ICON_FONT_FAMILIES.ionicons]: ['ionicons', 'Ionicons'],
  [ICON_FONT_FAMILIES.material]: ['material', 'MaterialIcons', 'Material Icons'],
  [ICON_FONT_FAMILIES.fontAwesome]: ['FontAwesome'],
  [ICON_FONT_FAMILIES.materialCommunity]: ['material-community', 'MaterialCommunityIcons'],
};

/** Bundled TTFs — keys must match @expo/vector-icons font family names. */
export const ICON_FONT_MAP = {
  [ICON_FONT_FAMILIES.ionicons]: require('../assets/fonts/icons/Ionicons.ttf'),
  [ICON_FONT_FAMILIES.material]: require('../assets/fonts/icons/MaterialIcons.ttf'),
  [ICON_FONT_FAMILIES.fontAwesome]: require('../assets/fonts/icons/FontAwesome.ttf'),
  [ICON_FONT_FAMILIES.materialCommunity]: require('../assets/fonts/icons/MaterialCommunityIcons.ttf'),
};

const WEB_ICON_FONT_MODULES: Array<{ family: string; module: number }> = [
  { family: ICON_FONT_FAMILIES.ionicons, module: ICON_FONT_MAP[ICON_FONT_FAMILIES.ionicons] },
  { family: ICON_FONT_FAMILIES.material, module: ICON_FONT_MAP[ICON_FONT_FAMILIES.material] },
  { family: ICON_FONT_FAMILIES.fontAwesome, module: ICON_FONT_MAP[ICON_FONT_FAMILIES.fontAwesome] },
  {
    family: ICON_FONT_FAMILIES.materialCommunity,
    module: ICON_FONT_MAP[ICON_FONT_FAMILIES.materialCommunity],
  },
];

const WEB_ICON_STYLE_ID = 'riwaq-vector-icon-fonts';

/** All family strings used when waiting for document.fonts on Safari/iOS web. */
export function getAllIconFontFamilyNames(): string[] {
  const names = new Set<string>();
  for (const aliases of Object.values(FONT_FAMILY_ALIASES)) {
    for (const alias of aliases) names.add(alias);
  }
  return [...names];
}

/**
 * Static export (Netlify): register @font-face in HTML during SSR.
 * Must run at module load — see app/_layout.tsx.
 */
export function registerIconFontsForStaticRender(): void {
  if (typeof window === 'undefined') {
    Font.loadAsync(ICON_FONT_MAP);
  }
}

/**
 * Safari / iOS web: inject @font-face aliases and wait until fonts are paint-ready.
 */
async function injectWebIconFontFaces(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const existing = document.getElementById(WEB_ICON_STYLE_ID);
  if (existing) existing.remove();

  const rules: string[] = [];
  for (const { family, module } of WEB_ICON_FONT_MODULES) {
    const asset = Asset.fromModule(module);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    const uri = asset.uri;
    const aliases = FONT_FAMILY_ALIASES[family] ?? [family];
    for (const alias of aliases) {
      rules.push(
        `@font-face{font-family:'${alias}';src:url('${uri}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}`,
      );
    }
  }

  const style = document.createElement('style');
  style.id = WEB_ICON_STYLE_ID;
  style.textContent = rules.join('\n');
  document.head.appendChild(style);
}

/** Wait for fonts on iOS Safari (expo-font skips FontFaceObserver there). */
async function waitForWebIconFontsPaintReady(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const families = getAllIconFontFamilyNames();
  if (document.fonts?.load) {
    await Promise.all(
      families.map((family) =>
        document.fonts!.load(`24px '${family}'`).catch(() => undefined),
      ),
    );
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
}

/** Load icon fonts + web injection; call after useFonts on client. */
export async function finalizeWebIconFonts(): Promise<void> {
  if (Platform.OS !== 'web') return;
  await Promise.all([
    FontAwesome.loadFont(),
    Ionicons.loadFont(),
    MaterialIcons.loadFont(),
    MaterialCommunityIcons.loadFont(),
  ]);
  await injectWebIconFontFaces();
  await waitForWebIconFontsPaintReady();
}

/** Native + web: load all vector icon font files. */
export async function ensureIconFontsLoaded(): Promise<void> {
  await Font.loadAsync(ICON_FONT_MAP);
  await finalizeWebIconFonts();
}
