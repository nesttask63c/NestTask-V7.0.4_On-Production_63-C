/**
 * PWA Offline Testing Script
 * 
 * This script helps test the offline functionality of the NestTask PWA.
 * Run this in the browser console to verify that offline functionality is working correctly.
 */

(function() {
  console.log('--- PWA OFFLINE TEST START ---');
  
  // Check if app is installed as PWA
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || 
                window.navigator.standalone === true;
  
  console.log(`Running as PWA: ${isPwa ? 'Yes' : 'No'}`);
  console.log(`Online status: ${navigator.onLine ? 'Online' : 'Offline'}`);
  
  // Check service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log(`Active service workers: ${registrations.length}`);
      registrations.forEach(registration => {
        console.log(`Service worker scope: ${registration.scope}`);
      });
    });
  } else {
    console.warn('Service workers not supported in this browser');
  }
  
  // Check for cached data
  console.log('Checking IndexedDB for cached data...');
  
  function openDB() {
    return new Promise((resolve, reject) => {
      const dbName = 'nesttask_offline_db';
      const request = indexedDB.open(dbName);
      
      request.onerror = err => {
        console.error('IndexedDB error:', err);
        reject(err);
      };
      
      request.onsuccess = event => {
        const db = event.target.result;
        resolve(db);
      };
    });
  }
  
  function getStoreData(db, storeName) {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`Store "${storeName}" not found`);
        resolve({ storeName, count: 0, data: null });
        return;
      }
      
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        resolve({ 
          storeName, 
          count: countRequest.result,
          // Don't fetch all data to avoid flooding the console
          data: countRequest.result > 0 ? '...' : null
        });
      };
      
      countRequest.onerror = err => {
        console.error(`Error counting ${storeName}:`, err);
        reject(err);
      };
    });
  }
  
  // Verify cached data in IndexedDB
  openDB().then(async db => {
    const storeNames = Array.from(db.objectStoreNames);
    console.log(`Found stores: ${storeNames.join(', ')}`);
    
    // Check critical stores for offline functionality
    const storesToCheck = [
      'routines',
      'courses',
      'teachers',
      'tasks',
      'userData'
    ];
    
    const results = await Promise.all(
      storesToCheck.map(storeName => getStoreData(db, storeName))
    );
    
    console.table(results.map(r => ({ 
      Store: r.storeName, 
      'Items Count': r.count 
    })));
    
    // Test if we have the minimum required data for Routine page
    const hasRequiredData = results.every(r => 
      (r.storeName === 'routines' && r.count > 0) || 
      (r.storeName === 'courses' && r.count > 0) || 
      (r.storeName === 'teachers' && r.count > 0)
    );
    
    if (hasRequiredData) {
      console.log('✅ All required data found for offline Routine page!');
    } else {
      console.warn('⚠️ Missing some required data for optimal offline experience');
    }
    
    console.log('--- PWA OFFLINE TEST COMPLETE ---');
  }).catch(err => {
    console.error('Failed to open database:', err);
  });
})();
