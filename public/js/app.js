// DOM Elements
const installContainer = document.getElementById('install-container');
const installButton = document.getElementById('install-button');
const appContent = document.getElementById('app-content');
const cameraView = document.getElementById('camera-view');
const cameraCanvas = document.getElementById('camera-canvas');
const captureButton = document.getElementById('capture-button');
const recordingIndicator = document.getElementById('recording-indicator');
const recordingTime = document.getElementById('recording-time');
const menuItems = document.querySelectorAll('.menu-item');

// App state
let deferredPrompt;
let isInstalled = false;
let isRecording = false;
let recordingStartTime = 0;
let recordingTimer = null;
let mediaRecorder = null;
let recordedChunks = [];
let stream = null;

// Check if app is already installed or running in standalone mode
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  isInstalled = true;
}

// Initialize the app
function initApp() {
  // Show the appropriate UI based on installation status
  if (isInstalled) {
    showAppUI();
  } else {
    showInstallUI();
  }

  // Set up event listeners
  setupEventListeners();
}

// Show the install UI
function showInstallUI() {
  installContainer.classList.remove('hidden');
  appContent.classList.add('hidden');
}

// Show the main app UI
function showAppUI() {
  installContainer.classList.add('hidden');
  appContent.classList.remove('hidden');
  initCamera();
}

// Initialize the camera
async function initCamera() {
  try {
    // Get user media with video and audio
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true
    });
    
    // Set the stream as the source for the video element
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
  
  // Create a media recorder
  mediaRecorder = new MediaRecorder(stream);
  recordedChunks = [];
  
  // Handle data available event
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  // Handle recording stop
  mediaRecorder.onstop = () => {
    // Create a blob from the recorded chunks
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    
    // Upload the recorded video
    uploadVideo(blob);
    
    // Reset recording state
    isRecording = false;
    captureButton.classList.remove('recording');
    recordingIndicator.classList.add('hidden');
    
    // Clear recording timer
    clearInterval(recordingTimer);
    recordingTimer = null;
  };
  
  // Start recording
  mediaRecorder.start();
  isRecording = true;
  captureButton.classList.add('recording');
  recordingIndicator.classList.remove('hidden');
  
  // Set recording start time
  recordingStartTime = Date.now();
  
  // Update recording time
  recordingTimer = setInterval(updateRecordingTime, 1000);
  
  console.log('Recording started');
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
}

// Update recording time display
function updateRecordingTime() {
  const elapsedSeconds = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
  const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
  recordingTime.textContent = `${minutes}:${seconds}`;
}

// Upload video to the server
async function uploadVideo(blob) {
  try {
    // Create a FormData object
    const formData = new FormData();
    formData.append('photo', blob, 'recording.webm');
    
    // Get the current origin (hostname including protocol and port)
    const origin = window.location.origin;
    
    // Send the video to the server using the full URL
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

// Handle menu item clicks
function handleMenuItemClick(event) {
  // Get the clicked item
  const clickedItem = event.currentTarget;
  
  // Remove active class from all items
  menuItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to clicked item
  clickedItem.classList.add('active');
  
  // Get the action
  const action = clickedItem.dataset.action;
  
  // Handle different actions
  switch (action) {
    case 'camera':
      // Already on camera view
      break;
    case 'settings':
      // TODO: Implement settings view
      alert('Settings view not implemented yet');
      break;
  }
}

// Set up event listeners
function setupEventListeners() {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default prompt
    event.preventDefault();
    
    // Store the event for later use
    deferredPrompt = event;
    
    // Show the install UI if not already installed
    if (!isInstalled) {
      showInstallUI();
    }
  });
  
  // Handle install button click
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    // Reset the deferred prompt
    deferredPrompt = null;
    
    // If the user accepted the prompt, mark as installed
    if (choiceResult.outcome === 'accepted') {
      isInstalled = true;
      showAppUI();
    }
  });
  
  // Handle appinstalled event
  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    showAppUI();
  });
  
  // Handle capture button click
  captureButton.addEventListener('click', () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
  
  // Handle menu item clicks
  menuItems.forEach(item => {
    item.addEventListener('click', handleMenuItemClick);
  });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Handle visibility change (app goes to background)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && isRecording) {
    // Stop recording if the app goes to background
    stopRecording();
  }
});