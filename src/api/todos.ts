import { apiFetch } from './client';
import type { Todo } from './types';

export async function listTodos(): Promise<Todo[]> {
  const data = await apiFetch<{ todos: Todo[] }>('/api/todos');
  return data.todos;
}

export async function createTodo(title: string, completed = false): Promise<Todo> {
  const data = await apiFetch<{ todo: Todo }>('/api/todos', {
    method: 'POST',
    body: JSON.stringify({ title, completed }),
  });
  return data.todo;
}

export async function updateTodo(
  id: number,
  changes: { title?: string; completed?: boolean },
): Promise<Todo> {
  const data = await apiFetch<{ todo: Todo }>(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
  return data.todo;
}

export function deleteTodo(id: number): Promise<void> {
  return apiFetch<void>(`/api/todos/${id}`, { method: 'DELETE' });
}

export async function clearCompleted(): Promise<number> {
  const data = await apiFetch<{ deleted: number }>('/api/todos/clear-completed', {
    method: 'POST',
  });
  return data.deleted;
}
