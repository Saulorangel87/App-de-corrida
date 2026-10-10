// Referências citadas pelos 11 treinos do catálogo (docs/pesquisa/07-tipos-sessao.md).
// Dados copiados de docs/pesquisa/referencias.md. Nada aqui foi inventado: DOI/URL, tipo de estudo,
// nível de evidência (Oxford CEBM simplificada: 1 = meta-análise/revisão sistemática ... 5 = revisão
// narrativa/opinião de especialista) e o grau de verificação vêm da pesquisa.
import type { references } from "../schema";

export type ReferenceSeed = Pick<typeof references.$inferInsert, "doi" | "url" | "citation" | "studyType"> & {
  /** Chave estável usada para ligar treinos a referências (ex.: "Buist2007"). */
  key: string;
  /** Nível de evidência da pesquisa (1 a 5). Não há coluna no schema: fica só neste arquivo. */
  evidenceLevel: 1 | 2 | 3 | 4 | 5;
  /** Grau de verificação registrado em referencias.md. Não há coluna no schema. */
  verification: string;
};

type RawReference = {
  key: string;
  /** Primeiro autor no formato "Sobrenome AA"; `etAl` indica se há mais autores. */
  firstAuthor: string;
  etAl: boolean;
  year: number;
  title: string;
  journal: string;
  /** volume(número):páginas, como em referencias.md. */
  volPages: string;
  doi?: string;
  url?: string;
  studyType: string;
  evidenceLevel: 1 | 2 | 3 | 4 | 5;
  verification: string;
};

/** "Sobrenome AA, et al. Título. Periódico. Ano;vol:pág." (ou "Sobrenome AA. Título. ..." com autor único). */
function buildCitation(r: RawReference): string {
  const authors = r.etAl ? `${r.firstAuthor}, et al.` : `${r.firstAuthor}.`;
  const title = /[?!.]$/.test(r.title) ? r.title : `${r.title}.`;
  return `${authors} ${title} ${r.journal}. ${r.year};${r.volPages}.`;
}

