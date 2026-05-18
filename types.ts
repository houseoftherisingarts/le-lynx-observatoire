

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  NEWS = 'NEWS',
  ARCHIVES = 'ARCHIVES',
  CLAIMS = 'CLAIMS',
  LAWS = 'LAWS',
  LIBRARY = 'LIBRARY',
  CHAT = 'CHAT',
  COMMUNITY = 'COMMUNITY',
  ADMIN = 'ADMIN',
  SUBMIT_PROJECT = 'SUBMIT_PROJECT',
}

export type Language = 'fr' | 'en' | 'ani';

export interface User {
  id: string;
  name: string;
  email: string;
  hasVotedNoInReferendum: boolean; // Did they vote NO in 2025?
  avatar?: string;
  phone?: string;
  implicationLevel?: number; // 1-5
  skills?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  snippet: string;
  url?: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  type: 'Rassemblement' | 'Juridique' | 'Conférence' | 'Action';
}

export interface ClaimStatus {
  id: string;
  sector: string;
  status: 'Actif' | 'En attente' | 'Suspendu' | 'Révoqué';
  lastUpdate: string;
  coordinates: string;
}

export interface LawItem {
  id: string;
  name: string;
  year: number;
  description: string;
  status: 'Vigueur' | 'Abrogée' | 'Projet de loi';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface ProjectSubmission {
  id: string;
  projectName: string;
  type: string;
  location: string;
  description: string;
  submittedBy: string;
  contactEmail: string;
  date: string;
}

export interface CalmPost {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}