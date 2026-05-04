const uploadInput = document.getElementById('imageUpload');
const processBtn = document.getElementById('processBtn');
const modeSelect = document.getElementById('processMode');
const outputCanvas = document.getElementById('outputCanvas');
const statusMsg = document.getElementById('statusMsg');

let imageBitmap = null;

// Initialize the Web Worker
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

uploadInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Use createImageBitmap to avoid putting it on a canvas immediately 
  // (helps mitigate early fingerprint blocking)
  imageBitmap = await createImageBitmap(file);
  statusMsg.textContent = "Image loaded. Ready for processing.";
});

processBtn.addEventListener('click', () => {
  if (!imageBitmap) {
    statusMsg.textContent = "Please upload an image first.";
    return;
  }

  statusMsg.textContent = "Processing... (UI will not freeze)";
  
  // Transfer control of an OffscreenCanvas to the worker
  const offscreen = outputCanvas.transferControlToOffscreen();
  
  worker.postMessage({
    action: 'process',
    image: imageBitmap,
    mode: modeSelect.value,
    canvas: offscreen
  }, [imageBitmap, offscreen]); // Transfer ownership to worker
});

worker.onmessage = (e) => {
  if (e.data.status === 'success') {
    statusMsg.textContent = "Processing complete!";
  } else if (e.data.status === 'error') {
    statusMsg.textContent = `Error: ${e.data.message}`;
    console.error(e.data.error);
  }
};
