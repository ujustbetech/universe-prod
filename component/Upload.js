import React, { useRef } from "react";
import { db } from "../firebaseConfig";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import * as XLSX from "xlsx";

export default function ImportReferrals() {
  const fileInputRef = useRef();

  const handleFileSelect = () => fileInputRef.current.click();

  // Function to safely parse Excel date values
  const parseExcelDate = (value) => {
    if (!value) return Timestamp.now();

    // If it's already a Date object
    if (value instanceof Date && !isNaN(value)) return Timestamp.fromDate(value);

    // If it's a number (Excel serial date)
    if (typeof value === "number") {
      const excelEpoch = new Date(1899, 11, 30);
      return Timestamp.fromDate(new Date(excelEpoch.getTime() + value * 86400000));
    }

    // If it's a string
    const parsed = new Date(value);
    if (!isNaN(parsed)) return Timestamp.fromDate(parsed);

    // Fallback to now
    return Timestamp.now();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!jsonData.length) {
        alert("⚠️ Excel sheet is empty!");
        return;
      }

      let importedCount = 0;

      for (const row of jsonData) {
        const referralGivenDate = parseExcelDate(row["Referral Given date"]);

        // CosmoOrbiter map
        const cosmoOrbiter = {
          name: row["CosmOrbiter Name"] || "",
          email: row["CosmOrbiter personal  Email"] || "",
          phone: (row["CosmOrbiter  Mobile number"] || "").toString(),
          mentorName: row["CosmOrbiter mentorbiter Name"] || null,
          mentorEmail: row["CosmOrbiter MentOrbiter Email ID"] || null,
          mentorPhone: row["CosmOrbiter MentOrbiter Contact No"] || null,
          dealStatus: row["Referral/Deal Status"] || "Pending",
          lastUpdated: Timestamp.now(),
        };

        // Orbiter map
        const orbiter = {
          name: row["Orbiter Name"] || "",
          email: row["Orbiter Email"] || "",
          phone: (row["Orbiter Mobile number"] || "").toString().replace("+91", "").trim(),
          ujbCode: row["Orbiter_ujbCode"] || "",
          mentorName: row["Orbiter MentOrbiter Name"] || null,
          mentorEmail: row["Orbiter MentOrbiter Email"] || null,
          mentorPhone: row["Orbiter MentOrbiter Mobile number"] || null,
          orbitersInfo: null,
        };

        // Product/service map
        const product = {
          name: row["Product/Service Name"] || "",
          description: row["Product Description"] || "",
          imageURL: row["Product Image URL"] || "",
          percentage: row["Agreed Percentage/ amount"] || "",
        };

        // Main referral document
        const referralDoc = {
          referralId: row["Referral Id"] || "",
          referralSource: row["referralSource"] || "",
          referralType: row["referralType"] || "Self",
          timestamp: referralGivenDate,
          cosmoOrbiter,
          orbiter,
          product,
        };

        // Save with auto-generated doc ID in Referral_dev
        const docRef = doc(collection(db, "Referraldev"));
        await setDoc(docRef, referralDoc);
        importedCount++;
      }

      alert(`✅ ${importedCount} referrals imported successfully!`);
    } catch (error) {
      console.error("❌ Error importing referrals:", error);
      alert("❌ Failed to import referrals. Check console.");
    }
  };

  return (
    <div>
      <button onClick={handleFileSelect} className="m-button-5">
        Choose Excel File to Import
      </button>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={handleImport}
        style={{ display: "none" }}
      />
    </div>
  );
}
