import Pica from 'pica';

// Initialize Pica with a careful fallback array. 
// If WebAssembly (wasm) or OffscreenCanvas triggers fingerprint protections, 
// it falls back to raw JS math.
const pica = new Pica({
  features: ['js', 'wasm'] // Prioritizes JS fallback if Wasm SAB fails
});

self.onmessage = async (e) => {
  if (e.data.action === 'process') {
    const { image, mode, canvas } = e.data;
    
    try {
      // Setup the target dimensions (e.g., 2x upscale)
      const scale = mode === 'bicubic' ? 2 : 1; 
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // Attempt to read data to catch strict canvas blockers early
      try {
        ctx.drawImage(image, 0, 0);
        ctx.getImageData(0, 0, 1, 1); 
      } catch (err) {
        throw new Error("Canvas read blocked by privacy extension. Please disable shields for this site.");
      }

      if (mode === 'bicubic') {
        // Run Pica Lanczos/Bicubic math upscale
        await pica.resize(image, canvas, {
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2
        });
      } 
      else if (mode === 'iphone6') {
        // Basic placeholder for where your WebGL shader logic will go
        // to crush dynamic range and add sensor noise.
        ctx.drawImage(image, 0, 0);
        applyiPhoneLimitationFilter(ctx, canvas.width, canvas.height);
      }
      // Add ONNX (R-ESRGAN) and lcms-wasm (ColorFix) branches here

      self.postMessage({ status: 'success' });
      
    } catch (error) {
      self.postMessage({ status: 'error', message: error.message, error });
    }
  }
};

function applyiPhoneLimitationFilter(ctx, width, height) {
  // Simple pixel manipulation example for noise/banding
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Add fake grain
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, data[i] + noise);     // R
    data[i+1] = Math.min(255, data[i+1] + noise); // G
    data[i+2] = Math.min(255, data[i+2] + noise); // B
  }
  ctx.putImageData(imageData, 0, 0);
}
