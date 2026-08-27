import { StudySubject, StudyDayTopic } from '../types';

export const MEDICAL_CURRICULUM: StudySubject[] = [
  {
    id: 'ana',
    code: 'ANA',
    name: 'Anatomy',
    cls: 'subj-ana',
    tagline: 'Gross anatomy, embryology and histology — 200L Nigerian medical syllabus.',
    modules: [
      {
        code: 'ANA 201',
        title: 'General anatomy & lower limb',
        days: [
          {
            t: 'Anatomical position, planes and terminology',
            b: 'Learn standard positional and directional terms and the three body planes.',
            a: 'Cloze cards pairing each term with its opposite, e.g. "proximal → {{c1::distal}}".',
            r: ['Define anatomical position and list 6 directional terms with their opposites.', 'What are the three cardinal planes, and what do they each divide the body into?'],
            m: 40,
          },
          {
            t: 'Classification of bones, joints and muscles',
            b: 'Group bones by shape, joints by structure and movement, and muscles by fibre arrangement.',
            a: 'A table card classifying each joint type with one worked example.',
            r: ['Classify the hip joint and the elbow joint by structure and movement type.', 'Name the six subtypes of synovial joint with one example of each.'],
            m: 45,
          },
          {
            t: 'Bones of the lower limb',
            b: 'Learn the major landmarks on the hip bone, femur, tibia and fibula.',
            a: 'Image-occlusion card of each bone, revealing one landmark at a time.',
            r: ['Name the three parts of the hip bone and where they fuse.', 'List 4 palpable landmarks each on the femur and tibia.'],
            m: 55,
          },
          {
            t: 'Gluteal region, femoral and sciatic nerve supply',
            b: 'Map the gluteal muscles, the femoral triangle, and the course of the femoral and sciatic nerves.',
            a: 'Cloze card for the femoral triangle boundaries and contents (NAVEL mnemonic).',
            r: ['What are the boundaries and contents of the femoral triangle?', "Trace the sciatic nerve's course and where it divides."],
            m: 50,
          },
          {
            t: 'Compartments of thigh and leg',
            b: 'Learn the fascial compartments of the thigh and leg, muscle groups, and neurovascular bundles.',
            a: 'Table card: compartment / muscles / nerve / action.',
            r: ['List the muscles, nerve and action of the anterior thigh compartment.', 'Compare the anterior and posterior compartments of the leg.'],
            m: 45,
          },
        ],
      },
      {
        code: 'ANA 212',
        title: 'Abdomen, pelvis & perineum',
        days: [
          {
            t: 'Layers of the anterior abdominal wall',
            b: 'Learn the 9 layers from skin to peritoneum, and rectus sheath variation above/below arcuate line.',
            a: 'Cloze list card ordering the layers superficial to deep.',
            r: ['List the layers of the anterior abdominal wall from skin to peritoneum.', 'How does the rectus sheath differ above and below the arcuate line?'],
            m: 45,
          },
          {
            t: 'Peritoneum and relations of abdominal viscera',
            b: 'Distinguish intraperitoneal from retroperitoneal organs and trace the major peritoneal folds.',
            a: 'Table card sorting organs into intra- vs retroperitoneal.',
            r: ['List 5 retroperitoneal organs.', 'What is the difference between the greater and lesser omentum?'],
            m: 45,
          },
          {
            t: 'GI tract gross anatomy, stomach to rectum',
            b: 'Walk through each part of the gut tube, its peritoneal relations, and blood supply.',
            a: 'Cloze card mapping each gut region to its arterial supply.',
            r: ['Which artery supplies the midgut, and where does midgut territory end?', 'Describe the anatomical relations of the duodenum.'],
            m: 55,
          },
          {
            t: 'Pelvic viscera and the perineum',
            b: 'Learn the bladder, rectum and reproductive organs in the pelvis, plus perineal triangles.',
            a: 'Diagram-occlusion card of the pelvic floor and perineal triangles.',
            r: ['What separates the urogenital triangle from the anal triangle?', 'Describe the relations of the bladder in males vs females.'],
            m: 50,
          },
        ],
      },
      {
        code: 'ANA 213',
        title: 'Upper limb & thorax',
        days: [
          {
            t: 'Bones and joints of the upper limb',
            b: 'Learn landmarks of the clavicle, scapula, humerus, radius and ulna, and major joints.',
            a: 'Image-occlusion of scapula landmarks: spine, acromion, glenoid, borders.',
            r: ['Name the movements at the shoulder joint and the muscles producing each.', 'What structures form the elbow joint, and what movements does it allow?'],
            m: 50,
          },
          {
            t: 'Brachial plexus, axilla boundaries and contents',
            b: 'Build the plexus from roots to terminal branches and learn what runs through the axilla.',
            a: 'Diagram-occlusion of the plexus: roots, trunks, divisions, cords, branches.',
            r: ['Draw the brachial plexus and label its five terminal branches.', 'What are the four walls of the axilla, and its contents?'],
            m: 60,
          },
          {
            t: 'Thoracic wall, cavity and mediastinum',
            b: 'Learn rib articulations, intercostal spaces, and subdivisions of the mediastinum with contents.',
            a: 'Table card listing mediastinal subdivisions and structures in each.',
            r: ['What structures lie in the superior mediastinum?', 'Describe the neurovascular bundle of an intercostal space.'],
            m: 50,
          },
          {
            t: 'Surface anatomy of the heart and great vessels',
            b: 'Learn the surface markings of the four heart borders, valves, and great vessels.',
            a: 'Cloze card for valve auscultation points and their surface positions.',
            r: ['Where do you auscultate the mitral and aortic valves on the chest wall?', 'Describe the surface markings of the four heart borders.'],
            m: 45,
          },
        ],
      },
      {
        code: 'ANA 216',
        title: 'Neuroanatomy',
        days: [
          {
            t: 'Gross organisation of brain and spinal cord',
            b: 'Learn the major divisions of the brain and the layout of grey and white matter in the spinal cord.',
            a: 'Diagram-occlusion of a spinal cord cross-section.',
            r: ['Name the major subdivisions of the brain and one structure in each.', 'Describe the arrangement of grey and white matter in the spinal cord.'],
            m: 45,
          },
          {
            t: 'The ventricular system and CSF circulation',
            b: 'Trace CSF from production in the choroid plexus through ventricles to reabsorption.',
            a: 'Ordered cloze card for the full CSF pathway.',
            r: ['Trace CSF flow from the lateral ventricles to the subarachnoid space.', 'What is hydrocephalus, and where can CSF flow be obstructed?'],
            m: 45,
          },
          {
            t: 'Blood supply of the brain and circle of Willis',
            b: 'Learn internal carotid and vertebrobasilar systems and the circle of Willis.',
            a: 'Diagram-labelling card of the circle of Willis.',
            r: ['Which vessels form the circle of Willis?', 'What area does the middle cerebral artery supply, and what deficit follows occlusion?'],
            m: 50,
          },
          {
            t: 'Major ascending and descending tracts',
            b: 'Learn pathway, decussation point and function of corticospinal, dorsal column and spinothalamic tracts.',
            a: 'Table card: tract / function / decussation level.',
            r: ['Where does the corticospinal tract decussate?', 'Compare the dorsal column and spinothalamic pathways by sensation carried.'],
            m: 55,
          },
        ],
      },
    ],
  },
  {
    id: 'phs',
    code: 'PHS',
    name: 'Physiology',
    cls: 'subj-phs',
    tagline: 'Normal body function, from cellular mechanisms to integrated systems.',
    modules: [
      {
        code: 'PHS 201',
        title: 'General & cell physiology',
        days: [
          {
            t: 'Cell membrane structure and transport mechanisms',
            b: 'Learn the fluid mosaic model, passive diffusion, active transport, and secondary transport.',
            a: 'Table card comparing transport types by energy requirement and examples.',
            r: ['Compare facilitated diffusion and primary active transport.', 'What factors determine the rate of simple diffusion across a membrane?'],
            m: 40,
          },
          {
            t: 'Resting membrane potential and Nernst equation',
            b: 'Understand differential ion permeability (K+) and the Na+/K+ ATPase in establishing RMP.',
            a: 'Cloze card for the Nernst equation and typical RMP value (-70 to -90 mV).',
            r: ['Why is resting membrane potential closer to K+ equilibrium potential than Na+?', 'What role does the Na+/K+ ATPase play in maintaining RMP?'],
            m: 45,
          },
          {
            t: 'Homeostasis and feedback control systems',
            b: 'Learn components of control systems: sensor, integrator, effector, and negative vs positive loops.',
            a: 'Cloze card for the 3 components of a feedback loop.',
            r: ['Give a physiological example of positive feedback and explain why it self-limits.', 'Describe the negative feedback loop governing thermoregulation.'],
            m: 35,
          },
        ],
      },
      {
        code: 'PHS 211',
        title: 'Cardiovascular physiology',
        days: [
          {
            t: 'The cardiac cycle and heart sounds',
            b: 'Learn phases of systole and diastole, pressure-volume loops, and valve events producing S1 and S2.',
            a: 'Ordered cloze card for the cardiac cycle phases.',
            r: ['What causes the first and second heart sounds?', 'Describe pressure and volume changes during isovolumetric contraction.'],
            m: 55,
          },
          {
            t: 'Cardiac electrophysiology and ECG basics',
            b: 'Learn conduction pathway from SA node to Purkinje fibres and what each wave represents.',
            a: 'Cloze card matching ECG wave to the electrical event it represents.',
            r: ['What does the QRS complex represent?', 'Trace the normal conduction pathway of the heart.'],
            m: 45,
          },
          {
            t: 'Regulation of blood pressure and cardiac output',
            b: 'Learn determinants of cardiac output (HR x SV) and short/long term arterial pressure regulation.',
            a: 'Cloze card for cardiac output formula and determinants.',
            r: ['What factors determine stroke volume (preload, afterload, contractility)?', 'Compare baroreceptor vs RAAS blood pressure regulation.'],
            m: 45,
          },
        ],
      },
      {
        code: 'PHS 214',
        title: 'Renal physiology & acid–base',
        days: [
          {
            t: 'Nephron structure, GFR and autoregulation',
            b: 'Learn Starling forces at the glomerulus, myogenic mechanism, and tubuloglomerular feedback.',
            a: 'Cloze card for Starling forces at the glomerulus.',
            r: ['What forces determine net filtration pressure at the glomerulus?', 'Describe how macula densa cells regulate GFR.'],
            m: 45,
          },
          {
            t: 'Countercurrent mechanism and urine concentration',
            b: 'Learn how loop of Henle and vasa recta create and maintain the medullary gradient with ADH.',
            a: 'Cloze card for countercurrent multiplier steps.',
            r: ['Explain how the loop of Henle creates a concentration gradient in the medulla.', 'What role does ADH/vasopressin play in collecting duct water reabsorption?'],
            m: 50,
          },
          {
            t: 'Buffers and renal acid-base compensation',
            b: 'Learn the bicarbonate buffer system, Henderson-Hasselbalch equation, and metabolic vs respiratory compensation.',
            a: 'Table card: disorder / primary change / compensation.',
            r: ['How do the kidneys compensate for respiratory acidosis?', 'Describe bicarbonate reabsorption and new HCO3- generation in intercalated cells.'],
            m: 45,
          },
        ],
      },
    ],
  },
  {
    id: 'bch',
    code: 'BCH',
    name: 'Biochemistry',
    cls: 'subj-bch',
    tagline: 'Molecular logic of life — pathways, enzymes, energetics, and clinical correlations.',
    modules: [
      {
        code: 'BCH 202',
        title: 'Protein structure & enzyme kinetics',
        days: [
          {
            t: 'Levels of protein structure and amino acid properties',
            b: 'Learn primary through quaternary structures and chemical properties of the 20 standard amino acids.',
            a: 'Table card: structure level / definition / stabilising bonds.',
            r: ['What bond stabilises the alpha helix and beta sheet?', 'Name 3 amino acids with basic side chains (Lys, Arg, His).'],
            m: 40,
          },
          {
            t: 'Michaelis–Menten kinetics: Km and Vmax',
            b: 'Understand what Km and Vmax represent, Lineweaver-Burk plots, and enzyme affinity.',
            a: 'Cloze card defining Km as substrate concentration at 1/2 Vmax.',
            r: ['What does a low Km tell you about an enzyme’s affinity for substrate?', 'How does a competitive inhibitor change apparent Km and Vmax?'],
            m: 45,
          },
          {
            t: 'Types of enzyme inhibition & clinical enzymology',
            b: 'Compare competitive, non-competitive, and uncompetitive inhibition, plus diagnostic enzymes (ALT, AST, Troponin).',
            a: 'Table card: inhibition type / effect on Km / effect on Vmax.',
            r: ['Compare competitive and non-competitive enzyme inhibition.', 'Which diagnostic enzymes elevate in acute myocardial infarction and hepatic necrosis?'],
            m: 40,
          },
        ],
      },
      {
        code: 'BCH 205',
        title: 'Carbohydrate metabolism & bioenergetics',
        days: [
          {
            t: 'Glycolysis & gluconeogenesis pathways',
            b: 'Learn the 10 steps of glycolysis, 3 irreversible regulatory steps, and gluconeogenic bypass enzymes.',
            a: 'Ordered cloze card for regulatory enzymes: Hexokinase, PFK-1, Pyruvate kinase.',
            r: ['What are the three rate-limiting, regulated steps of glycolysis?', 'Which enzymes bypass these in gluconeogenesis?'],
            m: 60,
          },
          {
            t: 'TCA (Krebs) cycle and electron transport chain',
            b: 'Trace acetyl-CoA oxidation, NADH/FADH2 generation, proton gradient generation, and ATP synthase.',
            a: 'Ordered cloze card for the TCA cycle intermediates.',
            r: ['How many NADH, FADH2 and GTP molecules are produced per turn of the TCA cycle?', 'Describe how the proton gradient powers ATP synthase (Complex V).'],
            m: 55,
          },
          {
            t: 'Glycogen metabolism and hormonal regulation',
            b: 'Learn glycogen synthase vs glycogen phosphorylase, and regulation by insulin, glucagon, and adrenaline.',
            a: 'Cloze card for reciprocal regulation of glycogen synthesis and breakdown.',
            r: ['How does glucagon trigger glycogenolysis in the liver via cAMP?', 'Why does muscle glycogen not directly contribute to blood glucose?'],
            m: 45,
          },
        ],
      },
    ],
  },
];

export const FLATTENED_TOPICS: StudyDayTopic[] = MEDICAL_CURRICULUM.flatMap(s =>
  s.modules.flatMap((m, mi) =>
    m.days.map((d, di) => ({
      id: `${s.id}_${mi}_${di}`,
      moduleId: `${s.id}_${mi}`,
      moduleCode: m.code,
      moduleTitle: m.title,
      subjectId: s.id,
      subjectCode: s.code,
      dayNum: di + 1,
      dayTotal: m.days.length,
      t: d.t,
      b: d.b,
      a: d.a,
      r: d.r,
      m: d.m,
    }))
  )
);
