/**
 * Verification des regles Firestore contre ce que les modules ecrivent
 * reellement. Chaque cas correspond a un appel present dans services/.
 *
 * Lancer : npx firebase emulators:exec --only firestore "node tests/rules.test.mjs"
 */
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

const HOTE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [host, port] = HOTE.split(':');

const env = await initializeTestEnvironment({
  projectId: 'le-lynx-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host,
    port: Number(port),
  },
});

const ALEX = 'uid-alex';
const BEA = 'uid-bea';
const PATRON = 'uid-patron';

/** Pose les documents de depart en contournant les regles. */
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users', ALEX), { uid: ALEX, role: 'member' });
  await setDoc(doc(db, 'users', BEA), { uid: BEA, role: 'member' });
  await setDoc(doc(db, 'users', PATRON), { uid: PATRON, role: 'admin' });
  await setDoc(doc(db, 'membres', ALEX), { uid: ALEX, nom: 'Alex', verifie: false });
  await setDoc(doc(db, 'news', 'n1'), { title: 'Chénéville', sortDate: '2026-08-30' });
  await setDoc(doc(db, 'auditStatus', 'latest'), { lastRunAt: '2026-09-01T00:00:00Z' });
});

const alex = env.authenticatedContext(ALEX).firestore();
const bea = env.authenticatedContext(BEA).firestore();
const patron = env.authenticatedContext(PATRON).firestore();
const passant = env.unauthenticatedContext().firestore();

const cas = [];
/** Le cas se construit paresseusement : la promesse ne part qu'au moment du tour. */
const verifier = (nom, faire) => cas.push({ nom, faire });

// --- Veille -----------------------------------------------------------------
verifier('un passant lit la veille', () => assertSucceeds(getDoc(doc(passant, 'news', 'n1'))));
verifier('un passant lit l’état de la veille', () => assertSucceeds(getDoc(doc(passant, 'auditStatus', 'latest'))));
verifier('personne n’écrit dans la veille', () => assertFails(setDoc(doc(alex, 'news', 'n2'), { title: 'faux' })));
verifier('la veille brute reste fermée aux membres', () => assertFails(getDoc(doc(alex, 'auditRuns', 'r1'))));

// --- Profils ----------------------------------------------------------------
verifier('un membre lit la fiche publique d’un autre', () => assertSucceeds(getDoc(doc(bea, 'membres', ALEX))));
verifier('un passant ne lit pas les fiches', () => assertFails(getDoc(doc(passant, 'membres', ALEX))));
verifier('chacun crée sa fiche', () => assertSucceeds(setDoc(doc(bea, 'membres', BEA), { uid: BEA, nom: 'Béa', verifie: false })));
verifier('personne ne se déclare vérifié', () => assertFails(updateDoc(doc(alex, 'membres', ALEX), { verifie: true })));
verifier('personne ne se donne le rôle admin', () => assertFails(updateDoc(doc(alex, 'users', ALEX), { role: 'admin' })));
verifier('l’administration accorde le rôle', () => assertSucceeds(updateDoc(doc(patron, 'users', ALEX), { role: 'admin' })));

// --- Le Mur -----------------------------------------------------------------
const billetValide = {
  uid: ALEX,
  nom: 'Alex',
  texte: 'La rencontre de Chénéville a rassemblé 400 personnes.',
  fil: 'place-publique',
  pour: 0,
  contre: 0,
  score: 0,
  chaleur: 1,
  nbCommentaires: 0,
  epingle: false,
  officiel: false,
  creeLe: serverTimestamp(),
};
verifier('un membre publie sur le mur', () => assertSucceeds(setDoc(doc(alex, 'mur', 'b1'), billetValide)));
verifier('personne ne publie avec un score gonflé', () => assertFails(setDoc(doc(alex, 'mur', 'b2'), { ...billetValide, score: 99 })));
verifier('personne ne publie au nom d’un autre', () => assertFails(setDoc(doc(bea, 'mur', 'b3'), billetValide)));
verifier('un passant lit le mur', () => assertSucceeds(getDoc(doc(passant, 'mur', 'b1'))));
verifier('un membre pose son vote', () => assertSucceeds(setDoc(doc(bea, 'mur', 'b1', 'votes', BEA), { uid: BEA, valeur: 1, nom: 'Béa', majLe: serverTimestamp() })));
verifier('personne ne vote pour un autre', () => assertFails(setDoc(doc(bea, 'mur', 'b1', 'votes', ALEX), { uid: ALEX, valeur: 1 })));
verifier('un vote hors barème est refusé', () => assertFails(setDoc(doc(bea, 'mur', 'b1', 'votes', BEA), { uid: BEA, valeur: 7 })));
verifier('personne ne recompte les votes à la main', () => assertFails(updateDoc(doc(bea, 'mur', 'b1'), { score: 42 })));
verifier('un membre commente', () => assertSucceeds(addDoc(collection(bea, 'mur', 'b1', 'commentaires'), { uid: BEA, nom: 'Béa', texte: 'Merci du compte rendu.', creeLe: serverTimestamp() })));

