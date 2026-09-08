import React from 'react';
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Landmark,
  Map,
  Mountain,
  Network,
  ShieldCheck,
  TreePine,
  Users,
} from 'lucide-react';
import type { Language } from '../types';
import { ViewState } from '../types';

/**
 * Dossier « aire protégée » : le contre-plan de l'Alliance de la Petite-Nation
 * Nord au projet La Loutre. Tout ce qui est écrit ici vient d'une source lue
 * le 8 septembre 2026 (Radio-Canada, MRC de Papineau, ministère de
 * l'Environnement, CREDDO, Regroupement de protection des lacs). Le socle est
 * local : la page reste exacte hors ligne.
 */

interface AireProtegeeProps {
  language: Language;
  setViewState: (view: ViewState) => void;
}

const ETIQUETTE = 'text-[10px] font-bold uppercase tracking-widest';

interface Jalon {
  date: string;
  titre: string;
  texte: string;
  avenir?: boolean;
}

interface Source {
  nom: string;
  url: string;
}

const SOURCES: Source[] = [
  { nom: 'Radio-Canada, 30 août 2026 : « Des opposants proposent une aire protégée pour contrer La Loutre »', url: 'https://ici.radio-canada.ca/nouvelle/2279039/aire-protegee-mine-la-loutre-petite-nation-outaouais' },
  { nom: 'MRC de Papineau : conservation et aires protégées (les neuf projets déposés)', url: 'https://mrcpapineau.com/services/conservation-aires-protegees/' },
  { nom: 'MRC de Papineau : fiche du projet de Duhamel, Lac-des-Plages et Chénéville (carte du 22 octobre 2025)', url: 'https://mrcpapineau.com/wp-content/uploads/2025/10/ap-duhamelldpcheneville.pdf' },
  { nom: "Ministère de l'Environnement : document d'information sur le statut d'aire protégée d'utilisation durable (mars 2026)", url: 'https://www.environnement.gouv.qc.ca/biodiversite/utilisation-durable/information-statut-aire-protegee-utilisation-durable.pdf' },
  { nom: "Ministère de l'Environnement : appel à projets d'aires protégées en territoire public méridional", url: 'https://www.environnement.gouv.qc.ca/biodiversite/aires_protegees/consultation/appel-projet-territoire-public-meridional.htm' },
  { nom: 'CREDDO : concertation régionale sur les aires protégées en Outaouais', url: 'http://www.creddo.ca/projets/concertation-regionale' },
  { nom: 'Regroupement de protection des lacs de la Petite-Nation : projet Marie-Lefranc-Petite-Nation', url: 'https://aplg.ca/en/a-protected-area-along-lac-gagnon/' },
  { nom: 'Alliance Petite-Nation Nord : positionnement de la MRC face aux projets miniers (avril 2026)', url: 'https://alliancepetitenation.org/une-autre-page-historique-sest-ecrite-en-petite-nation/' },
  { nom: 'Loi sur la conservation du patrimoine naturel, RLRQ c. C-61.01, article 47', url: 'https://www.canlii.org/fr/qc/legis/lois/rlrq-c-c-61.01/derniere/rlrq-c-c-61.01.html' },
];

