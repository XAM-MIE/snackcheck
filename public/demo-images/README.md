# SnackCheck Demo Assets and Fallback System

This directory contains demo assets and fallback systems designed to ensure reliable hackathon presentations and robust error handling.

## Demo Images

### Current Demo Images (10 total)
1. **cereal-label.jpg** - Whole grain cereal (Score: 72, Yellow)
2. **snack-bar-label.jpg** - Natural snack bar (Score: 88, Green)
3. **yogurt-label.jpg** - Flavored yogurt (Score: 68, Yellow)
4. **crackers-label.jpg** - Wheat crackers (Score: 58, Yellow)
5. **juice-label.jpg** - Apple juice concentrate (Score: 65, Yellow)
6. **protein-bar-label.jpg** - Clean protein bar (Score: 85, Green)
7. **instant-noodles-label.jpg** - Processed noodles (Score: 25, Red)
8. **organic-soup-label.jpg** - Organic vegetable soup (Score: 92, Green)
9. **energy-drink-label.jpg** - Artificial energy drink (Score: 18, Red)
10. **trail-mix-label.jpg** - Mixed nuts and dried fruit (Score: 78, Green)

### Demo Image Requirements
- **Resolution**: Minimum 800x600px
- **Format**: High-quality JPEG
- **Lighting**: Even, bright lighting for OCR readability
- **Angle**: Straight-on view of ingredients list
- **Background**: Clean, neutral background
- **Text**: Clear, readable ingredients list

## Demo Data Structure

The `demo-data.json` file contains:
- **demoImages**: Array of demo image metadata
- **fallbackResponses**: Predefined responses for failure scenarios

### Demo Image Metadata
```json
{
  "name": "Product Name",
  "filename": "image-file.jpg",
  "mockOCRText": "INGREDIENTS: ...",
  "expectedIngredients": ["ingredient1", "ingredient2"],
  "expectedScore": 75,
  "expectedColor": "green"
}
```

### Fallback Responses
- **ocrFailure**: OCR processing failures
- **apiFailure**: API service unavailability
- **aiFailure**: AI service timeouts

## Demo Mode Features

### Automatic Demo Mode Triggers
- Development environment (`NODE_ENV=development`)
- Environment variable (`NEXT_PUBLIC_DEMO_MODE=true`)
- URL parameter (`?demo=true`)

### Demo Mode Capabilities
- **Simulated OCR**: Fast, reliable text extraction
- **Cached Ingredients**: 50+ common ingredients for offline use
- **Mock Health Scores**: Predictable scoring for demonstrations
- **Fallback Assets**: Reliable demo images when live scanning fails

## Fallback System

### Intelligent Fallbacks
- **Pattern Recognition**: Scores ingredients based on name patterns
- **Organic Detection**: Boosts scores for organic/natural ingredients
- **Additive Classification**: Identifies preservatives, colors, artificial ingredients
- **Nutritional Scoring**: Assigns appropriate health scores

### Error Recovery
- **OCR Failures**: Automatic fallback to demo images
- **API Timeouts**: Use cached ingredient data
- **Network Issues**: Offline-first approach with localStorage
- **Service Unavailability**: Graceful degradation with meaningful messages

## Performance Targets

### Demo Mode Performance
- **OCR Processing**: < 2 seconds
- **Ingredient Lookup**: < 1 second per ingredient
- **Health Score Calculation**: < 500ms
- **Complete Flow**: < 5 seconds (scan to results)

### Reliability Metrics
- **OCR Confidence**: 85-95% for demo images
- **Cache Hit Rate**: 100% for common ingredients
- **Fallback Success**: 100% coverage for all failure scenarios

## Usage Instructions

### Enabling Demo Mode
```javascript
// Programmatically
DemoService.enableDemoMode();

// Via URL
window.location.href += '?demo=true';

// Via Environment
NEXT_PUBLIC_DEMO_MODE=true
```

### Testing Demo Flow
```javascript
// Test complete flow
const result = await DemoService.testDemoFlow('Cereal Box');

// Test specific image
const ocrResult = await DemoService.simulateOCRProcessing('Protein Bar');

// Test fallback systems
const fallbackTest = await FallbackService.testFallbackSystems();
```

### Pre-populating Cache
```javascript
// Pre-populate for offline demo
await DemoService.prePopulateCache();

// Clear demo cache
DemoService.clearDemoCache();
```

## Integration with Main App

### Components
- **DemoModeToggle**: UI toggle for enabling/disabling demo mode
- **DemoImageSelector**: Interface for selecting specific demo images
- **ProcessingScreen**: Shows demo-aware loading states

### Services
- **DemoService**: Core demo functionality and image management
- **FallbackService**: Comprehensive error handling and recovery
- **OCRProcessor**: Integrates with demo mode for reliable processing

## Hackathon Presentation Tips

### Preparation Checklist
1. ✅ Enable demo mode before presentation
2. ✅ Pre-populate cache for offline reliability
3. ✅ Test all demo images beforehand
4. ✅ Verify fallback systems work
5. ✅ Have backup demo images ready

### Demonstration Flow
1. **Show Live Scanning**: Start with real camera if available
2. **Demonstrate Variety**: Use different demo images (green, yellow, red scores)
3. **Show Fallbacks**: Demonstrate error recovery
4. **Performance**: Highlight 5-second scan-to-result timing
5. **Offline Mode**: Show functionality without internet

### Troubleshooting
- **Camera Issues**: Automatically falls back to demo images
- **Network Problems**: Uses cached ingredient data
- **Performance Issues**: Demo mode optimized for speed
- **Browser Compatibility**: Fallbacks for unsupported features

## File Structure
```
public/demo-images/
├── README.md                 # This documentation
├── demo-data.json           # Demo image metadata and fallbacks
├── generate-demo-images.js  # Image generation instructions
├── cereal-label.jpg         # Demo image files
├── snack-bar-label.jpg
├── yogurt-label.jpg
├── crackers-label.jpg
├── juice-label.jpg
├── protein-bar-label.jpg    # Additional demo images
├── instant-noodles-label.jpg
├── organic-soup-label.jpg
├── energy-drink-label.jpg
└── trail-mix-label.jpg
```

## Testing Coverage

### Unit Tests
- ✅ DemoService functionality
- ✅ FallbackService error handling
- ✅ Demo mode detection
- ✅ Cache management
- ✅ Performance benchmarks

### Integration Tests
- ✅ Complete demo flow (scan to results)
- ✅ Error recovery scenarios
- ✅ Performance under load
- ✅ Cross-browser compatibility
- ✅ Offline functionality

This demo system ensures that SnackCheck can deliver a reliable, impressive presentation regardless of network conditions, camera availability, or API service status.