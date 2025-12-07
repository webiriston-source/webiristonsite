import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon, X, Minus, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TerminalLine {
  type: "command" | "output" | "error" | "info";
  content: string;
  id: number;
}

const WELCOME_MESSAGE = `Добро пожаловать в терминал портфолио!
Введите 'help' для списка доступных команд.
`;

const COMMANDS: Record<string, { description: string; handler: () => string }> = {
  help: {
    description: "Показать список доступных команд",
    handler: () => {
      const commandList = Object.entries(COMMANDS)
        .map(([cmd, { description }]) => `  ${cmd.padEnd(12)} - ${description}`)
        .join("\n");
      return `Доступные команды:\n${commandList}`;
    },
  },
  projects: {
    description: "Показать список проектов",
    handler: () => {
      return `Мои проекты:

  1. E-Commerce Platform
     Современная платформа электронной коммерции
     Стек: Next.js, TypeScript, Prisma, PostgreSQL

  2. Task Management App
     Приложение для управления задачами в реальном времени
     Стек: React, Node.js, Socket.io, MongoDB

  3. Analytics Dashboard
     Интерактивный дашборд с визуализацией данных
     Стек: React, TypeScript, D3.js, Recharts

  4. AI Chat Assistant
     Чат-бот с искусственным интеллектом
     Стек: Next.js, OpenAI API, LangChain, Pinecone

  5. Social Media App
     Социальная сеть с лентой и мессенджером
     Стек: React Native, Expo, Firebase, GraphQL

  6. DevOps Monitoring Tool
     Система мониторинга инфраструктуры
     Стек: Go, Prometheus, Grafana, Kubernetes

Используйте навигацию для просмотра деталей проектов.`;
    },
  },
  contact: {
    description: "Показать контактную информацию",
    handler: () => {
      return `Контактная информация:

  Email:    developer@example.com
  Telegram: @developer
  GitHub:   github.com/developer
  LinkedIn: linkedin.com/in/developer

Или используйте форму обратной связи в секции "Контакты".`;
    },
  },
  about: {
    description: "Информация обо мне",
    handler: () => {
      return `Обо мне:

  Я - Fullstack разработчик с опытом более 3 лет.
  Специализируюсь на React, TypeScript и Node.js.
  
  Мой подход:
  - Чистый, поддерживаемый код
  - Фокус на UX и производительности
  - Постоянное обучение
  - Командная работа

Наведите на навыки в секции "О себе" для деталей.`;
    },
  },
  skills: {
    description: "Показать список навыков",
    handler: () => {
      return `Мои навыки:

  Frontend:
    React, Next.js, TypeScript, Tailwind CSS

  Backend:
    Node.js, Prisma, Express, GraphQL

  Базы данных:
    PostgreSQL, MongoDB, Redis

  Инструменты:
    Docker, Git, Figma

Перейдите в секцию "О себе" для интерактивной карты навыков.`;
    },
  },
  clear: {
    description: "Очистить терминал",
    handler: () => "",
  },
  whoami: {
    description: "Кто я?",
    handler: () => "Fullstack Developer | React Enthusiast | Problem Solver",
  },
  date: {
    description: "Показать текущую дату и время",
    handler: () => new Date().toLocaleString("ru-RU"),
  },
  echo: {
    description: "Повторить текст",
    handler: () => "",
  },
  secret: {
    description: "???",
    handler: () => `Вы нашли секрет! Попробуйте следующие комбинации клавиш:
  Shift + K - Аудио-плеер с лоу-фай музыкой
  Ctrl + M  - Matrix режим`,
  },
};

export function InteractiveTerminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "info", content: WELCOME_MESSAGE, id: 0 },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lineIdCounter, setLineIdCounter] = useState(1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const processCommand = useCallback((input: string) => {
    const trimmedInput = input.trim().toLowerCase();
    const [command, ...args] = trimmedInput.split(" ");
    
    let newLines: TerminalLine[] = [
      { type: "command", content: `$ ${input}`, id: lineIdCounter },
    ];
    
    if (command === "") {
      setLineIdCounter(prev => prev + 1);
      return;
    }

    if (command === "clear") {
      setLines([{ type: "info", content: WELCOME_MESSAGE, id: lineIdCounter }]);
      setLineIdCounter(prev => prev + 1);
      return;
    }

    if (command === "echo") {
      const text = args.join(" ");
      newLines.push({ type: "output", content: text || "", id: lineIdCounter + 1 });
    } else if (COMMANDS[command]) {
      const output = COMMANDS[command].handler();
      if (output) {
        newLines.push({ type: "output", content: output, id: lineIdCounter + 1 });
      }
    } else {
      newLines.push({
        type: "error",
        content: `Команда не найдена: ${command}\nВведите 'help' для списка команд.`,
        id: lineIdCounter + 1,
      });
    }

    setLines(prev => [...prev, ...newLines]);
    setLineIdCounter(prev => prev + newLines.length);
    setCommandHistory(prev => [...prev, input]);
    setHistoryIndex(-1);
  }, [lineIdCounter]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      processCommand(currentInput);
      setCurrentInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistory.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput("");
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([{ type: "info", content: WELCOME_MESSAGE, id: lineIdCounter }]);
      setLineIdCounter(prev => prev + 1);
    }
  }, [currentInput, commandHistory, historyIndex, processCommand, lineIdCounter]);

  const toggleTerminal = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(prev => !prev);
    }
  }, [isMinimized]);

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg"
        onClick={toggleTerminal}
        data-testid="button-terminal-toggle"
        data-cursor-hover
      >
        <TerminalIcon className="w-5 h-5" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: isMinimized ? 100 : 0, 
              scale: isMinimized ? 0.9 : 1,
              height: isMinimized ? "auto" : "400px"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 w-[90vw] max-w-xl bg-background border border-card-border rounded-md shadow-xl overflow-hidden"
            data-testid="terminal-window"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-card-border">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">portfolio@terminal</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-6 h-6"
                  onClick={() => setIsMinimized(!isMinimized)}
                  data-testid="button-terminal-minimize"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-6 h-6"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-terminal-close"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <div
                ref={terminalRef}
                className="h-[340px] overflow-y-auto p-4 font-mono text-sm bg-background/95"
                onClick={() => inputRef.current?.focus()}
              >
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className={`whitespace-pre-wrap mb-1 ${
                      line.type === "command"
                        ? "text-primary"
                        : line.type === "error"
                        ? "text-destructive"
                        : line.type === "info"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {line.content}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-primary">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent outline-none caret-primary"
                    spellCheck={false}
                    autoComplete="off"
                    data-testid="input-terminal"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
