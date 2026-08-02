import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDI4ih1VqmvLivlpTxbc4SMXmyorqAFLDI",
  authDomain: "gen-lang-client-0534190127.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0534190127-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0534190127",
  storageBucket: "gen-lang-client-0534190127.firebasestorage.app",
  messagingSenderId: "453483875559",
  appId: "1:453483875559:web:6a2c8b8a498c8df7f1a642"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Reference for our unified state
const stateRef = ref(db, 'mosque_app_data/main_state');

// Expose sync functions globally so app.js can use them
window.FirebaseSync = {
    isUploading: false,
    
    // Push local state to Realtime Database
    pushState: async (stateObj) => {
        window.FirebaseSync.isUploading = true;
        try {
            const cleanState = JSON.parse(JSON.stringify(stateObj));
            cleanState.last_updated = new Date().toISOString();
            
            await set(stateRef, cleanState);
            console.log("State successfully synced to Realtime Database!");
        } catch (error) {
            console.error("Error syncing state to Realtime Database:", error);
        } finally {
            window.FirebaseSync.isUploading = false;
        }
    },
    
    // Listen for changes from Realtime Database (real-time sync)
    listenState: (callback) => {
        onValue(stateRef, (snapshot) => {
            if (snapshot.exists()) {
                if (window.FirebaseSync.isUploading) return;
                
                console.log("Received new state from Realtime Database!");
                const data = snapshot.val();
                callback(data);
            } else {
                console.log("No data found in Realtime Database yet. Pushing local state to initialize cloud database.");
                if (window.state && window.FirebaseSync.pushState) {
                    window.FirebaseSync.pushState(window.state);
                }
            }
        }, (error) => {
            console.error("Error listening to Realtime Database:", error);
        });
    }
};

// Automatically start listening if window.syncStateFromCloud is defined
if (typeof window.syncStateFromCloud === 'function') {
    window.FirebaseSync.listenState(window.syncStateFromCloud);
}
