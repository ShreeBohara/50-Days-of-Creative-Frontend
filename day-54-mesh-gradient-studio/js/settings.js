export const SETTING_RANGES = {
  speed: { min: 0, max: 2 },
  size: { min: 0.7, max: 1.5 },
  grain: { min: 0, max: 0.2 },
};

export function setNumericSetting(scene, key, value) {
  const range = SETTING_RANGES[key];
  if (!range) throw new Error(`Unknown numeric setting: ${key}`);
  const parsed = Number.parseFloat(value);
  const safeValue = Number.isFinite(parsed) ? parsed : scene.settings[key];
  scene.settings[key] = Math.min(range.max, Math.max(range.min, safeValue));
  return scene.settings[key];
}
