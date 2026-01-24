import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, User, FolderOpen, Mail, Moon, Sun, 
  Terminal, Music, Zap, Copy
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { useTheme } from "@/components/theme-provider";

interface MenuPosition {
  x: number;
  y: number;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  divider?: boolean;
}

export function CustomContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme: themeToggle } = useTheme();

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  }, []);

  const handleToggleTheme = useCallback(() => {
    themeToggle();
    setIsOpen(false);
  }, [themeToggle]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setIsOpen(false);
  }, []);

  const openTerminal = useCallback(() => {
    const terminalButton = document.querySelector('[data-testid="button-terminal-toggle"]') as HTMLButtonElement;
    if (terminalButton) {
      terminalButton.click();
    }
    setIsOpen(false);
  }, []);

  const triggerEasterEgg = useCallback((type: "lofi" | "matrix") => {
    const event = new KeyboardEvent("keydown", {
      key: type === "lofi" ? "K" : "M",
      shiftKey: type === "lofi",
      ctrlKey: type === "matrix",
      bubbles: true,
    });
    window.dispatchEvent(event);
    setIsOpen(false);
  }, []);

  const menuItems: MenuItem[] = [
    {
      label: "Главная",
      icon: <Home className="w-4 h-4" />,
      action: () => scrollToSection("hero"),
    },
    {
      label: "О себе",
      icon: <User className="w-4 h-4" />,
      action: () => scrollToSection("about"),
    },
    {
      label: "Проекты",
      icon: <FolderOpen className="w-4 h-4" />,
      action: () => scrollToSection("projects"),
    },
    {
      label: "Контакты",
      icon: <Mail className="w-4 h-4" />,
      action: () => scrollToSection("contact"),
      divider: true,
    },
    {
      label: theme === "dark" ? "Светлая тема" : "Темная тема",
      icon: theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      action: handleToggleTheme,
    },
    {
      label: "Открыть терминал",
      icon: <Terminal className="w-4 h-4" />,
      action: openTerminal,
      divider: true,
    },
    {
      label: "Lo-Fi плеер",
      icon: <Music className="w-4 h-4" />,
      action: () => triggerEasterEgg("lofi"),
      shortcut: "Shift+K",
    },
    {
      label: "Matrix режим",
      icon: <Zap className="w-4 h-4" />,
      action: () => triggerEasterEgg("matrix"),
      shortcut: "Ctrl+M",
      divider: true,
    },
    {
      label: "Копировать ссылку",
      icon: <Copy className="w-4 h-4" />,
      action: copyLink,
    },
    {
      label: "Telegram",
      icon: <SiTelegram className="w-4 h-4" />,
      action: () => {
        window.open("https://t.me/iristonweb", "_blank");
        setIsOpen(false);
      },
    },
  ];

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 220;
    const menuHeight = menuItems.length * 40 + 20;
    
    let x = e.clientX;
    let y = e.clientY;
    
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    setPosition({ x, y });
    setIsOpen(true);
  }, [menuItems.length]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  const handleScroll = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [handleContextMenu, handleClickOutside, handleScroll]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-[100] bg-card border border-card-border rounded-md shadow-xl py-2 min-w-[200px]"
          style={{ left: position.x, top: position.y }}
          data-testid="custom-context-menu"
        >
          {menuItems.map((item, index) => (
            <div key={index}>
              <button
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover-elevate transition-colors"
                data-testid={`context-menu-item-${index}`}
              >
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                    {item.shortcut}
                  </span>
                )}
              </button>
              {item.divider && (
                <div className="my-1 border-t border-card-border" />
              )}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
