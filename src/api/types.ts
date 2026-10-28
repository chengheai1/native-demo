export type User = {
  id: number;
  email: string;
  name: string;
  pictureUrl: string | null;
  isDemo: boolean;
};

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthConfig = {
  google: boolean;
  demo: boolean;
};

export type TodoFilter = 'all' | 'active' | 'done';
