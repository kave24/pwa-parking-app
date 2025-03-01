// Main application logic
const app = {
  init() {
    this.cacheElements();
    this.bindEvents();
    this.checkInstallable();

    // Check if service worker is supported and register it
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }
  },

  cacheElements() {
    this.installButton = document.getElementById('install-button');
  },

  bindEvents() {
    // Add event listeners
    this.installButton.addEventListener('click', this.installApp.bind(this));
    
    // Listen for beforeinstallprompt event to enable install button
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      event.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = event;
      // Show the install button
      this.installButton.classList.remove('hidden');
    });
  },

  checkInstallable() {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already installed and running in standalone mode');
    }
  },

  async installApp() {
    if (!this.deferredPrompt) {
      console.log('App cannot be installed at this time');
      return;
    }
    
    // Show the install prompt
    this.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    this.deferredPrompt = null;
    
    // Hide the install button
    this.installButton.classList.add('hidden');
  }
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
