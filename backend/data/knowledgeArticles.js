export const STARTER_KNOWLEDGE_ARTICLES = [
  {
    title: "Early warning signs of zoonotic livestock disease",
    slug: "early-warning-signs-of-zoonotic-livestock-disease",
    summary: "How farmers and field officers can spot cross-species disease signals early and reduce spread.",
    category: "ZOONOTIC_DISEASE",
    audienceRoles: ["ALL"],
    reportTypes: ["LIVESTOCK"],
    tags: ["zoonotic", "livestock", "outbreak", "surveillance"],
    actionItems: [
      "Separate affected animals from the rest of the herd.",
      "Avoid handling animals without gloves and handwashing.",
      "Report fever, sudden deaths, or unusual lesions immediately.",
    ],
    bodySections: [
      {
        heading: "What to watch for",
        content: "Sudden deaths, drooling, mouth sores, reduced milk yield, breathing difficulty, abortions, and unexplained fever should always be treated as high-signal events.",
      },
      {
        heading: "Immediate response",
        content: "Isolate affected animals, limit movement in and out of the farm, and record the first day signs were noticed. Contact a vet before selling or slaughtering suspicious stock.",
      },
    ],
    featured: true,
  },
  {
    title: "Safe livestock isolation after a suspected outbreak",
    slug: "safe-livestock-isolation-after-a-suspected-outbreak",
    summary: "A practical isolation checklist for farmers handling a possible herd outbreak.",
    category: "SAFE_PRACTICES",
    audienceRoles: ["FARMER", "VET", "ALL"],
    reportTypes: ["LIVESTOCK"],
    tags: ["isolation", "biosecurity", "livestock"],
    actionItems: [
      "Use a separate enclosure for affected animals.",
      "Disinfect footwear, tools, troughs, and handling areas daily.",
      "Keep a written count of affected and unaffected animals.",
    ],
    bodySections: [
      {
        heading: "Isolation setup",
        content: "Choose a separate pen with minimal contact to other livestock and use dedicated feeding and watering equipment for that group only.",
      },
      {
        heading: "Movement control",
        content: "Do not loan tools, transport animals, or invite traders to the site until a vet confirms the risk has passed.",
      },
    ],
    featured: true,
  },
  {
    title: "Field guide for early crop disease response",
    slug: "field-guide-for-early-crop-disease-response",
    summary: "How to respond when leaves, stems, or fruit show early disease pressure in the field.",
    category: "CROP_PROTECTION",
    audienceRoles: ["ALL"],
    reportTypes: ["CROP"],
    tags: ["crop", "fungal disease", "field scouting", "blight"],
    actionItems: [
      "Mark the affected section of the field.",
      "Photograph the symptoms and note weather conditions.",
      "Avoid moving infected plant material across plots.",
    ],
    bodySections: [
      {
        heading: "First observations",
        content: "Check whether symptoms are spreading in patches or evenly. Note the crop stage, recent rainfall, and whether neighboring fields show similar issues.",
      },
      {
        heading: "Containment",
        content: "Remove heavily damaged plant material only when advised, and avoid irrigation practices that splash infection from one plot to another.",
      },
    ],
    featured: true,
  },
  {
    title: "Flood, standing water, and farm hygiene precautions",
    slug: "flood-standing-water-and-farm-hygiene-precautions",
    summary: "Environmental risk guidance for periods of heavy rain, stagnant water, and contamination pressure.",
    category: "ENVIRONMENTAL_RISK",
    audienceRoles: ["ALL"],
    reportTypes: ["ENVIRONMENT"],
    tags: ["flood", "water", "sanitation", "vector control"],
    actionItems: [
      "Drain standing water where possible.",
      "Protect feed and seed stocks from wet contamination.",
      "Increase mosquito and rodent control around barns and storage.",
    ],
    bodySections: [
      {
        heading: "Water-related risk",
        content: "Standing water can increase mosquito breeding, contaminate feed, and raise the chance of skin and hoof infections in livestock.",
      },
      {
        heading: "Farm hygiene response",
        content: "Keep walkways dry, separate clean water from runoff, and inspect low-lying areas after every heavy rainfall event.",
      },
    ],
    featured: true,
  },
  {
    title: "Vet field verification checklist",
    slug: "vet-field-verification-checklist",
    summary: "A concise checklist for validating severity, evidence quality, and follow-up needs in the field.",
    category: "FIELD_RESPONSE",
    audienceRoles: ["VET", "ADMIN"],
    reportTypes: ["LIVESTOCK", "CROP", "ENVIRONMENT"],
    tags: ["vet", "verification", "field response"],
    actionItems: [
      "Confirm severity against visible evidence and exposure scale.",
      "Collect samples only with proper labeling and chain-of-custody notes.",
      "Leave a written set of actions with the farmer before departing.",
    ],
    bodySections: [
      {
        heading: "Evidence review",
        content: "Compare the farmer report with what you see on site. Record whether the number affected is increasing, stable, or already declining.",
      },
      {
        heading: "Operational handoff",
        content: "If the case remains high risk, notify admin and enter follow-up instructions, sample details, and the next review date before closing the visit.",
      },
    ],
    featured: false,
  },
  {
    title: "Safe handling for suspected anthrax events",
    slug: "safe-handling-for-suspected-anthrax-events",
    summary: "Critical precautions for suspected anthrax exposure in livestock or contaminated carcass sites.",
    category: "ZOONOTIC_DISEASE",
    audienceRoles: ["ALL"],
    reportTypes: ["LIVESTOCK", "ENVIRONMENT"],
    tags: ["anthrax", "carcass disposal", "biosecurity"],
    actionItems: [
      "Do not open or butcher suspicious carcasses.",
      "Alert veterinary authorities immediately.",
      "Keep people, dogs, and scavengers away from the site.",
    ],
    bodySections: [
      {
        heading: "High-risk indicators",
        content: "Sudden death with dark discharge from the nose, mouth, or anus should be treated as an urgent high-risk event until ruled out by professionals.",
      },
      {
        heading: "Containment",
        content: "Mark the site, stop movement through the area, and wait for professional disposal guidance to avoid spreading contamination through soil or water.",
      },
    ],
    featured: true,
  },
  {
    title: "Risk communication checklist for admins",
    slug: "risk-communication-checklist-for-admins",
    summary: "How to publish clear, calm, and action-oriented advisories during an active incident.",
    category: "FIELD_RESPONSE",
    audienceRoles: ["ADMIN"],
    reportTypes: ["LIVESTOCK", "CROP", "ENVIRONMENT"],
    tags: ["admin", "alerts", "communication", "response"],
    actionItems: [
      "State the affected location and the immediate action needed.",
      "Use simple language and avoid unverified claims.",
      "Include who should respond next and when another update will follow.",
    ],
    bodySections: [
      {
        heading: "Message structure",
        content: "Every alert should explain what is happening, who is affected, what to do immediately, and where to seek help or submit a follow-up report.",
      },
      {
        heading: "Escalation discipline",
        content: "If information is still emerging, say so clearly. Fast but uncertain communication is better than silence, provided actions remain conservative and practical.",
      },
    ],
    featured: false,
  },
];
