// Industry benchmarks for creative analysis
const benchmarks = {
  socialMedia: {
    minContrast: 70,
    minHotspots: 2,
    maxElements: 5,
    standards: {
      instagram: { minContrast: 65, minHotspots: 1 },
      facebook: { minContrast: 70, minHotspots: 2 },
      linkedin: { minContrast: 75, minHotspots: 2 }
    }
  },
  displayAds: {
    minContrast: 80,
    minHotspots: 1,
    maxElements: 3
  }
};

export function checkAgainstBenchmarks(analysis, creativeType = 'socialMedia', platform) {
  const benchmark = platform ? 
    benchmarks[creativeType].standards[platform] : 
    benchmarks[creativeType];
  
  return {
    passes: analysis.contrast.score >= benchmark.minContrast &&
            analysis.hotspots.length >= benchmark.minHotspots,
    metrics: {
      contrast: {
        value: analysis.contrast.score,
        meets: analysis.contrast.score >= benchmark.minContrast,
        benchmark: benchmark.minContrast
      },
      attention: {
        hotspots: analysis.hotspots.length,
        meets: analysis.hotspots.length >= benchmark.minHotspots,
        benchmark: benchmark.minHotspots
      }
    }
  };
}
