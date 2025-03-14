// DOM Elements
const installContainer = document.getElementById('install-container');
const installButton = document.getElementById('install-button');
const appContent = document.getElementById('app-content');
const cameraView = document.getElementById('camera-view');
const cameraCanvas = document.getElementById('camera-canvas');
const captureButton = document.getElementById('capture-button');
const recordingIndicator = document.getElementById('recording-indicator');
const menuItems = document.querySelectorAll('.menu-item');

// State
let deferredPrompt;
let isInstalled = false;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let stream = null;

// Check if installed
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  isInstalled = true;
}

// Initialize the app
function initApp() {
  if (isInstalled) {
    showAppUI();
  } else {
    showInstallUI();
  }

  setupEventListeners();
}

// Show install UI
function showInstallUI() {
  installContainer.classList.remove('hidden');
  appContent.classList.add('hidden');
}

// Show app UI
function showAppUI() {
  installContainer.classList.add('hidden');
  appContent.classList.remove('hidden');
  initCamera();
}

// Initialize the camera
async function initCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true
    });
    
    cameraView.srcObject = stream;
    
    console.log('Camera initialized successfully');
  } catch (error) {
    console.error('Error initializing camera:', error);
    alert('Unable to access the camera. Please ensure you have granted the necessary permissions.');
  }
}

// Start recording
function startRecording() {
  if (!stream) {
    console.error('No stream available');
    return;
  }
  
  mediaRecorder = new MediaRecorder(stream);
  recordedChunks = [];
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  // Recording stop
  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    uploadVideo(blob);

    isRecording = false;
    captureButton.classList.remove('recording');
    recordingIndicator.classList.add('hidden');
  };
  
  mediaRecorder.start();
  isRecording = true;
  captureButton.classList.add('recording');
  recordingIndicator.classList.remove('hidden');
  
  console.log('Recording started');
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
}

// Upload video
async function uploadVideo(blob) {
  try {
    const formData = new FormData();
    formData.append('photo', blob, 'recording.webm');
    
    const origin = window.location.origin;
    
    const response = await fetch(`${origin}/api/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.status === 'OK') {
      console.log('Video uploaded successfully');
    } else {
      console.error('Error uploading video:', result.error);
    }
  } catch (error) {
    console.error('Error uploading video:', error);
  }
}

// Handle menu clicks
function handleMenuItemClick(event) {
  const clickedItem = event.currentTarget;
  
  menuItems.forEach(item => item.classList.remove('active'));
  clickedItem.classList.add('active');
  
  const action = clickedItem.dataset.action;
  
  switch (action) {
    case 'camera':
      break;
    case 'settings':
      // TODO: Implement settings view
      alert('Settings view not implemented yet');
      break;
  }
}

// EventListeners
function setupEventListeners() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    
    if (!isInstalled) {
      showInstallUI();
    }
  });
  
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    
    if (choiceResult.outcome === 'accepted') {
      isInstalled = true;
      showAppUI();
    }
  });
  
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    showAppUI();
  });
  
  captureButton.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
  
  menuItems.forEach(item => {
    item.addEventListener('click', handleMenuItemClick);
  });
}

// Init on DOM load
document.addEventListener('DOMContentLoaded', initApp);

// Stop recording if app goes to background
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && isRecording) {
    stopRecording();
  }
});