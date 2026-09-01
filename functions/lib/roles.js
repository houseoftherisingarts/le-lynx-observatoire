"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifierRole = void 0;
const functions = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
/**
 * Attribution du role d'administration. La liste vit sur le serveur, jamais
 * dans le navigateur, et le navigateur ne peut pas ecrire son propre role
 * (les regles Firestore l'interdisent). Le client appelle ce point d'entree
 * apres chaque connexion, et le serveur decide.
 */
const REGION = "us-central1";
const COURRIELS_ADMIN = [
    "houseoftherisingarts@gmail.com",
    "alex@lesalondesinconnus.com",
];
const corsOrigins = [
    "https://le-lynx-observatoire.web.app",
    "https://le-lynx-observatoire.firebaseapp.com",
    "https://lynxobservatoire.netlify.app",
    "http://localhost:3000",
    "http://localhost:3001",
];
exports.verifierRole = functions.onRequest({ region: REGION, cors: corsOrigins }, async (req, res) => {
    var _a;
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
        res.status(401).json({ role: null });
        return;
    }
    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(token);
    }
    catch (_b) {
        res.status(401).json({ role: null });
        return;
    }
    const courriel = (decoded.email || "").toLowerCase();
    const db = admin.firestore();
    const ref = db.collection("users").doc(decoded.uid);
    const actuel = (_a = (await ref.get()).data()) === null || _a === void 0 ? void 0 : _a.role;
    if (COURRIELS_ADMIN.includes(courriel) && actuel !== "admin") {
        await ref.set({ role: "admin" }, { merge: true });
        res.json({ role: "admin", change: true });
        return;
    }
    res.json({ role: actuel !== null && actuel !== void 0 ? actuel : "member", change: false });
});
//# sourceMappingURL=roles.js.map