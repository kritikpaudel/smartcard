import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Use same config as your normal firebase app (from env or your firebase.js)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function normalizeUsername(u) {
  return (u || "").toLowerCase().replace("@", "").trim();
}

function isValidUsername(u) {
  return /^[a-z0-9._]{3,20}$/.test(u);
}

// ✅ Secondary app (so admin auth session is not replaced)
function getSecondaryAuth() {
  const name = "adminSecondary";
  const existing = getApps().find((a) => a.name === name);
  const app = existing || initializeApp(firebaseConfig, name);
  return getAuth(app);
}

export async function isUsernameAvailable(usernameRaw) {
  const username = normalizeUsername(usernameRaw);
  if (!username) return false;
  const snap = await getDoc(doc(db, "usernames", username));
  return !snap.exists();
}

export async function adminCreateUser({ emailRaw, password, fullName, usernameRaw }) {
  const email = (emailRaw || "").trim().toLowerCase();
  const username = normalizeUsername(usernameRaw);

  if (!email || !email.includes("@")) throw new Error("Valid email required.");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (!fullName?.trim()) throw new Error("Full name required.");
  if (!isValidUsername(username)) throw new Error("Username must be 3–20 chars (a-z, 0-9, . _).");

  const ok = await isUsernameAvailable(username);
  if (!ok) throw new Error("Username already taken.");

  const secondaryAuth = getSecondaryAuth();

  // ✅ Create auth user WITHOUT switching admin session
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await updateProfile(cred.user, { displayName: fullName.trim() });

  // Reserve username
  await setDoc(doc(db, "usernames", username), {
    uid: cred.user.uid,
    username,
    email,
    createdAt: Date.now(),
  });

  // Private user doc
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    email,
    fullName: fullName.trim(),
    username,
    role: "user",
    createdAt: Date.now(),
    lastLoginAt: null,
    recentActivity: [{ type: "created_by_admin", at: Date.now() }],
  });

  // Public profile doc
  await setDoc(doc(db, "profiles", username), {
    username,
    ownerUid: cred.user.uid,
    published: true,
    theme: {
      background: "#0b0f16",
      card: "#0f172a",
      primary: "#ffffff",
    },
    blocks: [
      {
        id: "b1",
        type: "header",
        data: {
          fullName: fullName.trim(),
          position: "Your Position",
          company: "Your Company",
          profileImageUrl: "",
          coverImageUrl: "",
        },
      },
      { id: "b2", type: "save_contact", data: {} },
      { id: "b3", type: "socials", data: { items: [] } },
      { id: "b4", type: "contact", data: { phone: "", email, website: "" } },
      { id: "b5", type: "footer", data: { text: "Made with SmartCard" } },
    ],
    updatedAt: Date.now(),
  });

  return { uid: cred.user.uid, email, username };
}
