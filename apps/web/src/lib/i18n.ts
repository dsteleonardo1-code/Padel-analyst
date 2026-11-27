import type { ErrorCause, ErrorReason, Level, ShotOutcome, ShotType, Situation, Sport } from "./types";

/** Italian UI catalog. Swap this object to add another language. */
export const it = {
  appName: "Fondocampo",
  tagline: "Analista di padel e tennis, in tasca.",
  example: "ESEMPIO",
  estimate: "STIMA",
  local: "LOCALE",
  manual: "Corretto a mano",
  unobserved: "Non osservato chiaramente",
  unclassified: "Non classificato",
  privacy:
    "In questa versione pubblica il video resta sul telefono. Il link condiviso non include il filmato.",
  heuristicBanner:
    "Stima euristica, senza un modello addestrato. La confidenza dice quanto è fragile il riconoscimento.",
  exampleBanner:
    "ESEMPIO — partita dimostrativa, non ricavata dal tuo video. Numeri e confidenze sono illustrativi.",
  installIos: "Su iPhone: condividi in Safari e scegli «Aggiungi a Home».",
  installAndroid: "Puoi installare Fondocampo e aprirlo a schermo intero.",
  nav: {
    home: "Partite",
    analyze: "Analisi",
    players: "Giocatori",
    compare: "Confronta",
    profile: "Profilo",
  },
} as const;

export const sportLabel: Record<Sport, string> = {
  padel: "Padel",
  tennis: "Tennis",
};

export const levelLabel: Record<Level, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzato",
  competition: "Agonista",
};

export const handLabel = { right: "Destra", left: "Sinistra" } as const;
export const sideLabel = { right: "Destra", left: "Sinistra" } as const;

export const shotLabel: Record<ShotType, string> = {
  serve: "Servizio",
  return: "Risposta",
  forehand: "Dritto",
  backhand: "Rovescio",
  forehand_volley: "Volée di dritto",
  backhand_volley: "Volée di rovescio",
  lob: "Lob",
  smash: "Smash",
  bandeja: "Bandeja",
  vibora: "Víbora",
  bajada: "Uscita di parete",
  contrapared: "Contropared",
  chiquita: "Chiquita",
  slice: "Slice",
  drop_shot: "Drop shot",
  passing: "Passante",
  approach: "Approccio",
  unclassified: "Non classificato",
};

export const outcomeLabel: Record<ShotOutcome, string> = {
  winner: "Vincente",
  unforced_error: "Errore gratuito",
  forced_error: "Errore",
  neutral: "Neutro",
  unclassified: "Non classificato",
};

export const reasonLabel: Record<ErrorReason, string> = {
  net: "Rete",
  long: "Fuori lunghezza",
  wide: "Fuori laterale",
  direct_wall: "Parete diretta",
  double_fault: "Doppio fallo",
  easy_ball: "Palla facile concessa",
  position: "Posizione",
  wrong_shot: "Colpo sbagliato",
};

export const causeLabel: Record<ErrorCause, string> = {
  technique: "Tecnica",
  position: "Posizione",
  shot_selection: "Scelta di colpo",
  decision: "Decisione",
};

export const situationLabel: Record<Situation, string> = {
  defense: "In difesa",
  attack: "In attacco",
  net: "A rete",
  baseline: "A fondo campo",
  transition: "In transizione",
};

export interface DrillCopy {
  title: string;
  explanation: string;
  drill: string;
  success: string;
}

