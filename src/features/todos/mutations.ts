import { useMutation, useQueryClient } from '@tanstack/react-query';

import { clearCompleted, createTodo, deleteTodo, updateTodo } from '@/api/todos';
import type { Todo } from '@/api/types';

export const TODOS_KEY = ['todos'] as const;

type Snapshot = { previous: Todo[] | undefined };

function tempTodo(title: string, completed: boolean): Todo {
  const now = new Date().toISOString();
  return {
    id: -Date.now() - Math.floor(Math.random() * 10_000),
    title,
    completed,
    position: Date.now(),
    createdAt: now,
    updatedAt: now,
  };
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, completed = false }: { title: string; completed?: boolean }) =>
      createTodo(title, completed),
    onMutate: async ({ title, completed = false }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY);
      const temp = tempTodo(title, completed);
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) => [temp, ...old]);
      return { previous, tempId: temp.id };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(TODOS_KEY, context.previous);
    },
    onSuccess: (todo, _variables, context) => {
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) =>
        old.map((item) => (item.id === context?.tempId ? todo : item)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      updateTodo(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY);
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) =>
        old.map((todo) =>
          todo.id === id ? { ...todo, completed, updatedAt: new Date().toISOString() } : todo,
        ),
      );
      return { previous } satisfies Snapshot;
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(TODOS_KEY, context.previous);
    },
  });
}

export function useEditTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) => updateTodo(id, { title }),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY);
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) =>
        old.map((todo) =>
          todo.id === id ? { ...todo, title, updatedAt: new Date().toISOString() } : todo,
        ),
      );
      return { previous } satisfies Snapshot;
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(TODOS_KEY, context.previous);
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todo: Todo) => deleteTodo(todo.id),
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY);
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) =>
        old.filter((item) => item.id !== todo.id),
      );
      return { previous } satisfies Snapshot;
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(TODOS_KEY, context.previous);
    },
  });
}

export function useClearCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCompleted,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY);
      queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) =>
        old.filter((todo) => !todo.completed),
      );
      return { previous } satisfies Snapshot;
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(TODOS_KEY, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });
}
