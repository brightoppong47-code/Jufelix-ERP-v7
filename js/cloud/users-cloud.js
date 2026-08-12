import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { createUserWithEmailAndPassword, getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAC3sMFu0LnchFFP1Wrqc_r_fcZWSOWt5I",
  authDomain: "jufelix-erp-v7.firebaseapp.com",
  projectId: "jufelix-erp-v7",
  storageBucket: "jufelix-erp-v7.firebasestorage.app",
  messagingSenderId: "1012255951864",
  appId: "1:1012255951864:web:539c79ddb4433f1dcb640d"
};

function waitForFirebase(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (window.JufelixFirebase && window.JufelixFirebase.db) {
        resolve(window.JufelixFirebase);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("Firebase did not become ready."));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

async function createUser(userData) {
  const firebase = await waitForFirebase();

  const secondaryApp = initializeApp(
    firebaseConfig,
    "userCreator-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)
  );

  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      userData.email,
      userData.password
    );

    const uid = credential.user.uid;

    const profile = {
      uid,
      id: uid,
      fullName: userData.fullName || userData.name || "",
      name: userData.fullName || userData.name || "",
      email: userData.email,
      phone: userData.phone || "",
      username: userData.username || userData.email,
      role: userData.role || "sales-officer",
      branchId: userData.branchId || "head-office",
      branchName: userData.branchName || "Head Office",
      status: userData.status || "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: null
    };

    await setDoc(doc(firebase.db, "users", uid), profile);

    await signOut(secondaryAuth);

    const localUser = {
      uid,
      id: uid,
      fullName: profile.fullName,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      username: profile.username,
      role: profile.role,
      branchId: profile.branchId,
      branchName: profile.branchName,
      status: profile.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    document.dispatchEvent(
      new CustomEvent("jufelix:user-cloud-saved", {
        detail: { user: localUser }
      })
    );

    return localUser;
  } finally {
    try { await deleteApp(secondaryApp); } catch (_) {}
  }
}

async function updateUser(userId, userData) {
  const firebase = await waitForFirebase();

  const profile = {
    fullName: userData.fullName || userData.name || "",
    name: userData.fullName || userData.name || "",
    email: userData.email || "",
    phone: userData.phone || "",
    username: userData.username || userData.email || "",
    role: userData.role || "sales-officer",
    branchId: userData.branchId || "head-office",
    branchName: userData.branchName || "Head Office",
    status: userData.status || "active",
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(firebase.db, "users", String(userId)), profile);

  const localUser = {
    id: String(userId),
    uid: String(userId),
    ...profile,
    updatedAt: new Date().toISOString()
  };

  document.dispatchEvent(
    new CustomEvent("jufelix:user-cloud-saved", {
      detail: { user: localUser }
    })
  );

  return localUser;
}

async function deleteUser(user) {
  const firebase = await waitForFirebase();
  const userId = typeof user === "object" ? (user.uid || user.id) : user;

  if (!userId) throw new Error("User ID is required.");

  await deleteDoc(doc(firebase.db, "users", String(userId)));
  return true;
}

window.JufelixUsersCloud = {
  createUser,
  updateUser,
  deleteUser
};

document.dispatchEvent(new CustomEvent("jufelix:users-cloud-ready"));
console.log("Jufelix Users Cloud ready.");