const TEXTES = {
  fr: {
    surtitre: 'Dossier',
    titre: "L'aire protégée, le contre-plan de la Petite-Nation",
    intro:
      "Le dimanche 30 août 2026, un an jour pour jour après le référendum, l'Alliance des municipalités de la Petite-Nation Nord a présenté sa réponse au projet La Loutre devant 400 personnes réunies au Centre St-Félix-de-Valois de Chénéville. Cette réponse tient en un mot : une aire protégée d'utilisation durable de 115 km² qui couvrirait tout le territoire visé par les claims. Cette page rassemble ce que nous savons de ce projet, ce qu'il interdit vraiment, qui le porte et où il en est dans la machine de Québec.",
    verifie: 'Sources lues le 8 septembre 2026',
    chiffres: [
      { valeur: '115 km²', legende: 'de territoire visé, à cheval sur Duhamel, Chénéville et Lac-des-Plages' },
      { valeur: '50 %', legende: 'au minimum laissé en libre évolution, sans aucune exploitation' },
      { valeur: '400', legende: 'personnes dans la salle de Chénéville le 30 août 2026' },
      { valeur: '9', legende: 'projets déposés par la MRC de Papineau, 42 464 hectares en tout' },
    ],
    cloche: {
      etiquette: 'Ce que le statut interdit, et ce qu\'il laisse passer',
      titre: "Aucune mine, aucun claim, mais pas une cloche de verre",
      texte:
        "Le ministère de l'Environnement a publié en mars 2026 le document qui décrit le statut. Dans une aire protégée d'utilisation durable, l'exploitation minière et la présence même de claims sont interdites, au même titre que le pétrole, le gaz, les barrages à réservoir, les grands parcs éoliens et la sylviculture intensive. Le territoire se divise en deux zones aux limites permanentes : une zone de libre évolution qui couvre au moins la moitié de la superficie et forme le noyau de conservation, et une zone de gestion exemplaire, plus petite, où la foresterie, l'acériculture et le tourisme restent possibles selon des pratiques à définir projet par projet. Le régime complet des activités permises est encore en cours d'élaboration au ministère.",
      citation:
        "Ce n'est pas une cloche de verre. C'est 50 % du territoire en libre évolution, mais aussi 50 % dans lesquels il peut y avoir exploitation de ressources naturelles, mais selon des pratiques exemplaires à déterminer en fonction de la nature de chaque projet.",
      auteur: 'Jérémie Vachon, maire de Lac-des-Plages, à Radio-Canada, 30 août 2026',
      noeud:
        "Le point qui décide tout se trouve dans le même document du ministère : pour être inscrite au Registre des aires protégées, une aire d'utilisation durable ne peut pas contenir de claims. Les treize claims que détient Lomiko Metals, et donc bientôt Global Battery Materials, devront tomber avant que Québec puisse désigner le territoire. La bataille des prochains mois se joue là.",
    },
    origine: {
      etiquette: "D'où vient le projet",
      titre: 'Un appel de Québec, une réponse de la MRC',
      texte:
        "Le 5 juin 2024, le ministère de l'Environnement a lancé un appel à projets d'aires protégées sur les terres publiques du sud du Québec, dans la foulée de l'engagement de protéger 30 % du territoire d'ici 2030. Les propositions ont été reçues jusqu'au 15 octobre 2024. La MRC de Papineau en a déposé neuf, qui couvrent 42 464 hectares, soit 12,8 % de son territoire : si tout passait, la part protégée de la MRC monterait de 5,5 % à 18,3 %. Le troisième de ces projets porte le nom « Projet d'aire protégée de Duhamel, Lac-des-Plages et Chénéville », il est déposé sous le statut d'utilisation durable, et sa carte publiée le 22 octobre 2025 englobe le secteur des claims de La Loutre. Le Regroupement de protection des lacs de la Petite-Nation a déposé de son côté le projet Marie-Lefranc-Petite-Nation, plus de 100 km² le long de la rive est du lac Gagnon dans la réserve faunique Papineau-Labelle, jugé admissible par le ministère dès septembre 2024.",
    },
    jalonsTitre: 'Où en est la démarche',
    jalonsEtiquette: 'Le fil du dossier',
    jalons: [
      { date: '5 juin 2024', titre: "Québec ouvre l'appel à projets", texte: "Le ministère invite les MRC, les organismes et les communautés à proposer des aires protégées en territoire public méridional." },
      { date: '15 octobre 2024', titre: 'Fin du dépôt des propositions', texte: 'La MRC de Papineau dépose ses neuf projets. Les résolutions d\'appui des MRC devaient suivre avant le 10 janvier 2025.' },
      { date: '31 août 2025', titre: 'Référendum dans les cinq municipalités', texte: "Plus de 90 % des votants rejettent le projet minier. L'Alliance annonce des résolutions et la recherche d'outils comme l'aire protégée." },
      { date: '10 septembre 2025', titre: 'La concertation régionale démarre en Outaouais', texte: 'Le CREDDO lance les tables de concertation qui doivent évaluer les 47 propositions reçues pour la région.' },
      { date: '22 octobre 2025', titre: 'La MRC publie la fiche du projet', texte: 'La carte du projet de Duhamel, Lac-des-Plages et Chénéville est mise en ligne avec les huit autres.' },
      { date: '15 avril 2026', titre: "La MRC déclare l'activité minière incompatible", texte: 'Résolution unanime du conseil des maires : exploration et exploitation minières sont incompatibles avec la vocation du territoire.' },
      { date: 'mai 2026', titre: 'Un mémoire à 100 000 $', texte: "Les maires réservent jusqu'à 100 000 $ pour un mémoire d'experts destiné au BAPE. La firme doit être choisie d'ici décembre 2026." },
      { date: '30 août 2026', titre: "L'assemblée de Chénéville", texte: "L'Alliance présente l'aire protégée de 115 km² devant 400 personnes. Le maire de Lac-des-Plages en est le porte-parole." },
      { date: 'début septembre 2026', titre: 'Lac-des-Plages réaffirme son appui', texte: "La municipalité redit son soutien à la démarche. Nous cherchons encore le texte de la résolution pour le verser ici." },
      { date: 'automne 2026', titre: 'Fin des tables de concertation', texte: 'Le ministère prévoit la fin des concertations régionales vers octobre 2026, avec des recommandations par région.', avenir: true },
      { date: '2027', titre: 'Analyse interministérielle et décision', texte: 'Québec analyse les projets recommandés, consulte les communautés autochtones et les MRC, puis décide. Une mise en réserve du territoire est possible entre-temps.', avenir: true },
    ] as Jalon[],
    porteurs: {
      etiquette: 'Qui porte le projet',
      titre: 'Cinq municipalités, une MRC et les gens des lacs',
      liste: [
        { nom: "L'Alliance des municipalités de la Petite-Nation Nord", role: "Lac-des-Plages (Jérémie Vachon), Duhamel (David Pharand), Chénéville (Maxime Proulx-Cadieux), Lac-Simon (Sylvie Potvin) et Saint-Émile-de-Suffolk (Hugo Desormeaux). Créée le 20 décembre 2023, elle a présenté le contre-plan." },
        { nom: 'La MRC de Papineau', role: "Préfet Paul-André David. La MRC a déposé le projet au ministère, a déclaré l'activité minière incompatible et finance le mémoire pour le BAPE." },
        { nom: 'Le Regroupement de protection des lacs de la Petite-Nation', role: 'Présidé par Louis Saint-Hilaire. Il porte le projet voisin Marie-Lefranc-Petite-Nation et appuie la démarche.' },
        { nom: 'La Chambre de commerce de la Petite-Nation', role: "Présidée par Hélène Léger. Elle défend une économie qui tient compte des lacs et du territoire." },
        { nom: 'Le CREDDO', role: "Le conseil régional de l'environnement de l'Outaouais anime les tables de concertation qui recommanderont les projets au ministère." },
      ],
    },
    agir: {
      etiquette: 'Pour agir',
      titre: 'Le dossier avance quand des gens le poussent',
      texte:
        "La concertation régionale se termine cet automne, et c'est maintenant que les appuis comptent. Vous pouvez fonder un groupe dans votre municipalité, inscrire un rendez-vous avec les actions à prendre, et suivre chaque semaine ce que Québec, la MRC et la minière publient.",
      groupes: 'Fonder ou rejoindre un groupe',
      rendezVous: 'Voir les rendez-vous',
      carte: 'Voir les claims sur la carte',
      juridique: 'Lire le cadre juridique',
    },
    sourcesTitre: 'Sources',
    sourcesTexte: 'Chaque fait de cette page renvoie à un document public. Rien ici ne vient de mémoire.',
  },
  en: {
    surtitre: 'File',
    titre: 'The protected area, the Petite-Nation counter-plan',
    intro:
      'On Sunday, August 30, 2026, one year to the day after the referendum, the Alliance of the municipalities of Petite-Nation Nord presented its answer to the La Loutre project before 400 people gathered at the Centre St-Félix-de-Valois in Chénéville. The answer fits in one idea: a 115 km² sustainable-use protected area covering the whole territory under mining claims. This page gathers what we know about the project, what it really forbids, who carries it and where it stands inside the Québec process.',
    verifie: 'Sources read on September 8, 2026',
    chiffres: [
      { valeur: '115 km²', legende: 'of territory across Duhamel, Chénéville and Lac-des-Plages' },
      { valeur: '50%', legende: 'at least left to evolve freely, with no extraction of any kind' },
      { valeur: '400', legende: 'people in the Chénéville hall on August 30, 2026' },
      { valeur: '9', legende: 'projects filed by the MRC de Papineau, 42,464 hectares in all' },
    ],
    cloche: {
      etiquette: 'What the status forbids, and what it lets through',
      titre: 'No mine, no claim, but not a glass dome',
      texte:
        'In March 2026 the Ministry of the Environment published the document describing the status. Inside a sustainable-use protected area, mining and the very presence of claims are prohibited, along with oil, gas, reservoir dams, large wind farms and intensive silviculture. The territory splits into two zones with permanent boundaries: a free-evolution zone covering at least half the surface and forming the conservation core, and a smaller exemplary-management zone where forestry, maple production and tourism remain possible under practices defined project by project. The full regime of allowed activities is still being written by the ministry.',
      citation:
        'It is not a glass dome. It is 50% of the territory left to evolve freely, but also 50% where natural resources can be used, under exemplary practices to be set according to each project.',
      auteur: 'Jérémie Vachon, mayor of Lac-des-Plages, to Radio-Canada, August 30, 2026',
      noeud:
        'The deciding point sits in the same ministry document: to be entered in the Register of protected areas, a sustainable-use area cannot contain claims. The thirteen claims held by Lomiko Metals, and soon by Global Battery Materials, will have to fall before Québec can designate the territory. That is where the coming months will be fought.',
    },
    origine: {
      etiquette: 'Where the project comes from',
      titre: 'A call from Québec, an answer from the MRC',
      texte:
        'On June 5, 2024, the Ministry of the Environment opened a call for protected-area projects on public land in southern Québec, following the commitment to protect 30% of the territory by 2030. Proposals were received until October 15, 2024. The MRC de Papineau filed nine of them, covering 42,464 hectares or 12.8% of its territory: if everything passed, the protected share of the MRC would rise from 5.5% to 18.3%. The third project is named "Projet d\'aire protégée de Duhamel, Lac-des-Plages et Chénéville", filed under the sustainable-use status, and its map published on October 22, 2025 takes in the La Loutre claims sector. The Regroupement de protection des lacs de la Petite-Nation filed its own Marie-Lefranc-Petite-Nation project, more than 100 km² along the east shore of Lac Gagnon inside the Papineau-Labelle wildlife reserve, ruled admissible by the ministry in September 2024.',
    },
    jalonsTitre: 'Where the process stands',
    jalonsEtiquette: 'The thread of the file',
    jalons: [
      { date: 'June 5, 2024', titre: 'Québec opens the call for projects', texte: 'The ministry invites MRCs, organizations and communities to propose protected areas on southern public land.' },
      { date: 'October 15, 2024', titre: 'Submissions close', texte: 'The MRC de Papineau files its nine projects. MRC support resolutions were due before January 10, 2025.' },
      { date: 'August 31, 2025', titre: 'Referendum in the five municipalities', texte: 'More than 90% of voters reject the mining project. The Alliance announces resolutions and tools such as a protected area.' },
      { date: 'September 10, 2025', titre: 'Regional consultation starts in Outaouais', texte: 'CREDDO launches the consultation tables that will assess the 47 proposals received for the region.' },
      { date: 'October 22, 2025', titre: 'The MRC publishes the project sheet', texte: 'The map of the Duhamel, Lac-des-Plages and Chénéville project goes online with the eight others.' },
      { date: 'April 15, 2026', titre: 'The MRC declares mining incompatible', texte: 'Unanimous resolution of the council of mayors: mining exploration and extraction are incompatible with the vocation of the territory.' },
      { date: 'May 2026', titre: 'A $100,000 brief', texte: 'The mayors set aside up to $100,000 for an expert brief meant for the BAPE. The firm is to be chosen by December 2026.' },
      { date: 'August 30, 2026', titre: 'The Chénéville assembly', texte: 'The Alliance presents the 115 km² protected area before 400 people. The mayor of Lac-des-Plages is the spokesperson.' },
      { date: 'early September 2026', titre: 'Lac-des-Plages restates its support', texte: 'The municipality repeats its backing of the process. We are still looking for the text of the resolution to post it here.' },
      { date: 'Fall 2026', titre: 'Consultation tables wrap up', texte: 'The ministry expects the regional consultations to end around October 2026, with recommendations per region.', avenir: true },
      { date: '2027', titre: 'Interministerial analysis and decision', texte: 'Québec analyzes the recommended projects, consults Indigenous communities and MRCs, then decides. The territory may be set aside in the meantime.', avenir: true },
    ] as Jalon[],
    porteurs: {
      etiquette: 'Who carries the project',
      titre: 'Five municipalities, one MRC and the lake people',
      liste: [
        { nom: 'The Alliance of the municipalities of Petite-Nation Nord', role: 'Lac-des-Plages (Jérémie Vachon), Duhamel (David Pharand), Chénéville (Maxime Proulx-Cadieux), Lac-Simon (Sylvie Potvin) and Saint-Émile-de-Suffolk (Hugo Desormeaux). Created on December 20, 2023, it presented the counter-plan.' },
        { nom: 'The MRC de Papineau', role: 'Prefect Paul-André David. The MRC filed the project with the ministry, declared mining incompatible and funds the brief for the BAPE.' },
        { nom: 'The Regroupement de protection des lacs de la Petite-Nation', role: 'Chaired by Louis Saint-Hilaire. It carries the neighbouring Marie-Lefranc-Petite-Nation project and backs the process.' },
        { nom: 'The Petite-Nation Chamber of Commerce', role: 'Chaired by Hélène Léger. It argues for an economy that takes the lakes and the land into account.' },
        { nom: 'CREDDO', role: 'The Outaouais regional environmental council runs the consultation tables that will recommend projects to the ministry.' },
      ],
    },
    agir: {
      etiquette: 'To act',
      titre: 'The file moves when people push it',
      texte:
        'The regional consultation ends this fall, and this is when support counts. You can found a group in your municipality, post a gathering with the actions to take, and follow every week what Québec, the MRC and the mining company publish.',
      groupes: 'Found or join a group',
      rendezVous: 'See the gatherings',
      carte: 'See the claims on the map',
      juridique: 'Read the legal framework',
    },
    sourcesTitre: 'Sources',
    sourcesTexte: 'Every fact on this page points to a public document. Nothing here comes from memory.',
  },
};

