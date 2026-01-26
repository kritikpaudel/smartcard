// src/lib/account.js
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

/* ======================
   HELPERS
====================== */

export function normalizeHandle(v) {
  return (v || "").toLowerCase().replace("@", "").trim();
}

export function handleLooksValid(v) {
  return /^[a-z0-9._]{3,20}$/.test(v);
}

/* ======================
   USERNAME (PUBLIC HANDLE)
====================== */

export async function isUsernameAvailable(raw) {
  const u = normalizeHandle(raw);
  if (!u) return false;

  const a = await getDoc(doc(db, "usernames", u));
  if (a.exists()) return false;

  const b = await getDoc(doc(db, "profiles", u));
  if (b.exists()) return false;

  return true;
}

export async function changeUsername({ uid, oldUsernameRaw, newUsernameRaw }) {
  const oldU = normalizeHandle(oldUsernameRaw);
  const newU = normalizeHandle(newUsernameRaw);

  if (!handleLooksValid(newU)) {
    throw new Error("Username must be 3–20 chars (a-z, 0-9, . _)");
  }
  if (oldU === newU) {
    throw new Error("New username is the same as current username.");
  }

  const available = await isUsernameAvailable(newU);
  if (!available) throw new Error("Username already taken.");

  const oldUsernameRef = doc(db, "usernames", oldU);
  const newUsernameRef = doc(db, "usernames", newU);

  const oldProfileRef = doc(db, "profiles", oldU);
  const newProfileRef = doc(db, "profiles", newU);

  const userRef = doc(db, "users", uid);

  const [oldUsernameSnap, oldProfileSnap] = await Promise.all([
    getDoc(oldUsernameRef),
    getDoc(oldProfileRef),
  ]);

  if (!oldUsernameSnap.exists()) throw new Error("Current username mapping missing.");
  if (!oldProfileSnap.exists()) throw new Error("Current profile missing.");

  if (oldUsernameSnap.data().uid !== uid) throw new Error("Not authorized.");
  if (oldProfileSnap.data().ownerUid !== uid) throw new Error("Not authorized.");

  const oldProfile = oldProfileSnap.data();

  const batch = writeBatch(db);

  // ✅ Create new username mapping
  batch.set(newUsernameRef, {
    uid,
    username: newU,
    email: oldUsernameSnap.data().email,
    createdAt: Date.now(),
  });

  // ✅ Copy profile to new username
  batch.set(newProfileRef, {
    ...oldProfile,
    username: newU,
    updatedAt: Date.now(),
  });

  // ✅ Update users/{uid}
  batch.update(userRef, {
    username: newU,
    updatedAt: Date.now(),
  });

  // ✅ Keep old profile but convert it into redirect stub
  batch.update(oldProfileRef, {
    redirectTo: newU,
    updatedAt: Date.now(),
  });

  // ✅ Delete old username mapping only (free old handle)
  batch.delete(oldUsernameRef);

  await batch.commit();
  return newU;
}


/* ======================
   NICKNAME (APP ONLY)
====================== */

export async function isNicknameAvailable(raw, myUid) {
  const n = normalizeHandle(raw);
  if (!handleLooksValid(n)) return false;

  const ref = doc(db, "nicknames", n);
  const snap = await getDoc(ref);

  if (!snap.exists()) return true;
  return snap.data().uid === myUid;
}

export async function saveNickname(uid, raw) {
  const n = normalizeHandle(raw);
  if (!handleLooksValid(n)) {
    throw new Error("Nickname must be 3–20 chars (a-z, 0-9, . _)");
  }

  const ref = doc(db, "nicknames", n);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().uid !== uid) {
    throw new Error("Nickname already taken.");
  }

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      nickname: n,
      createdAt: Date.now(),
    });
  }

  await updateDoc(doc(db, "users", uid), {
    nickname: n,
    updatedAt: Date.now(),
  });

  return n;
}