export const drills: Record<string, DrillCopy> = {
  "bandeja|net": {
    title: "Bandeja in rete",
    explanation:
      "La bandeja esce bassa e corta: muore sul nastro invece di scendere oltre, verso il fondo.",
    drill: "Dalla rete, 20 bandeja verso un bersaglio disegnato un metro oltre la rete, a tre quarti di campo.",
    success: "14 su 20 oltre la rete e dentro il campo, per due allenamenti di fila.",
  },
  "bajada|net": {
    title: "Uscita di parete in rete",
    explanation: "Dopo il vetro arrivi tardi e la palla esce piatta, senza passare la rete.",
    drill: "Un compagno ti manda 15 palle sul vetro di fondo. Esci un passo e colpisci in salita verso il fondo avversario.",
    success: "10 uscite su 15 che passano la rete e rimbalzano oltre la linea di servizio.",
  },
  net: {
    title: "Palle in rete",
    explanation: "Troppi colpi non passano il nastro. Manca un filo di altezza e di profondità.",
    drill: "Cesto da fondo campo: 30 palle mirate a un metro oltre la rete, non sulla riga di fondo.",
    success: "24 su 30 oltre la rete, dentro il campo.",
  },
  long: {
    title: "Fuori in lunghezza",
    explanation: "La palla vola oltre la riga di fondo. Il margine di sicurezza è troppo stretto.",
    drill: "20 dritti e rovesci con bersaglio sulla linea di servizio avversaria, non sul vetro.",
    success: "15 su 20 dentro, con almeno un metro di margine dalla riga.",
  },
  wide: {
    title: "Fuori laterale",
    explanation: "La direzione scappa di lato, spesso sul rovescio o sul servizio.",
    drill: "Da fondo, 20 cross verso un cono a un metro dalla riga laterale.",
    success: "15 su 20 dentro il cono.",
  },
  direct_wall: {
    title: "Parete diretta",
    explanation: "In padel la palla tocca il vetro avversario prima di rimbalzare in campo: punto perso.",
    drill: "10 lob e 10 bandeja che devono rimbalzare prima del vetro. Un compagno ferma la palla se va lunga.",
    success: "16 su 20 rimbalzano in campo prima del vetro.",
  },
  double_fault: {
    title: "Doppi falli",
    explanation: "La seconda di servizio non entra. Manca una routine più lenta e più alta.",
    drill: "Due serie da 10 seconde: stesso rituale, bersaglio grande al centro del box.",
    success: "8 seconde su 10 dentro, senza fretta tra un servizio e l'altro.",
  },
  easy_ball: {
    title: "Palle facili concesse",
    explanation: "La palla resta corta e comoda: l'avversario può chiudere senza rischiare.",
    drill: "15 prime volée o chiquita che devono superare la linea di servizio avversaria.",
    success: "11 su 15 profonde, non attaccabili di prima.",
  },
  position: {
    title: "Posizione in campo",
    explanation:
      "L'errore nasce prima del colpo: sei fuori dalla posizione di partenza e arrivi in ritardo o sbilanciato.",
    drill: "Dopo ogni colpo, tocca con il piede un segno al centro della tua metà prima della palla successiva. 12 scambi.",
    success: "In 10 scambi su 12 torni sul segno prima che il compagno o l'avversario colpisca.",
  },
  wrong_shot: {
    title: "Scelta di colpo",
    explanation: "Il colpo scelto non è quello della situazione: rischi quando bastava tenere la palla in gioco.",
    drill: "L'allenatore chiama «tieni» o «chiudi». 20 palle: esegui solo l'ordine, anche se la palla sembra facile.",
    success: "17 scelte su 20 uguali alla consegna.",
  },
  default: {
    title: "Errori da rivedere",
    explanation: "Gli errori sono sparsi. Conviene rivedere i punti in video prima di cambiare il gesto.",
    drill: "Riguarda tre errori, descrivi a voce la causa, poi ripeti il colpo cinque volte in modo più semplice.",
    success: "Tre cause dette ad alta voce e cinque ripetizioni pulite per ciascuna.",
  },
};

export const strengthCopy: Record<string, { title: string; text: string }> = {
  serve: {
    title: "Servizio che mette pressione",
    text: "Quando la prima entra, chiudi o prepari il punto. È un'arma da tenere, non da accelerare a tutti i costi.",
  },
  return: {
    title: "Risposta utile",
    text: "Rimetti la palla in gioco con un margine che ti fa restare nello scambio.",
  },
  forehand: {
    title: "Dritto affidabile",
    text: "Sul dritto trovi profondità e qualche vincente senza regalare il punto.",
  },
  backhand: {
    title: "Rovescio che tiene",
    text: "Il rovescio resta in campo e ti permette di ricostruire lo scambio.",
  },
  forehand_volley: {
    title: "Volée di dritto",
    text: "A rete chiudi con la volée di dritto. Avvicinati quando la palla è alta, non da fondo.",
  },
  backhand_volley: {
    title: "Volée di rovescio",
    text: "La volée di rovescio è corta di gesto e profonda. È uno dei colpi che ti fanno vincere i punti.",
  },
  volley: {
    title: "Gioco a rete",
    text: "Le volée producono vincenti. È la zona in cui oggi rendi di più.",
  },
  smash: {
    title: "Smash",
    text: "Sulla palla alta chiudi il punto. Tienilo per le palle davvero tue.",
  },
  bandeja: {
    title: "Bandeja",
    text: "La bandeja ti fa restare a rete senza regalare il vetro. Quando entra, lo scambio gira dalla tua parte.",
  },
  vibora: {
    title: "Víbora",
    text: "La víbora esce con effetto e crea l'errore avversario. Usala quando hai tempo, non in recupero.",
  },
  passing: {
    title: "Passante",
    text: "Quando l'avversario sale, trovi il varco. È un colpo da non anticipare troppo.",
  },
  default: {
    title: "Colpi che restano in campo",
    text: "In questo colpo sbagli poco e ogni tanto chiudi. Vale la pena difenderlo in allenamento.",
  },
};
