// src/lib/auth.js
import { auth, db } from "./firebase";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";

function normalizeUsername(u) {
  return (u || "").toLowerCase().replace("@", "").trim();
}

function isValidUsername(u) {
  // 3-20 chars, letters, numbers, underscore, dot
  return /^[a-z0-9._]{3,20}$/.test(u);
}

/**
 * Reserve usernames in:
 * usernames/{username} => { uid, username, email, createdAt }
 */
export async function isUsernameAvailable(usernameRaw) {
  const username = normalizeUsername(usernameRaw);
  if (!username) return false;

  const snap = await getDoc(doc(db, "usernames", username));
  return !snap.exists();
}

export async function signup(emailRaw, password, fullName, usernameRaw) {
  const email = (emailRaw || "").trim().toLowerCase();
  const username = normalizeUsername(usernameRaw);

  if (!isValidUsername(username)) {
    throw new Error(
      "Username must be 3-20 characters and only use letters, numbers, dot (.) or underscore (_)."
    );
  }

  const available = await isUsernameAvailable(username);
  if (!available) throw new Error("Username is already taken.");

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });

  // Reserve username (public get allowed)
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
    fullName,
    username,
    nickname: fullName, // default nickname
    role: "user",
    disabled: false,
    deleted: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    recentActivity: [{ type: "signup", at: Date.now() }],
  });

  // Public profile doc keyed by username
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
          fullName,
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

  return cred.user;
}

/**
 * Internal: block disabled/deleted accounts
 */
async function assertAccountAllowed(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return; // if no doc, don't block here

  const u = snap.data();
  if (u?.deleted) throw new Error("This account was deleted.");
  if (u?.disabled) throw new Error("This account is frozen. Contact admin.");
}

/**
 * LOGIN: Username OR Email
 * - email: sign in directly
 * - username: resolve usernames/{username}.email -> sign in
 */
export async function loginWithIdentifier(identifier, password) {
  const id = (identifier || "").trim();

  // If email, login directly
  if (id.includes("@")) {
    const cred = await signInWithEmailAndPassword(auth, id.toLowerCase(), password);

    // ✅ block frozen/deleted users
    await assertAccountAllowed(cred.user.uid);

    // record activity AFTER we have uid
    try {
      await updateDoc(doc(db, "users", cred.user.uid), {
        lastLoginAt: Date.now(),
        recentActivity: arrayUnion({ type: "login", at: Date.now() }),
      });
    } catch {}

    return cred.user;
  }

  // Username -> resolve to email via usernames collection
  const username = normalizeUsername(id);
  const usernameSnap = await getDoc(doc(db, "usernames", username));
  if (!usernameSnap.exists()) throw new Error("Username not found.");

  const email = (usernameSnap.data().email || "").toLowerCase().trim();
  if (!email) throw new Error("No email linked to this username.");

  const cred = await signInWithEmailAndPassword(auth, email, password);

  // ✅ block frozen/deleted users
  await assertAccountAllowed(cred.user.uid);

  // record activity AFTER we have uid
  try {
    await updateDoc(doc(db, "users", cred.user.uid), {
      lastLoginAt: Date.now(),
      recentActivity: arrayUnion({ type: "login", at: Date.now() }),
    });
  } catch {}

  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function getMyUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function resetPassword(email) {
  const e = (email || "").trim();
  if (!e || !e.includes("@")) throw new Error("Enter your email to reset password.");
  await sendPasswordResetEmail(auth, e);
}
