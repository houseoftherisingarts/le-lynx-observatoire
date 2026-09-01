import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Le compte des votes et des commentaires du Mur appartient au serveur.
 * Le navigateur n'ecrit que son propre bulletin ou son propre commentaire ;
 * ces deux declencheurs recomptent et reposent le total sur le billet.
 */

const REGION = "us-central1";
const DEMI_VIE_CHALEUR = 45_000;

/** Meme formule que dans services/murService.ts, cote navigateur. */
function calculerChaleur(score: number, creeLeMs: number): number {
  return (
    Math.log10(Math.max(Math.abs(score), 1)) * Math.sign(score) +
    creeLeMs / 1000 / DEMI_VIE_CHALEUR
  );
}

async function recompterVotes(postId: string): Promise<void> {
  const db = admin.firestore();
  const billetRef = db.doc(`mur/${postId}`);
  const billet = await billetRef.get();
  if (!billet.exists) return;

  const votes = await db.collection(`mur/${postId}/votes`).get();
  let pour = 0;
  let contre = 0;
  votes.forEach((v) => {
    const valeur = v.data()?.valeur;
    if (valeur === 1) pour += 1;
    else if (valeur === -1) contre += 1;
  });

  const score = pour - contre;
  const creeLe = billet.data()?.creeLe as admin.firestore.Timestamp | undefined;
  const creeLeMs = creeLe ? creeLe.toMillis() : Date.now();

  await billetRef.update({
    pour,
    contre,
    score,
    chaleur: calculerChaleur(score, creeLeMs),
  });
}

async function recompterCommentaires(postId: string): Promise<void> {
  const db = admin.firestore();
  const billetRef = db.doc(`mur/${postId}`);
  const billet = await billetRef.get();
  if (!billet.exists) return;

  const compte = await db.collection(`mur/${postId}/commentaires`).count().get();
  await billetRef.update({ nbCommentaires: compte.data().count });
}

export const murVoteEcrit = onDocumentWritten(
  { document: "mur/{postId}/votes/{voterUid}", region: REGION },
  async (event) => {
    await recompterVotes(event.params.postId);
  }
);

export const murCommentaireEcrit = onDocumentWritten(
  { document: "mur/{postId}/commentaires/{commentId}", region: REGION },
  async (event) => {
    await recompterCommentaires(event.params.postId);
  }
);

/**
 * Le meme service pour l'ancien mur, garde le temps que les billets
 * existants soient repris ailleurs.
 */
export const ancienMurReaction = onDocumentWritten(
  { document: "posts/{postId}/reactions/{voterUid}", region: REGION },
  async (event) => {
    const db = admin.firestore();
    const ref = db.doc(`posts/${event.params.postId}`);
    if (!(await ref.get()).exists) return;
    const compte = await db.collection(`posts/${event.params.postId}/reactions`).count().get();
    await ref.update({ reactionCount: compte.data().count });
  }
);

/**
 * Compteur public de membres. Les fiches ne sont lisibles que par les personnes
 * connectees, donc le tableau de bord public a besoin d'un total tenu a part.
 */
export const compteurMembres = onDocumentWritten(
  { document: "membres/{uid}", region: REGION },
  async () => {
    const db = admin.firestore();
    const compte = await db.collection("membres").count().get();
    await db
      .collection("auditStatus")
      .doc("reseau")
      .set({ nbMembres: compte.data().count, majLe: new Date().toISOString() }, { merge: true });
  }
);
