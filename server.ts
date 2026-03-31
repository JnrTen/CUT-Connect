import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Paynow } from "paynow";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log("Initializing Firebase Admin with Project ID:", firebaseConfig.projectId);
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

// Ensure we use the correct database ID for the named database
let db: admin.firestore.Firestore;
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

try {
  console.log("Connecting to Firestore Database:", databaseId);
  db = getFirestore(databaseId);
  // Test connection immediately
  db.listCollections().then(() => {
    console.log("Successfully connected to Firestore");
  }).catch(err => {
    console.error("Initial Firestore connection test failed:", err);
  });
} catch (error) {
  console.error("Failed to initialize Firestore:", error);
  db = getFirestore();
}

// Global error handlers to prevent silent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Paynow Integration
  app.post("/api/paynow/initiate", async (req, res) => {
    const { uid, email, amount, planId, mobileNumber, mobileMethod } = req.body;
    
    const integrationId = process.env.PAYNOW_INTEGRATION_ID;
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;

    if (!integrationId || !integrationKey) {
      console.error("Paynow Integration ID or Key is missing in environment variables.");
      return res.status(500).json({ error: "Paynow configuration error. Please check environment variables." });
    }

    const paynow = new Paynow(
      integrationId,
      integrationKey,
      (process.env.APP_URL || "http://localhost:3000") + "/api/paynow/update",
      (process.env.APP_URL || "http://localhost:3000") + "/payment-status"
    );

    // Use UID as reference for easy lookup in update callback
    const payment = paynow.createPayment(uid, email);
    payment.add(`Premium Subscription - ${planId}`, amount);

    try {
      let response;
      if (mobileNumber && mobileMethod) {
        // Express Checkout (USSD Push)
        response = await paynow.sendMobile(payment, mobileNumber, mobileMethod);
      } else {
        // Standard Redirect
        response = await paynow.send(payment);
      }

      if (response.success) {
        // Create a pending subscription record
        await db.collection("subscriptions").add({
          userId: uid,
          amount: amount,
          planId: planId,
          status: "pending",
          pollUrl: response.pollUrl,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          method: mobileMethod || "web"
        });

        res.json({ 
          redirectUrl: response.redirectUrl || null, 
          pollUrl: response.pollUrl,
          instructions: response.instructions || null
        });
      } else {
        res.status(400).json({ error: response.error });
      }
    } catch (error) {
      console.error("Paynow Initiation Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  // Paynow Update Route
  app.post("/api/paynow/update", async (req, res) => {
    // Paynow sends a POST request to this URL with the payment status
    // The request body is a URL-encoded string, but express.json() might not handle it if it's not JSON.
    // However, the Paynow SDK can be used to parse it if needed, or we can just look at the fields.
    const status = req.body;
    console.log("Paynow Update Received:", status);

    const paynow = new Paynow(
      process.env.PAYNOW_INTEGRATION_ID || "",
      process.env.PAYNOW_INTEGRATION_KEY || "",
      "", ""
    );

    // Verify the update
    if (paynow.parse(status)) {
      const { reference, status: paymentStatus, pollurl } = status;
      const uid = reference; // We used UID as reference

      if (paymentStatus === "Paid" || paymentStatus === "Awaiting Delivery") {
        try {
          // Update user's subscription status
          const userRef = db.collection("users").doc(uid);
          await userRef.update({
            isSubscribed: true,
            subscriptionType: "semester", // Default or fetch from pending sub
            subscriptionExpiry: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
          });

          // Update public profile
          const profileRef = db.collection("profiles").doc(uid);
          await profileRef.update({
            isSubscribed: true
          });

          // Update subscription record
          const subQuery = await db.collection("subscriptions")
            .where("userId", "==", uid)
            .where("status", "==", "pending")
            .limit(1)
            .get();
          
          if (!subQuery.empty) {
            await subQuery.docs[0].ref.update({
              status: "completed",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }

          console.log(`Subscription updated for user: ${uid}`);
        } catch (error) {
          console.error("Error updating Firestore after payment:", error);
        }
      } else if (paymentStatus === "Cancelled" || paymentStatus === "Failed") {
        try {
          // Update subscription record to failed
          const subQuery = await db.collection("subscriptions")
            .where("userId", "==", uid)
            .where("status", "==", "pending")
            .limit(1)
            .get();
          
          if (!subQuery.empty) {
            await subQuery.docs[0].ref.update({
              status: "failed",
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          console.log(`Subscription failed/cancelled for user: ${uid}`);
        } catch (error) {
          console.error("Error updating Firestore after failed payment:", error);
        }
      }
    }

    res.sendStatus(200);
  });

  // Check Payment Status
  app.get("/api/paynow/status/:uid", async (req, res) => {
    const { uid } = req.params;
    
    try {
      const subQuery = await db.collection("subscriptions")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
      
      if (subQuery.empty) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const subData = subQuery.docs[0].data();
      res.json({ status: subData.status });
    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
