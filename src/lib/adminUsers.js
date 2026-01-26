// src/lib/adminUsers.js
import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

function normalizeUsername(u) {
  return (u || "").toLowerCase().replace("@", "").trim();
}
function isValidUsername(u) {
  return /^[a-z0-9._]{3,20}$/.test(u);
}

export async function adminGetUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function adminUpdateUserFields(uid, patch) {
  await updateDoc(doc(db, "users", uid), { ...patch, updatedAt: Date.now() });
}

export async function adminIsUsernameAvailable(usernameRaw) {
  const username = normalizeUsername(usernameRaw);
  if (!username) return false;
  const snap = await getDoc(doc(db, "usernames", username));
  return !snap.exists();
}

export async function adminGetProfile(usernameRaw) {
  const username = normalizeUsername(usernameRaw);
  const snap = await getDoc(doc(db, "profiles", username));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function adminSaveProfile(usernameRaw, profileObj) {
  const username = normalizeUsername(usernameRaw);
  await setDoc(doc(db, "profiles", username), profileObj, { merge: false });
}

export async function adminToggleProfilePublished(usernameRaw, published) {
  const username = normalizeUsername(usernameRaw);
  await updateDoc(doc(db, "profiles", username), {
    published: !!published,
    updatedAt: Date.now(),
  });
}

/**
 * ✅ Freeze / Unfreeze (soft)
 * - blocks dashboard access
 * - you should also block at login (optional, but recommended)
 */
export async function adminFreezeUser(uid, adminUid) {
  await updateDoc(doc(db, "users", uid), {
    disabled: true,
    disabledAt: Date.now(),
    disabledBy: adminUid || null,
    updatedAt: Date.now(),
  });
}

export async function adminUnfreezeUser(uid, adminUid) {
  await updateDoc(doc(db, "users", uid), {
    disabled: false,
    disabledAt: null,
    disabledBy: adminUid || null,
    updatedAt: Date.now(),
  });
}

/**
 * ✅ Soft delete
 * - marks user deleted + disables
 * - removes public profile + username reservation (optional but recommended)
 * NOTE: this does NOT delete Firebase Auth user (needs Admin SDK / Cloud Function)
 */
export async function adminSoftDeleteUser({ uid, usernameRaw }, adminUid) {
  const username = normalizeUsername(usernameRaw);

  await updateDoc(doc(db, "users", uid), {
    deleted: true,
    deletedAt: Date.now(),
    deletedBy: adminUid || null,

    disabled: true,
    disabledAt: Date.now(),
    disabledBy: adminUid || null,

    updatedAt: Date.now(),
  });

  // remove public-facing docs
  if (username) {
    await deleteDoc(doc(db, "profiles", username)).catch(() => {});
    await deleteDoc(doc(db, "usernames", username)).catch(() => {});
  }
}

/**
 * Change username safely (admin)
 * WARNING: client-side multi-write (not atomic). For production, move to Cloud Functions.
 */
export async function adminChangeUsername({ uid, oldUsernameRaw, newUsernameRaw }) {
  const oldU = normalizeUsername(oldUsernameRaw);
  const newU = normalizeUsername(newUsernameRaw);

  if (!isValidUsername(newU)) {
    throw new Error("Username must be 3–20 chars (a-z, 0-9, . _).");
  }
  if (oldU === newU) return;

  const ok = await adminIsUsernameAvailable(newU);
  if (!ok) throw new Error("Username is already taken.");

  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) throw new Error("User not found.");
  const user = userSnap.data();

  const oldProfileSnap = await getDoc(doc(db, "profiles", oldU));
  if (!oldProfileSnap.exists()) throw new Error("Old profile not found.");
  const oldProfile = oldProfileSnap.data();

  // reserve new username
  await setDoc(doc(db, "usernames", newU), {
    uid,
    username: newU,
    email: user.email || "",
    createdAt: Date.now(),
  });

  // move profile
  await setDoc(doc(db, "profiles", newU), {
    ...oldProfile,
    username: newU,
    updatedAt: Date.now(),
  });

  // update user doc
  await updateDoc(doc(db, "users", uid), {
    username: newU,
    updatedAt: Date.now(),
  });

  // cleanup old
  await deleteDoc(doc(db, "profiles", oldU)).catch(() => {});
  await deleteDoc(doc(db, "usernames", oldU)).catch(() => {});
}