// --- Alliances et messagerie -------------------------------------------------
const paire = [ALEX, BEA].sort();
const cle = paire.join('__');
verifier('une alliance se demande', () => assertSucceeds(setDoc(doc(alex, 'amities', cle), { paire, de: ALEX, statut: 'demande', creeLe: serverTimestamp() })));
verifier('on ne s’accepte pas soi-même', () => assertFails(updateDoc(doc(alex, 'amities', cle), { statut: 'acceptee', majLe: serverTimestamp() })));
verifier('l’autre accepte', () => assertSucceeds(updateDoc(doc(bea, 'amities', cle), { statut: 'acceptee', majLe: serverTimestamp() })));
verifier('une conversation s’ouvre', () => assertSucceeds(setDoc(doc(alex, 'dms', cle), { participantUids: paire, participantNoms: { [ALEX]: 'Alex', [BEA]: 'Béa' }, dernierMessage: '', majLe: serverTimestamp(), nonLus: {} })));
verifier('un message part', () => assertSucceeds(addDoc(collection(alex, 'dms', cle, 'messages'), { uid: ALEX, nom: 'Alex', texte: 'Bonjour.', creeLe: serverTimestamp() })));
verifier('un tiers ne lit pas la conversation', () => assertFails(getDoc(doc(env.authenticatedContext('uid-tiers').firestore(), 'dms', cle))));

// --- Cellules ----------------------------------------------------------------
verifier('une cellule se fonde', () => assertSucceeds(setDoc(doc(alex, 'cellules', 'c1'), { nom: 'Cellule de Duhamel', fondateurUid: ALEX, fondateurNom: 'Alex', membreUids: [ALEX], nbMembres: 1, ouverte: true, creeLe: serverTimestamp() })));
verifier('un membre rejoint sans toucher au reste', () => assertSucceeds(updateDoc(doc(bea, 'cellules', 'c1'), { membreUids: [ALEX, BEA], nbMembres: 2 })));
verifier('un membre ne renomme pas la cellule d’un autre', () => assertFails(updateDoc(doc(bea, 'cellules', 'c1'), { nom: 'Détournée' })));

// --- Questions du public ------------------------------------------------------
verifier('un passant pose une question', () => assertSucceeds(addDoc(collection(passant, 'questions'), { name: 'Mireille', question: 'Où en est le dossier au BAPE ?', status: 'pending', upvotes: 0, upvoterIds: [], createdAt: serverTimestamp() })));
verifier('personne ne s’auto-approuve', () => assertFails(addDoc(collection(passant, 'questions'), { name: 'X', question: 'Truc', status: 'approved', upvotes: 0, upvoterIds: [] })));

// --- Photos -------------------------------------------------------------------
verifier('une photo entre en attente', () => assertSucceeds(setDoc(doc(alex, 'photos', 'p1'), { uid: ALEX, nomMembre: 'Alex', url: 'https://exemple/p.jpg', chemin: 'photos/alex/p.jpg', legende: 'Le lac', statut: 'attente', creeLe: serverTimestamp() })));
verifier('personne ne publie une photo directement', () => assertFails(setDoc(doc(alex, 'photos', 'p2'), { uid: ALEX, url: 'https://exemple/q.jpg', statut: 'approuvee' })));
verifier('un passant ne voit pas une photo en attente', () => assertFails(getDoc(doc(passant, 'photos', 'p1'))));

// --- Moderation -----------------------------------------------------------------
verifier('un membre signale', () => assertSucceeds(addDoc(collection(bea, 'signalements'), { parUid: BEA, parNom: 'Béa', cible: { type: 'billet', id: 'b1' }, motif: 'Hors sujet', statut: 'ouvert', creeLe: serverTimestamp() })));
verifier('un membre ne lit pas les signalements', () => assertFails(getDoc(doc(bea, 'signalements', 'peu-importe'))));
verifier('chacun gère sa liste de blocages', () => assertSucceeds(setDoc(doc(bea, 'blocages', BEA), { uids: [ALEX] })));
verifier('personne ne bloque au nom d’un autre', () => assertFails(setDoc(doc(bea, 'blocages', ALEX), { uids: [BEA] })));

// --- Signalement d'un autre projet ------------------------------------------------
verifier('un passant signale un projet', () => assertSucceeds(addDoc(collection(passant, 'projectSubmissions'), { projectName: 'Sablière du rang 6', description: 'Travaux sans avis public.', createdAt: serverTimestamp() })));
verifier('un membre ne lit pas le registre des signalements', () => assertFails(getDoc(doc(bea, 'projectSubmissions', 'x'))));

// --- Verdict ----------------------------------------------------------------------
let echecs = 0;
for (const { nom, faire } of cas) {
  try {
    await faire();
    console.log(`  ok   ${nom}`);
  } catch (e) {
    echecs += 1;
    console.log(`  ÉCHEC ${nom}\n        ${String(e).split('\n')[0]}`);
  }
}

await env.cleanup();
console.log(`\n${cas.length - echecs}/${cas.length} règles conformes`);
assert.equal(echecs, 0, `${echecs} règle(s) ne font pas ce que les modules attendent`);
