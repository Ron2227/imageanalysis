import { checkContrast, applyContrastFix } from './contrast.js';
import { generateHeatmap, optimizeLayout } from './heatmap.js';
import { checkAgainstBenchmarks } from './benchmarks.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const resultsDiv = document.getElementById('results');
const previewImage = document.getElementById('previewImage');

// Initialize analysis worker
const analysisWorker = new Worker('src/analysisWorker.js');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
  setupDragAndDrop();
  setupFileInput();
  setupToolButtons();
}

function setupDragAndDrop() {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  dropZone.addEventListener('drop', handleDrop, false);
}

function setupFileInput() {
  fileInput.addEventListener('change', handleFiles);
  dropZone.addEventListener('click', () => fileInput.click());
}

function setupToolButtons() {
  document.getElementById('adjustContrast').addEventListener('click', async () => {
    const img = document.getElementById('previewImage');
    const fixedImg = await applyContrastFix(img);
    previewImage.src = fixedImg.src;
    analyzeImage(fixedImg);
  });

  document.getElementById('refocusLayout').addEventListener('click', async () => {
    const canvas = document.getElementById('heatmapCanvas');
    const img = document.getElementById('previewImage');
    await optimizeLayout(canvas, img);
  });

  document.getElementById('downloadReport').addEventListener('click', generateReport);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  dropZone.classList.add('drag-over');
}

function unhighlight() {
  dropZone.classList.remove('drag-over');
}

async function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length) {
    handleFiles({ target: { files } });
  }
}

async function handleFiles(e) {
  const file = e.target.files[0];
  
  // Validate file
  if (!validateFile(file)) return;
  
  const img = await loadImage(file);
  previewImage.src = img.src;
  resultsDiv.style.display = 'block';
  
  // Process image
  analyzeImage(img);
}

function validateFile(file) {
  if (!file) return false;
  
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    alert('Please upload only PNG or JPEG images');
    return false;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be under 5MB');
    return false;
  }
  
  return true;
}

async function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src); // Clean up
      resolve(img);
    };
    img.onerror = () => reject(new Error('Image loading failed'));
    img.src = URL.createObjectURL(file);
  });
}

async function analyzeImage(img) {
  try {
    // Use Web Worker for heavy processing
    analysisWorker.postMessage({ 
      action: 'analyze', 
      image: await getImageData(img) 
    });
    
    analysisWorker.onmessage = async (e) => {
      const { contrast, heatmap, elements, timeline } = e.data;
      displayResults(contrast, heatmap, elements, timeline);
    };
    
  } catch (error) {
    console.error('Analysis error:', error);
    resultsDiv.innerHTML = `<div class="error">Analysis failed: ${error.message}</div>`;
  }
}

async function getImageData(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function displayResults(contrast, heatmap, elements, timeline) {
  displayContrastResults(contrast);
  displayHeatmapResults(heatmap);
  displayElementAnalysis(elements);
  displayAttentionTimeline(timeline);
}

function displayContrastResults(results) {
  const contrastPreview = document.getElementById('contrastPreview');
  const contrastScore = document.getElementById('contrastScore');
  const suggestions = document.getElementById('contrastSuggestions');
  const benchmark = document.getElementById('contrastBenchmark');
  
  // Visual representation
  contrastPreview.innerHTML = `
    <div class="contrast-gradient" style="
      width: 100%;
      height: 100%;
      background: linear-gradient(to right, 
        #000000 ${100 - results.score}%, 
        #ffffff ${100 - results.score}%);
    "></div>
  `;
  
  // Score display
  contrastScore.textContent = `${results.score}/100`;
  contrastScore.style.color = getScoreColor(results.score);
  
  // Suggestions
  suggestions.innerHTML = `
    <h4>Recommendations:</h4>
    <ul>
      ${results.suggestions.map(s => `<li>${s}</li>`).join('')}
    </ul>
  `;
  
  // Benchmark status
  const benchmarkResult = checkAgainstBenchmarks(results, 'socialMedia');
  benchmark.className = benchmarkResult.passes ? 'benchmark-pass' : 'benchmark-fail';
  benchmark.innerHTML = benchmarkResult.passes ? 
    '✓ Meets industry standards' : 
    '⚠️ Below recommended standards';
}

function displayHeatmapResults(heatmapData) {
  const canvas = document.getElementById('heatmapCanvas');
  const heatmapInstance = h337.create({
    container: canvas,
    radius: 40,
    maxOpacity: 0.6,
  });
  
  heatmapInstance.setData({
    max: 10,
    data: heatmapData.points
  });
}

function displayElementAnalysis(elements) {
  const container = document.getElementById('elementAnalysis');
  container.innerHTML = `
    <h4>Element Analysis:</h4>
    ${elements.map(el => `
      <div class="element-item">
        <span>${el.type}:</span>
        <span class="${el.score > 70 ? 'score-high' : 'score-low'}">
          ${el.score}% visibility
        </span>
      </div>
    `).join('')}
  `;
}

function displayAttentionTimeline(timeline) {
  const container = document.getElementById('attentionTimeline');
  container.innerHTML = `
    <h4>Attention Timeline:</h4>
    <div class="timeline-step">
      <div class="timeline-marker initial"></div>
      <div>First glance (0-0.5s): ${timeline.initialFocus}</div>
    </div>
    <div class="timeline-step">
      <div class="timeline-marker scan"></div>
      <div>Content scan (0.5-2s): ${timeline.scanPath}</div>
    </div>
    <div class="timeline-step">
      <div class="timeline-marker final"></div>
      <div>Final focus (2s+): ${timeline.finalResting}</div>
    </div>
  `;
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

async function generateReport() {
  const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Creative Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; }
        .report-header { text-align: center; margin-bottom: 2rem; }
        .results-container { display: flex; gap: 2rem; }
        .preview-box { flex: 1; border: 1px solid #ddd; padding: 1rem; }
        h3 { color: #333; }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>Creative Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="results-container">
        ${document.getElementById('results').innerHTML}
      </div>
    </body>
    </html>
  `;
  
  const blob = new Blob([reportHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'creative-analysis-report.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
