/**
 * Demo Image Generation Script for SnackCheck
 * 
 * This script provides instructions and utilities for generating
 * high-quality demo food label images for hackathon presentations.
 * 
 * Since we cannot generate actual images programmatically in this environment,
 * this file serves as documentation for the required demo assets.
 */

const demoImageRequirements = {
  "protein-bar-label.jpg": {
    description: "High-quality protein bar with clean ingredients",
    suggestedText: "INGREDIENTS: Whey protein isolate, almonds, dates, coconut oil, natural vanilla flavor, stevia leaf extract.",
    dimensions: "800x600px minimum",
    format: "JPEG, high quality",
    lighting: "Even, bright lighting to ensure OCR readability",
    angle: "Straight-on view of ingredients list",
    background: "Clean, neutral background"
  },
  
  "instant-noodles-label.jpg": {
    description: "Instant noodles with artificial additives (low health score example)",
    suggestedText: "INGREDIENTS: Enriched wheat flour, palm oil, salt, monosodium glutamate, sodium phosphate, artificial chicken flavor, yellow 6, red 40.",
    dimensions: "800x600px minimum",
    format: "JPEG, high quality",
    lighting: "Even, bright lighting to ensure OCR readability",
    angle: "Straight-on view of ingredients list",
    background: "Clean, neutral background"
  },
  
  "organic-soup-label.jpg": {
    description: "Organic soup with natural ingredients (high health score example)",
    suggestedText: "INGREDIENTS: Organic tomatoes, organic onions, organic carrots, organic celery, organic garlic, sea salt, organic basil, organic oregano.",
    dimensions: "800x600px minimum",
    format: "JPEG, high quality",
    lighting: "Even, bright lighting to ensure OCR readability",
    angle: "Straight-on view of ingredients list",
    background: "Clean, neutral background"
  },
  
  "energy-drink-label.jpg": {
    description: "Energy drink with artificial ingredients (low health score example)",
    suggestedText: "INGREDIENTS: Carbonated water, high fructose corn syrup, taurine, caffeine, artificial flavors, sodium benzoate, potassium sorbate, yellow 5, blue 1.",
    dimensions: "800x600px minimum",
    format: "JPEG, high quality",
    lighting: "Even, bright lighting to ensure OCR readability",
    angle: "Straight-on view of ingredients list",
    background: "Clean, neutral background"
  },
  
  "trail-mix-label.jpg": {
    description: "Trail mix with mixed ingredients (moderate health score example)",
    suggestedText: "INGREDIENTS: Almonds, cashews, raisins, dried cranberries (cranberries, sugar, sunflower oil), dark chocolate chips (cocoa, sugar, cocoa butter).",
    dimensions: "800x600px minimum",
    format: "JPEG, high quality",
    lighting: "Even, bright lighting to ensure OCR readability",
    angle: "Straight-on view of ingredients list",
    background: "Clean, neutral background"
  }
};

/**
 * Instructions for creating demo images
 */
const creationInstructions = `
DEMO IMAGE CREATION INSTRUCTIONS:

1. PHOTOGRAPHY SETUP:
   - Use a smartphone or camera with good resolution (minimum 8MP)
   - Ensure even, bright lighting (natural daylight preferred)
   - Use a clean, neutral background (white or light gray)
   - Position camera directly above or in front of the ingredients list
   - Ensure the text is sharp and clearly readable

2. PRODUCT SELECTION:
   - Choose products that match the ingredient lists in demo-data.json
   - Ensure ingredients list is clearly visible and unobstructed
   - Avoid products with damaged or worn labels
   - Select products that represent different health score ranges

3. IMAGE PROCESSING:
   - Crop images to focus on the ingredients list
   - Adjust brightness/contrast if needed for OCR readability
   - Save as high-quality JPEG files
   - Name files exactly as specified in demo-data.json

4. TESTING:
   - Test each image with the OCR service to ensure readability
   - Verify that extracted text matches expected ingredients
   - Confirm health scores align with expectations

5. FALLBACK STRATEGY:
   - If real product photos are not available, create mock labels
   - Use design tools to create realistic-looking ingredient lists
   - Ensure text is in a standard font (Arial, Helvetica) for OCR compatibility
   - Include typical food label formatting and layout

CURRENT STATUS:
- 5 existing demo images (cereal, snack bar, yogurt, crackers, juice)
- 5 additional images needed (protein bar, instant noodles, organic soup, energy drink, trail mix)
- All images should be placed in /public/demo-images/ directory
`;

console.log(creationInstructions);

// Export for potential use in build scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    demoImageRequirements,
    creationInstructions
  };
}