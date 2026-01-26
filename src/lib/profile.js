import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export async function getPublicProfile(usernameWithAt) {
  const username = (usernameWithAt || "").replace("@", "").toLowerCase();
  if (!username) return null;

  const snap = await getDoc(doc(db, "profiles", username));
  return snap.exists() ? snap.data() : null;
}

export async function saveProfile(username, profileData) {
  const key = username.toLowerCase();
  await setDoc(
    doc(db, "profiles", key),
    { ...profileData, username: key, updatedAt: Date.now() },
    { merge: true }
  );
}

export function subscribePublicProfile(usernameWithAt, cb) {
  const username = (usernameWithAt || "").replace("@", "").trim().toLowerCase();
  if (!username) return () => {};

  const ref = doc(db, "profiles", username);

  // realtime listener
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? snap.data() : null),
    () => cb(null)
  );
}

