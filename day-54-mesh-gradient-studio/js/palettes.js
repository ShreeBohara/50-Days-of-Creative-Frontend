export const PALETTES = [
  {
    id: "sunset",
    name: "Sunset",
    baseColor: "#1A0B2E",
    colors: ["#FF4D8D", "#FF7A59", "#FFC857", "#7B61FF", "#FF99C8", "#F15BB5"],
  },
  {
    id: "deep-sea",
    name: "Deep Sea",
    baseColor: "#031927",
    colors: ["#006D77", "#00A8E8", "#00F5D4", "#3A86FF", "#48CAE4", "#90E0EF"],
  },
  {
    id: "acid",
    name: "Acid",
    baseColor: "#091307",
    colors: ["#D7FF00", "#7CFF00", "#00FFA3", "#F7FF00", "#FF5D00", "#A7FF1A"],
  },
  {
    id: "pastel-dawn",
    name: "Pastel Dawn",
    baseColor: "#75648A",
    colors: ["#FFB7C5", "#FFD6A5", "#BDE0FE", "#CDB4DB", "#A8E6CF", "#FDE2E4"],
  },
  {
    id: "ember",
    name: "Ember",
    baseColor: "#1A0703",
    colors: ["#D00000", "#FF3D00", "#FF6D00", "#FF9E00", "#FFB000", "#FFCF40"],
  },
  {
    id: "aurora",
    name: "Aurora",
    baseColor: "#061A24",
    colors: ["#00F5D4", "#64DFDF", "#4EA8DE", "#7B2CBF", "#C77DFF", "#80FFDB"],
  },
  {
    id: "mono-blue",
    name: "Mono Blue",
    baseColor: "#06162E",
    colors: ["#0A4D8C", "#0E7AC4", "#1D4ED8", "#38BDF8", "#7DD3FC", "#A5F3FC"],
  },
  {
    id: "candy",
    name: "Candy",
    baseColor: "#26102F",
    colors: ["#FF70A6", "#FF9770", "#FFD670", "#E9FF70", "#70D6FF", "#C77DFF"],
  },
];

export function getPalette(id) {
  return PALETTES.find((palette) => palette.id === id) || PALETTES[0];
}

export function applyPalette(scene, id) {
  const palette = getPalette(id);
  scene.presetId = palette.id;
  scene.baseColor = palette.baseColor;
  scene.points.forEach((point, index) => {
    point.color = palette.colors[index];
  });
  return palette;
}
