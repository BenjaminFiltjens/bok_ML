import type { BokElementContent } from "../types";

export const DEFAULT_BOK_SLUG = "machine-learning";

export const BOK_ELEMENTS: BokElementContent[] = [
  {
    id: "Machine Learning",
    slug: "machine-learning",
    kind: "method",
    title: "Machine Learning",
    definition:
      "Machine learning is the family of methods that learns patterns from data and uses those patterns to make predictions, classifications, recommendations, or decisions.",
    relationship:
      "The large outer region covers the broad ML toolkit. Supervised, unsupervised, reinforcement, deep learning, foundation models, and generative AI are nested or overlapping ways of doing machine learning.",
    examples: ["Linear and logistic regression", "Decision trees and random forests", "Support vector machines", "Bayesian models", "Recommender systems"],
    useCases: [
      "Forecast demand, delays, loads, risks, or emissions from historical data.",
      "Classify documents, transactions, faults, assets, or operational states.",
      "Support policy and operational choices when patterns are too complex for hand-written rules."
    ],
    cautions: [
      "A model can be accurate on past data and still fail under policy, market, or infrastructure change.",
      "High predictive performance does not automatically mean the model explains causality.",
      "Data quality, missingness, and representativeness usually matter more than algorithm novelty."
    ],
    relatedIds: ["Supervised learning", "Unsupervised learning", "Deep Learning", "ICT", "SDM"]
  },
  {
    id: "Supervised learning",
    slug: "supervised-learning",
    kind: "method",
    title: "Supervised Learning",
    definition:
      "Supervised learning trains a model on examples where the desired answer is already known, such as a label, category, numeric value, or future outcome.",
    relationship:
      "In the BoK map, supervised learning is one of the main ML branches. It is the natural home for classification, regression, forecasting, and many risk-scoring tasks.",
    examples: ["Classification", "Regression", "Forecasting", "Gradient boosting", "Neural-network predictors"],
    useCases: [
      "Predict energy demand, traffic flow, student success, maintenance needs, or delivery delays.",
      "Classify cyber incidents, policy documents, complaints, or infrastructure conditions.",
      "Estimate probabilities for planning, prioritisation, and resource allocation."
    ],
    cautions: [
      "The model can only learn from labels that exist and are trustworthy.",
      "Leakage from future information can make validation look unrealistically strong.",
      "Performance should be checked across relevant groups, regions, time periods, and operating conditions."
    ],
    relatedIds: ["Machine Learning", "Deep Learning", "TLO", "E&I", "SDM"]
  },
  {
    id: "Unsupervised learning",
    slug: "unsupervised-learning",
    kind: "method",
    title: "Unsupervised Learning",
    definition:
      "Unsupervised learning looks for structure in data without a pre-defined answer, often by grouping similar cases, reducing dimensions, or discovering latent topics.",
    relationship:
      "This branch sits beside supervised and reinforcement learning. It is useful when the question is exploratory: what patterns, clusters, or hidden dimensions are present?",
    examples: ["Clustering", "Topic modelling", "Principal component analysis", "UMAP and t-SNE", "Anomaly detection"],
    useCases: [
      "Segment transport users, energy consumers, firms, assets, or documents into meaningful groups.",
      "Discover themes in public comments, policy reports, maintenance logs, or repository metadata.",
      "Flag unusual behaviour when labelled examples of incidents are rare."
    ],
    cautions: [
      "Clusters are mathematical groupings, not automatically meaningful real-world categories.",
      "Results can change strongly with preprocessing choices and distance metrics.",
      "Validation often needs domain experts because there may be no single correct answer."
    ],
    relatedIds: ["Machine Learning", "ICT", "TLO", "E&I"]
  },
  {
    id: "Reinforcement learning",
    slug: "reinforcement-learning",
    kind: "method",
    title: "Reinforcement Learning",
    definition:
      "Reinforcement learning trains an agent to choose actions by receiving rewards or penalties from an environment over time.",
    relationship:
      "It is the branch of ML most directly connected to sequential decisions, control, and adaptive policies. It differs from supervised learning because the right answer is discovered through interaction.",
    examples: ["Q-learning", "Policy gradients", "Actor-critic methods", "Multi-agent learning", "Markov decision processes"],
    useCases: [
      "Optimise control strategies for traffic lights, charging, dispatch, or inventory over time.",
      "Explore adaptive policies in simulated energy, logistics, or infrastructure systems.",
      "Study how multiple agents interact under incentives, constraints, and uncertainty."
    ],
    cautions: [
      "Real-world trial and error can be unsafe or expensive, so simulation quality is critical.",
      "Reward design can accidentally encourage behaviour that satisfies the metric but harms the system.",
      "Policies may be hard to explain to stakeholders who need accountability."
    ],
    relatedIds: ["Machine Learning", "SDM", "TLO", "E&I"]
  },
  {
    id: "Deep Learning",
    slug: "deep-learning",
    kind: "method",
    title: "Deep Learning",
    definition:
      "Deep learning uses neural networks with many layers to learn representations from complex data such as images, text, sensor streams, graphs, or high-dimensional tabular data.",
    relationship:
      "Deep learning is a sub-area inside machine learning. In the map it overlaps with foundation models and generative AI, because those newer methods are usually built on deep neural networks.",
    examples: ["Convolutional neural networks", "Recurrent neural networks", "Transformers", "Graph neural networks", "Autoencoders"],
    useCases: [
      "Analyse images, video, text, telemetry, or IoT streams that are hard to model with hand-crafted features.",
      "Detect faults, classify documents, forecast sequences, or learn representations for downstream tasks.",
      "Build components for larger decision-support and monitoring systems."
    ],
    cautions: [
      "Deep models often need more data, compute, and validation discipline than simpler methods.",
      "Interpretability can be limited unless explainability is designed into the workflow.",
      "A simpler model can be preferable when data is small, stakes are high, or transparency is central."
    ],
    relatedIds: ["Machine Learning", "Foundation Models", "Generative AI", "ICT"]
  },
  {
    id: "Foundation Models",
    slug: "foundation-models",
    kind: "method",
    title: "Foundation Models",
    definition:
      "Foundation models are large models trained on broad data at scale and adapted to many downstream tasks through prompting, fine-tuning, retrieval, or task-specific layers.",
    relationship:
      "Foundation models sit inside deep learning and partially overlap with generative AI. They emphasise reuse: one pre-trained base model can support many applications.",
    examples: ["Large language models", "Vision-language models", "Pretraining", "Transfer learning", "Retrieval-augmented generation"],
    useCases: [
      "Summarise, search, classify, or draft from large collections of policy, engineering, or organisational text.",
      "Support knowledge interfaces for decision makers who need to query complex documentation.",
      "Adapt general models to specific TBM domains using carefully governed data and evaluation."
    ],
    cautions: [
      "Outputs can be fluent but wrong, incomplete, or poorly grounded.",
      "Data privacy, intellectual property, and provenance need explicit governance.",
      "Evaluation should target the real task, not only generic benchmark performance."
    ],
    relatedIds: ["Deep Learning", "Generative AI", "ICT", "SDM"]
  },
  {
    id: "Generative AI",
    slug: "generative-ai",
    kind: "method",
    title: "Generative AI",
    definition:
      "Generative AI creates new content or structured outputs, such as text, images, code, scenarios, synthetic data, or design alternatives, based on learned patterns.",
    relationship:
      "Generative AI is shown inside foundation models and deep learning because many current generative systems are large pre-trained neural models adapted to creative or analytical tasks.",
    examples: ["Large language models", "Diffusion models", "Generative adversarial networks", "Variational autoencoders", "Synthetic data generation"],
    useCases: [
      "Draft and compare policy options, stakeholder messages, reports, or scenario narratives.",
      "Generate synthetic examples for simulation, training, or privacy-preserving experimentation.",
      "Create conversational interfaces over technical and organisational knowledge bases."
    ],
    cautions: [
      "Generated material should be reviewed, sourced, and bounded by domain expertise.",
      "Synthetic data can reproduce bias or invent unrealistic cases.",
      "Human accountability remains necessary when generated outputs influence decisions."
    ],
    relatedIds: ["Foundation Models", "Deep Learning", "ICT", "SDM"]
  },
  {
    id: "TLO",
    slug: "transport-logistics",
    kind: "domain",
    title: "Transport & Logistics",
    definition:
      "Transport & Logistics covers the movement of people, goods, and services through networks, including routing, freight, mobility, aviation, maritime systems, and autonomous operations.",
    relationship:
      "In the BoK map, TLO is an application area around the ML method space. It asks how ML can improve mobility and logistics systems while respecting operational, policy, and societal constraints.",
    examples: ["Routing", "Demand forecasting", "Fleet planning", "Traffic prediction", "Autonomous mobility"],
    useCases: [
      "Forecast demand, congestion, arrival times, or disruptions.",
      "Optimise logistics networks, charging locations, routing, and fleet operations.",
      "Monitor safety, reliability, and emissions across transport systems."
    ],
    cautions: [
      "Transport data is often spatial, temporal, and biased toward measured movements.",
      "Local optimisation can create network-wide or equity effects elsewhere.",
      "Models should account for regulation, infrastructure capacity, and stakeholder behaviour."
    ],
    relatedIds: ["Supervised learning", "Reinforcement learning", "Unsupervised learning", "E&I"]
  },
  {
    id: "ICT",
    slug: "ict",
    kind: "domain",
    title: "ICT",
    definition:
      "ICT covers information and communication technologies, including software platforms, data systems, cybersecurity, natural language systems, cloud services, and digital public infrastructure.",
    relationship:
      "ICT is both an application area and an enabling layer for ML. It supplies data, platforms, interfaces, security concerns, and many text- and software-heavy use cases.",
    examples: ["Cybersecurity", "Natural language processing", "Digital platforms", "Agents", "Cloud and data infrastructure"],
    useCases: [
      "Detect cyber threats, anomalies, misuse, or privacy risks.",
      "Classify, retrieve, and summarise large collections of documents or messages.",
      "Build decision-support interfaces on top of organisational data and software systems."
    ],
    cautions: [
      "Security and privacy risks can increase when ML systems touch sensitive data.",
      "Platform incentives and user behaviour can change once a model is deployed.",
      "Digital systems need monitoring for drift, abuse, and unequal access."
    ],
    relatedIds: ["Foundation Models", "Generative AI", "Deep Learning", "SDM"]
  },
  {
    id: "E&I",
    slug: "energy-industry",
    kind: "domain",
    title: "Energy & Industry",
    definition:
      "Energy & Industry covers energy systems, industrial processes, manufacturing, maintenance, climate and environmental systems, built infrastructure, and production networks.",
    relationship:
      "This application area connects ML to physical assets and industrial transitions. It often combines sensor data, optimisation, control, forecasting, and sustainability goals.",
    examples: ["Predictive maintenance", "Energy forecasting", "Process monitoring", "Industrial optimisation", "Emissions analysis"],
    useCases: [
      "Forecast energy demand, renewable production, prices, or grid stress.",
      "Detect faults and plan maintenance for industrial assets or infrastructure.",
      "Support decarbonisation, circular-economy, and resource-allocation decisions."
    ],
    cautions: [
      "Physical systems have safety constraints that models must not violate.",
      "Historical data may not represent future transition pathways.",
      "Industrial deployment needs integration with existing control, maintenance, and governance processes."
    ],
    relatedIds: ["Supervised learning", "Reinforcement learning", "TLO", "SDM"]
  },
  {
    id: "SDM",
    slug: "system-decision-methods",
    kind: "domain",
    title: "System Decision Methods",
    definition:
      "System Decision Methods focuses on modelling, monitoring, control, and decision support for complex socio-technical systems under uncertainty.",
    relationship:
      "SDM is the application area most directly tied to decision quality. It asks how ML outputs become useful, accountable input for policy, governance, control, and operational choices.",
    examples: ["Decision support", "Monitoring", "Control", "Policy analysis", "Healthcare and public-sector systems"],
    useCases: [
      "Combine ML predictions with simulation, optimisation, or expert judgement.",
      "Monitor complex systems and alert decision makers when conditions change.",
      "Evaluate trade-offs across cost, reliability, fairness, safety, and sustainability."
    ],
    cautions: [
      "A useful decision system needs clear ownership, not only a strong model.",
      "Uncertainty should be communicated in a way decision makers can act on.",
      "Values, accountability, and institutional constraints are part of the system design."
    ],
    relatedIds: ["Machine Learning", "Reinforcement learning", "Foundation Models", "E&I"]
  }
];

export const BOK_BY_ID = new Map(BOK_ELEMENTS.map((element) => [element.id, element]));
export const BOK_BY_SLUG = new Map(BOK_ELEMENTS.map((element) => [element.slug, element]));

export function getBokElementBySlug(slug?: string): BokElementContent {
  return BOK_BY_SLUG.get(slug || "") || BOK_BY_SLUG.get(DEFAULT_BOK_SLUG) || BOK_ELEMENTS[0];
}
