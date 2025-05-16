// Keep track of used colors to ensure no duplicates
const usedColors = new Set();
// Keep track of last used color to avoid similar colors
let lastUsedColor = null;

// Function to generate a random color
export function getRandomColor() {
  // Predefined list of colors that work well with dark theme
  const colors = [
    "#4287f5", // blue
    "#f54242", // red
    "#42f5a7", // green
    "#f542f2", // pink
    "#f5d442", // yellow
    "#42f5f5", // cyan
    "#f59642", // orange
    "#a742f5", // purple
    "#5af542", // lime
    "#f54775", // rose
    "#42c5f5", // sky blue
    "#f5a142", // amber
    "#4842f5", // indigo
    "#42f56c", // emerald
    "#f542a1", // fuchsia
  ];

  // Find an unused color that's not too similar to the last one
  let color;
  do {
    color = colors[Math.floor(Math.random() * colors.length)];
    // If we have a last color, make sure the new one is different enough
    if (lastUsedColor && areSimilarColors(color, lastUsedColor)) {
      continue;
    }
  } while (usedColors.has(color) && usedColors.size < colors.length);

  // If all colors are used, reset the set
  if (usedColors.size >= colors.length) {
    usedColors.clear();
  }

  // Mark as used and update last used color
  usedColors.add(color);
  lastUsedColor = color;
  return color;
}

// Helper function to check if two colors are too similar
function areSimilarColors(color1, color2) {
  // Simple check - if the first 3 characters after # are the same, colors might be similar
  return color1.substring(1, 4) === color2.substring(1, 4);
}
