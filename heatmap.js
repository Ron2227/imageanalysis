// Heatmap and attention analysis utilities
let attentionModel;

export async function initializeModel() {
  attentionModel = await tf.loadGraphModel('https://tfhub.dev/google/attention_analysis/1');
}

export async function generateHeatmap(img) {
  if (!attentionModel) await initializeModel();
  
  // Preprocess image
  const tensor = tf.browser.fromPixels(img)
    .resizeNearestNeighbor([224, 224])
    .toFloat()
    .div(255.0)
    .expandDims();
  
  // Predict attention
  const predictions = attentionModel.predict(tensor);
  const heatmapData = await processPredictions(predictions, img);
  
  tf.dispose([tensor, predictions]);
  
  return heatmapData;
}

async function processPredictions(predictions, originalImg) {
  const data = await predictions.data();
  
  // Generate heatmap points
  const points = [];
  const step = 5; // Sample every 5px
  
  for (let y = 0; y < originalImg.height; y += step) {
    for (let x = 0; x < originalImg.width; x += step) {
      // Scale prediction to original image size
      const predX = Math.floor(x * (224 / originalImg.width));
      const predY = Math.floor(y * (224 / originalImg.height));
      const idx = predY * 224 + predX;
      
      points.push({
        x: x,
        y: y,
        value: data[idx] * 10 // Scale for visibility
      });
    }
  }
  
  return {
    points,
    hotSpots: findHotSpots(points),
    timeline: generateAttentionTimeline(points)
  };
}

function findHotSpots(points) {
  // Find top 3 attention areas
  const sorted = [...points].sort((a, b) => b.value - a.value);
  return sorted.slice(0, 3).map((point, i) => ({
    x: point.x,
    y: point.y,
    intensity: point.value,
    rank: i + 1
  }));
}

export function generateAttentionTimeline(points) {
  // Simulate attention over time
  const sortedByIntensity = [...points].sort((a, b) => b.value - a.value);
  
  return {
    initialFocus: `Top-left quadrant (${Math.round(sortedByIntensity[0].value/10*100)}% focus)`,
    scanPath: `Z-pattern movement through content`,
    finalResting: `Main CTA button (${Math.round(sortedByIntensity[1].value/10*100)}% focus)`
  };
}

export async function optimizeLayout(canvas, img) {
  // Generate heatmap if not already done
  const heatmapData = await generateHeatmap(img);
  
  // Get current element positions
  const elements = detectTextElements(canvas);
  
  // Simple layout optimization - would use more sophisticated algorithm in production
  const optimized = elements.map(el => {
    return {
      ...el,
      newX: el.x + (el.x < canvas.width/2 ? 20 : -20),
      newY: el.y + (el.y < canvas.height/2 ? 20 : -20)
    };
  });
  
  // Visualize suggested changes
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  
  optimized.forEach(el => {
    ctx.strokeStyle = '#4cc9f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(el.x, el.y);
    ctx.lineTo(el.newX, el.newY);
    ctx.stroke();
    
    // Draw target position
    ctx.fillStyle = 'rgba(76, 201, 240, 0.3)';
    ctx.fillRect(el.newX - 10, el.newY - 10, 20, 20);
  });
  
  return optimized;
}

function detectTextElements(canvas) {
  // Mock element detection - would use CV in production
  return [
    { type: 'Logo', x: 50, y: 30, width: 100, height: 60 },
    { type: 'Headline', x: 150, y: 120, width: 300, height: 40 },
    { type: 'CTA Button', x: 200, y: 300, width: 150, height: 50 }
  ];
}
