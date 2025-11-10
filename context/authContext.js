import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { doc, getDoc, collection, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedPhone = localStorage.getItem("mmOrbiter");
    if (storedPhone) fetchUser(storedPhone);
    else setLoading(false);
  }, []);

const fetchUser = async (phone) => {
  try {
    const q = query(collection(db, "usersdetail"), where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const ujbCode = userDoc.id;          // ✅ doc id
      const name = userDoc.data()["Name"] || "User";

      setUser({ phoneNumber: phone, name, ujbCode });
      logLoginEvent(ujbCode, name);        // ✅ pass ujbCode instead of phone
    }
  } catch (err) {
    console.error("Error fetching user:", err);
  } finally {
    setLoading(false);
  }
};


const login = async (phone) => {
  try {
    const q = query(collection(db, "usersdetail"), where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) throw new Error("User not found");

    const userDoc = querySnapshot.docs[0];
    const ujbCode = userDoc.id;            // ✅ doc id
    const name = userDoc.data()["Name"] || "User";

    localStorage.setItem("mmOrbiter", ujbCode);  // store UJB code
    setUser({ phoneNumber: phone, name, ujbCode });
    logLoginEvent(ujbCode, name);

    router.push("/");
  } catch (err) {
    console.error("Login failed:", err);
    throw err;
  }
};

  const logout = () => {
    localStorage.removeItem("mmOrbiter");
    setUser(null);
    router.push("/login");
  };

  const logLoginEvent = async (phoneNumber, name) => {
    try {
      const deviceInfo = navigator.userAgent;
      let ipAddress = "Unknown";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        ipAddress = (await res.json()).ip;
      } catch {}
      await setDoc(doc(collection(db, "LoginLogs")), {
        phoneNumber,
        name,
        loginTime: new Date(),
        deviceInfo,
        ipAddress,
      });
    } catch (err) {
      console.error("Error logging login:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);