"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compteurMembres = exports.ancienMurReaction = exports.murCommentaireEcrit = exports.murVoteEcrit = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
/**
 * Le compte des votes et des commentaires du Mur appartient au serveur.
 * Le navigateur n'ecrit que son propre bulletin ou son propre commentaire ;
 * ces deux declencheurs recomptent et reposent le total sur le billet.
 */
const REGION = "us-central1";
const DEMI_VIE_CHALEUR = 45000;
/** Meme formule que dans services/murService.ts, cote navigateur. */
function calculerChaleur(score, creeLeMs) {
    return (Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) +
        creeLeMs / 1000 / DEMI_VIE_CHALEUR);
}
async function recompterVotes(postId) {
    var _a;
    const db = admin.firestore();
    const billetRef = db.doc(`mur/${postId}`);
    const billet = await billetRef.get();
    if (!billet.exists)
        return;
    const votes = await db.collection(`mur/${postId}/votes`).get();
    let pour = 0;
    let contre = 0;
    votes.forEach((v) => {
        var _a;
        const valeur = (_a = v.data()) === null || _a === void 0 ? void 0 : _a.valeur;
        if (valeur === 1)
            pour += 1;
        else if (valeur === -1)
            contre += 1;
    });
    const score = pour - contre;
    const creeLe = (_a = billet.data()) === null || _a === void 0 ? void 0 : _a.creeLe;
    const creeLeMs = creeLe ? creeLe.toMillis() : Date.now();
    await billetRef.update({
        pour,
        contre,
        score,
        chaleur: calculerChaleur(score, creeLeMs),
    });
}
async function recompterCommentaires(postId) {
    const db = admin.firestore();
    const billetRef = db.doc(`mur/${postId}`);
    const billet = await billetRef.get();
    if (!billet.exists)
        return;
    const compte = await db.collection(`mur/${postId}/commentaires`).count().get();
    await billetRef.update({ nbCommentaires: compte.data().count });
}
exports.murVoteEcrit = (0, firestore_1.onDocumentWritten)({ document: "mur/{postId}/votes/{voterUid}", region: REGION }, async (event) => {
    await recompterVotes(event.params.postId);
});
exports.murCommentaireEcrit = (0, firestore_1.onDocumentWritten)({ document: "mur/{postId}/commentaires/{commentId}", region: REGION }, async (event) => {
    await recompterCommentaires(event.params.postId);
});
/**
 * Le meme service pour l'ancien mur, garde le temps que les billets
 * existants soient repris ailleurs.
 */
exports.ancienMurReaction = (0, firestore_1.onDocumentWritten)({ document: "posts/{postId}/reactions/{voterUid}", region: REGION }, async (event) => {
    const db = admin.firestore();
    const ref = db.doc(`posts/${event.params.postId}`);
    if (!(await ref.get()).exists)
        return;
    const compte = await db.collection(`posts/${event.params.postId}/reactions`).count().get();
    await ref.update({ reactionCount: compte.data().count });
});
/**
 * Compteur public de membres. Les fiches ne sont lisibles que par les personnes
 * connectees, donc le tableau de bord public a besoin d'un total tenu a part.
 */
exports.compteurMembres = (0, firestore_1.onDocumentWritten)({ document: "membres/{uid}", region: REGION }, async () => {
    const db = admin.firestore();
    const compte = await db.collection("membres").count().get();
    await db
        .collection("auditStatus")
        .doc("reseau")
        .set({ nbMembres: compte.data().count, majLe: new Date().toISOString() }, { merge: true });
});
//# sourceMappingURL=mur.js.map