const AireProtegee: React.FC<AireProtegeeProps> = ({ language, setViewState }) => {
  const t = language === 'fr' ? TEXTES.fr : TEXTES.en;

  return (
    <div className="animate-fade-in pb-20">
      <header className="mb-10">
        <p className={`${ETIQUETTE} text-emerald-500 mb-3 flex items-center gap-2`}>
          <TreePine size={12} /> {t.surtitre}
        </p>
        <h2 className="text-3xl md:text-5xl font-serif text-white leading-tight mb-5 max-w-4xl">{t.titre}</h2>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-4xl">{t.intro}</p>
        <p className={`${ETIQUETTE} text-slate-600 mt-4`}>{t.verifie}</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {t.chiffres.map((c) => (
          <div key={c.valeur} className="glass-card rounded-3xl border border-white/5 p-6">
            <p className="font-serif text-3xl md:text-4xl text-emerald-400 leading-none mb-3">{c.valeur}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{c.legende}</p>
          </div>
        ))}
      </div>

      <section className="glass-card rounded-[32px] border border-emerald-500/20 bg-emerald-950/10 p-6 md:p-10 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <p className={`${ETIQUETTE} text-emerald-500 mb-3 flex items-center gap-2`}><ShieldCheck size={12} /> {t.cloche.etiquette}</p>
            <h3 className="text-2xl md:text-3xl font-serif text-white mb-4 leading-snug">{t.cloche.titre}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{t.cloche.texte}</p>
          </div>
          <blockquote className="lg:col-span-2 glass-card rounded-3xl border border-white/5 p-6 h-fit">
            <p className="font-serif text-lg text-white leading-relaxed">« {t.cloche.citation} »</p>
            <footer className="text-xs text-slate-500 mt-4">{t.cloche.auteur}</footer>
          </blockquote>
        </div>
        <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-7">
          <p className="text-sm md:text-base text-amber-100/90 leading-relaxed">{t.cloche.noeud}</p>
        </div>
      </section>

      <section className="glass-card rounded-[32px] border border-white/5 p-6 md:p-10 mb-8">
        <div className="flex items-start gap-5">
          <div className="hidden md:block p-3 bg-slate-900/50 rounded-2xl text-slate-400 border border-white/5"><Landmark size={22} strokeWidth={1.5} /></div>
          <div>
            <p className={`${ETIQUETTE} text-slate-500 mb-3`}>{t.origine.etiquette}</p>
            <h3 className="text-2xl md:text-3xl font-serif text-white mb-4 leading-snug">{t.origine.titre}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{t.origine.texte}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <p className={`${ETIQUETTE} text-slate-500 mb-3`}>{t.jalonsEtiquette}</p>
        <h3 className="text-2xl md:text-3xl font-serif text-white mb-8">{t.jalonsTitre}</h3>
        <ol className="relative ml-1 border-l border-white/10 pl-6 md:pl-10 space-y-6">
          {t.jalons.map((j) => (
            <li key={j.date + j.titre} className="relative">
              <span className={`absolute -left-[29px] md:-left-[45px] top-2 h-2.5 w-2.5 rounded-full ${j.avenir ? 'bg-slate-700 border border-slate-500' : 'bg-emerald-500'}`} />
              <div className={`glass-card rounded-3xl border p-5 md:p-6 ${j.avenir ? 'border-dashed border-white/10' : 'border-white/5'}`}>
                <p className={`${ETIQUETTE} ${j.avenir ? 'text-slate-500' : 'text-emerald-500'} mb-2`}>{j.date}</p>
                <h4 className="text-lg font-bold text-white mb-2 leading-snug">{j.titre}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{j.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-8">
        <p className={`${ETIQUETTE} text-slate-500 mb-3`}>{t.porteurs.etiquette}</p>
        <h3 className="text-2xl md:text-3xl font-serif text-white mb-6">{t.porteurs.titre}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {t.porteurs.liste.map((p) => (
            <div key={p.nom} className="glass-card rounded-3xl border border-white/5 p-6 flex gap-4">
              <div className="shrink-0 p-2.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 h-fit"><Users size={16} /></div>
              <div>
                <h4 className="text-base font-bold text-white mb-2 leading-snug">{p.nom}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{p.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-[32px] border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-transparent p-6 md:p-10 mb-8">
        <p className={`${ETIQUETTE} text-emerald-500 mb-3 flex items-center gap-2`}><Mountain size={12} /> {t.agir.etiquette}</p>
        <h3 className="text-2xl md:text-3xl font-serif text-white mb-4 leading-snug">{t.agir.titre}</h3>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl mb-6">{t.agir.texte}</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setViewState(ViewState.RESEAU)} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-xs font-bold text-black hover:bg-emerald-400 transition-all"><Network size={14} /> {t.agir.groupes}</button>
          <button onClick={() => setViewState(ViewState.RESEAU)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all"><CalendarDays size={14} /> {t.agir.rendezVous}</button>
          <button onClick={() => setViewState(ViewState.CLAIMS)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all"><Map size={14} /> {t.agir.carte}</button>
          <button onClick={() => setViewState(ViewState.LAWS)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all">{t.agir.juridique} <ArrowRight size={14} /></button>
        </div>
      </section>

      <section className="glass-card rounded-[32px] border border-white/5 p-6 md:p-8">
        <h3 className="text-xl font-serif text-white mb-2">{t.sourcesTitre}</h3>
        <p className="text-xs text-slate-500 mb-5">{t.sourcesTexte}</p>
        <ul className="space-y-2">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors">
                <ExternalLink size={13} className="shrink-0 mt-1 text-slate-600 group-hover:text-emerald-500" />
                <span className="leading-relaxed break-words">{s.nom}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AireProtegee;
