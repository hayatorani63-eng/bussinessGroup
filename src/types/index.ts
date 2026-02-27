export interface Business {
  id: string;
  name: string;
}

export interface Scenario {
  id: string;
  title: string;
  content: string;
  businessId: string;
  createdAt: string; // ISO string
  confirmed: boolean;
  url?: string;
  status: 'writing' | 'filmed' | 'published';
}

export interface Comment {
  id: string;
  scenarioId: string;
  author: string;
  text: string;
  createdAt: string; // ISO string
}
