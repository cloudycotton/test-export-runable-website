import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Todo = {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

type Filter = "all" | "active" | "completed";

export function TodoList() {
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await apiClient.todos.$get();
      if (!res.ok) throw new Error("Failed to fetch todos");
      return res.json() as Promise<Todo[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiClient.todos.$post({
        json: { title },
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setNewTodo("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { title?: string; completed?: boolean };
    }) => {
      const res = await apiClient.todos[":id"].$patch({
        param: { id },
        json: updates,
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.todos[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to delete todo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.todos.completed.$delete();
      if (!res.ok) throw new Error("Failed to clear completed todos");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const activeTodoCount = todos.filter((t) => !t.completed).length;
  const completedTodoCount = todos.filter((t) => t.completed).length;

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      createMutation.mutate(newTodo.trim());
    }
  };

  const handleToggle = (todo: Todo) => {
    updateMutation.mutate({
      id: todo.id,
      updates: { completed: !todo.completed },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Todo App</h1>
        <p className="text-muted-foreground">
          Organize your life, one task at a time
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <form onSubmit={handleAddTodo} className="flex gap-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1"
            disabled={createMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!newTodo.trim() || createMutation.isPending}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              All {todos.length > 0 && `(${todos.length})`}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active {activeTodoCount > 0 && `(${activeTodoCount})`}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed {completedTodoCount > 0 && `(${completedTodoCount})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading todos...
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filter === "all" && "No todos yet. Add one above!"}
              {filter === "active" && "No active todos"}
              {filter === "completed" && "No completed todos"}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => handleToggle(todo)}
                    className="flex-shrink-0"
                  />
                  <button
                    onClick={() => handleToggle(todo)}
                    className="flex-1 text-left flex items-center gap-2"
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={`${
                        todo.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {todo.title}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(todo.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {completedTodoCount > 0 && (
          <div className="pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {activeTodoCount} {activeTodoCount === 1 ? "task" : "tasks"} remaining
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearCompletedMutation.mutate()}
              disabled={clearCompletedMutation.isPending}
            >
              Clear completed
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