const raw: RawReference[] = [
  {
    key: "Balsalobre2016",
    firstAuthor: "Balsalobre-Fernández C",
    etAl: true,
    year: 2016,
    title:
      "Effects of Strength Training on Running Economy in Highly Trained Runners: A Systematic Review With Meta-Analysis of Controlled Trials",
    journal: "J Strength Cond Res",
    volPages: "30(8):2361-2368",
    doi: "10.1519/JSC.0000000000001316",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Bacon2013",
    firstAuthor: "Bacon AP",
    etAl: true,
    year: 2013,
    title: "VO2max trainability and high intensity interval training in humans: a meta-analysis",
    journal: "PLoS One",
    volPages: "8(9):e73182",
    doi: "10.1371/journal.pone.0073182",
    studyType: "Meta-análise",
    evidenceLevel: 1,
    verification: "texto completo (introdução, métodos e discussão parciais)",
  },
  {
    key: "Barnes2013",
    firstAuthor: "Barnes KR",
    etAl: true,
    year: 2013,
    title: "Effects of different uphill interval-training programs on running economy and performance",
    journal: "Int J Sports Physiol Perform",
    volPages: "8(6):639-647",
    doi: "10.1123/ijspp.8.6.639",
    studyType: "Ensaio clínico randomizado (n = 20)",
    evidenceLevel: 2,
    verification: "resumo",
  },
  {
    key: "Berryman2018",
    firstAuthor: "Berryman N",
    etAl: true,
    year: 2018,
    title: "Strength Training for Middle- and Long-Distance Performance: A Meta-Analysis",
    journal: "Int J Sports Physiol Perform",
    volPages: "13(1):57-63",
    doi: "10.1123/ijspp.2017-0032",
    studyType: "Meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Bertelsen2018",
    firstAuthor: "Bertelsen ML",
    etAl: true,
    year: 2018,
    title: "The start-to-run distance and running-related injury among obese novice runners: a randomized trial",
    journal: "Int J Sports Phys Ther",
    volPages: "13(6):943-955",
    doi: "10.26603/ijspt20180943",
    studyType: "Ensaio randomizado (n = 56)",
    evidenceLevel: 2,
    verification: "resumo",
  },
  {
    key: "Billat2001a",
    firstAuthor: "Billat LV",
    etAl: false,
    year: 2001,
    title:
      "Interval training for performance: a scientific and empirical practice. Special recommendations for middle- and long-distance running. Part I: aerobic interval training",
    journal: "Sports Med",
    volPages: "31(1):13-31",
    doi: "10.2165/00007256-200131010-00002",
    studyType: "Revisão narrativa",
    evidenceLevel: 5,
    verification: "resumo",
  },
  {
    key: "Blagrove2018",
    firstAuthor: "Blagrove RC",
    etAl: true,
    year: 2018,
    title:
      "Effects of Strength Training on the Physiological Determinants of Middle- and Long-Distance Running Performance: A Systematic Review",
    journal: "Sports Med",
    volPages: "48(5):1117-1149",
    doi: "10.1007/s40279-017-0835-7",
    studyType: "Revisão sistemática",
    evidenceLevel: 1,
    verification: "texto completo (PMC5889786)",
  },
  {
    key: "Buist2007",
    firstAuthor: "Buist I",
    etAl: true,
    year: 2007,
    title:
      "The GRONORUN study: is a graded training program for novice runners effective in preventing running related injuries? Design of a Randomized Controlled Trial",
    journal: "BMC Musculoskelet Disord",
    volPages: "8:24",
    doi: "10.1186/1471-2474-8-24",
    studyType: "Protocolo de ensaio randomizado (inclui tabelas dos programas)",
    evidenceLevel: 2,
    verification: "texto completo (PMC1821023)",
  },
  {
    key: "Buist2008",
    firstAuthor: "Buist I",
    etAl: true,
    year: 2008,
    title:
      "No effect of a graded training program on the number of running-related injuries in novice runners: a randomized controlled trial",
    journal: "Am J Sports Med",
    volPages: "36(1):33-39",
    doi: "10.1177/0363546507307505",
    studyType: "Ensaio clínico randomizado",
    evidenceLevel: 2,
    verification: "resumo (Europe PMC)",
  },
  {
    key: "Damsted2018",
    firstAuthor: "Damsted C",
    etAl: true,
    year: 2018,
    title:
      "Is there evidence for an association between changes in training load and running-related injuries? A systematic review",
    journal: "Int J Sports Phys Ther",
    volPages: "13(6):931-942",
    doi: "10.26603/ijspt20180931",
    studyType: "Revisão sistemática",
    evidenceLevel: 1,
    verification: "texto completo (PMC)",
  },
  {
    key: "Denadai2017",
    firstAuthor: "Denadai BS",
    etAl: true,
    year: 2017,
    title:
      "Explosive Training and Heavy Weight Training are Effective for Improving Running Economy in Endurance Athletes: A Systematic Review and Meta-Analysis",
    journal: "Sports Med",
    volPages: "47(3):545-554",
    doi: "10.1007/s40279-016-0604-z",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Dupuy2018",
    firstAuthor: "Dupuy O",
    etAl: true,
    year: 2018,
    title:
      "An Evidence-Based Approach for Choosing Post-exercise Recovery Techniques to Reduce Markers of Muscle Damage, Soreness, Fatigue, and Inflammation: A Systematic Review With Meta-Analysis",
    journal: "Front Physiol",
    volPages: "9:403",
    doi: "10.3389/fphys.2018.00403",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "EsteveLanao2007",
    firstAuthor: "Esteve-Lanao J",
    etAl: true,
    year: 2007,
    title: "Impact of training intensity distribution on performance in endurance athletes",
    journal: "J Strength Cond Res",
    volPages: "21(3):943-949",
    doi: "10.1519/R-19725.1",
    studyType: "Ensaio clínico randomizado (n = 12)",
    evidenceLevel: 2,
    verification: "resumo",
  },
  {
    key: "Faelli2019",
    firstAuthor: "Faelli E",
    etAl: true,
    year: 2019,
    title: "Effects of Two High-intensity Interval Training Concepts in Recreational Runners",
    journal: "Int J Sports Med",
    volPages: "40(10):639-644",
    doi: "10.1055/a-0964-0155",
    studyType: "Ensaio clínico randomizado",
    evidenceLevel: 2,
    verification: "resumo",
  },
  {
    key: "Faude2009",
    firstAuthor: "Faude O",
    etAl: true,
    year: 2009,
    title: "Lactate threshold concepts: how valid are they?",
    journal: "Sports Med",
    volPages: "39(6):469-490",
    doi: "10.2165/00007256-200939060-00003",
    studyType: "Revisão narrativa/sistematizada",
    evidenceLevel: 5,
    verification: "resumo",
  },
  {
    key: "Frandsen2025",
    firstAuthor: "Schuster Brandt Frandsen J",
    etAl: true,
    year: 2025,
    title: "How much running is too much? Identifying high-risk running sessions in a 5200-person cohort study",
    journal: "Br J Sports Med",
    volPages: "59(17):1203-1210",
    doi: "10.1136/bjsports-2024-109380",
    studyType: "Coorte prospectiva exploratória",
    evidenceLevel: 3,
    verification: "texto completo (PMC12421110)",
  },
  {
    key: "Garber2011",
    firstAuthor: "Garber CE",
    etAl: true,
    year: 2011,
    title:
      "American College of Sports Medicine position stand. Quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults: guidance for prescribing exercise",
    journal: "Med Sci Sports Exerc",
    volPages: "43(7):1334-1359",
    doi: "10.1249/MSS.0b013e318213fefb",
    studyType: "Posicionamento oficial",
    evidenceLevel: 4,
    verification: "resumo",
  },
  {
    key: "Helgerud2007",
    firstAuthor: "Helgerud J",
    etAl: true,
    year: 2007,
    title: "Aerobic high-intensity intervals improve VO2max more than moderate training",
    journal: "Med Sci Sports Exerc",
    volPages: "39(4):665-671",
    doi: "10.1249/mss.0b013e3180304570",
    studyType: "Ensaio clínico randomizado (n = 40)",
    evidenceLevel: 2,
    verification: "resumo",
  },
  {
    key: "Jones2019",
    firstAuthor: "Jones AM",
    etAl: true,
    year: 2019,
    title: "The maximal metabolic steady state: redefining the 'gold standard'",
    journal: "Physiol Rep",
    volPages: "7(10):e14098",
    doi: "10.14814/phy2.14098",
    studyType: "Revisão narrativa",
    evidenceLevel: 5,
    verification: "resumo",
  },
  {
    key: "Lauersen2014",
    firstAuthor: "Lauersen JB",
    etAl: true,
    year: 2014,
    title:
      "The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials",
    journal: "Br J Sports Med",
    volPages: "48(11):871-877",
    doi: "10.1136/bjsports-2013-092538",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Lauersen2018",
    firstAuthor: "Lauersen JB",
    etAl: true,
    year: 2018,
    title:
      "Strength training as superior, dose-dependent and safe prevention of acute and overuse sports injuries: a systematic review, qualitative analysis and meta-analysis",
    journal: "Br J Sports Med",
    volPages: "52(24):1557-1563",
    doi: "10.1136/bjsports-2018-099078",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Lenk2025",
    firstAuthor: "Lenk M",
    etAl: true,
    year: 2025,
    title:
      "Impact of weekly frequency of high-intensity interval training on cardiorespiratory, metabolic, and performance measures in recreational runners - An exploratory study",
    journal: "Physiol Rep",
    volPages: "13(18):e70573",
    doi: "10.14814/phy2.70573",
    studyType: "Estudo de intervenção exploratório (n = 26)",
    evidenceLevel: 3,
    verification: "texto completo (PMC12451023; leitura parcial)",
  },
  {
    key: "LlanosLagos2024",
    firstAuthor: "Llanos-Lagos C",
    etAl: true,
    year: 2024,
    title:
      "Effect of Strength Training Programs in Middle- and Long-Distance Runners' Economy at Different Running Speeds: A Systematic Review with Meta-analysis",
    journal: "Sports Med",
    volPages: "54(4):895-932",
    doi: "10.1007/s40279-023-01978-y",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Londeree1997",
    firstAuthor: "Londeree BR",
    etAl: false,
    year: 1997,
    title: "Effect of training on lactate/ventilatory thresholds: a meta-analysis",
    journal: "Med Sci Sports Exerc",
    volPages: "29(6):837-843",
    doi: "10.1097/00005768-199706000-00016",
    studyType: "Meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Milanovic2015",
    firstAuthor: "Milanović Z",
    etAl: true,
    year: 2015,
    title:
      "Effectiveness of High-Intensity Interval Training (HIT) and Continuous Endurance Training for VO2max Improvements: A Systematic Review and Meta-Analysis of Controlled Trials",
    journal: "Sports Med",
    volPages: "45(10):1469-1481",
    doi: "10.1007/s40279-015-0365-0",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Nielsen2014c",
    firstAuthor: "Nielsen RO",
    etAl: true,
    year: 2014,
    title:
      "Running more than three kilometers during the first week of a running regimen may be associated with increased risk of injury in obese novice runners",
    journal: "Int J Sports Phys Ther",
    volPages: "9(3):338-345",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4060311",
    studyType: "Coorte prospectiva (n = 749)",
    evidenceLevel: 3,
    verification: "resumo",
  },
  {
    key: "Ooms2013",
    firstAuthor: "Ooms L",
    etAl: true,
    year: 2013,
    title:
      "Effectiveness of Start to Run, a 6-week training program for novice runners, on increasing health-enhancing physical activity: a controlled study",
    journal: "BMC Public Health",
    volPages: "13:697",
    doi: "10.1186/1471-2458-13-697",
    studyType: "Estudo controlado não randomizado",
    evidenceLevel: 3,
    verification: "texto completo (PMC3735486; seção do programa)",
  },
  {
    key: "Relph2023",
    firstAuthor: "Relph N",
    etAl: true,
    year: 2023,
    title:
      '"Couch-to-5k or Couch to Ouch to Couch!?" Who Takes Part in Beginner Runner Programmes in the UK and Is Non-Completion Linked to Musculoskeletal Injury?',
    journal: "Int J Environ Res Public Health",
    volPages: "20(17):6682",
    doi: "10.3390/ijerph20176682",
    studyType: "Coorte observacional (110 adultos)",
    evidenceLevel: 3,
    verification: "texto completo",
  },
  {
    key: "Rosenblat2019",
    firstAuthor: "Rosenblat MA",
    etAl: true,
    year: 2019,
    title:
      "Polarized vs. Threshold Training Intensity Distribution on Endurance Sport Performance: A Systematic Review and Meta-Analysis of Randomized Controlled Trials",
    journal: "J Strength Cond Res",
    volPages: "33(12):3491-3500",
    doi: "10.1519/JSC.0000000000002618",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Seiler2010",
    firstAuthor: "Seiler S",
    etAl: false,
    year: 2010,
    title: "What is best practice for training intensity and duration distribution in endurance athletes?",
    journal: "Int J Sports Physiol Perform",
    volPages: "5(3):276-291",
    doi: "10.1123/ijspp.5.3.276",
    studyType: "Revisão narrativa",
    evidenceLevel: 5,
    verification: "resumo",
  },
  {
    key: "Videbaek2015",
    firstAuthor: "Videbæk S",
    etAl: true,
    year: 2015,
    title:
      "Incidence of Running-Related Injuries Per 1000 h of running in Different Types of Runners: A Systematic Review and Meta-Analysis",
    journal: "Sports Med",
    volPages: "45(7):1017-1026",
    doi: "10.1007/s40279-015-0333-8",
    studyType: "Revisão sistemática e meta-análise",
    evidenceLevel: 1,
    verification: "texto completo (PMC4473093)",
  },
  {
    key: "Vernillo2017",
    firstAuthor: "Vernillo G",
    etAl: true,
    year: 2017,
    title: "Biomechanics and Physiology of Uphill and Downhill Running",
    journal: "Sports Med",
    volPages: "47(4):615-629",
    doi: "10.1007/s40279-016-0605-y",
    studyType: "Revisão narrativa",
    evidenceLevel: 5,
    verification: "resumo",
  },
  {
    key: "Warneke2025",
    firstAuthor: "Warneke K",
    etAl: true,
    year: 2025,
    title: "Acute and Chronic Effects of Stretching on Running Economy: A Systematic Review with Meta-Analysis",
    journal: "Sports Med Open",
    volPages: "11:61",
    doi: "10.1186/s40798-025-00859-0",
    studyType: "Revisão sistemática com meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
  {
    key: "Wen2019",
    firstAuthor: "Wen D",
    etAl: true,
    year: 2019,
    title:
      "Effects of different protocols of high intensity interval training for VO2max improvements in adults: A meta-analysis of randomised controlled trials",
    journal: "J Sci Med Sport",
    volPages: "22(8):941-947",
    doi: "10.1016/j.jsams.2019.01.013",
    studyType: "Meta-análise",
    evidenceLevel: 1,
    verification: "resumo",
  },
];

export const referenceSeeds: ReferenceSeed[] = raw.map((r) => {
  if (!r.doi && !r.url) {
    throw new Error(`Referência ${r.key} sem DOI nem URL: o seed busca por doi ou url.`);
  }
  return {
    key: r.key,
    doi: r.doi ?? null,
    url: r.url ?? null,
    citation: buildCitation(r),
    studyType: r.studyType,
    evidenceLevel: r.evidenceLevel,
    verification: r.verification,
  };
});

const keys = new Set<string>();
for (const r of referenceSeeds) {
  if (keys.has(r.key)) throw new Error(`Chave de referência duplicada: ${r.key}`);
  keys.add(r.key);
}

export const referenceKeySet: ReadonlySet<string> = keys;
