import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiTelegram } from "react-icons/si";

const roles = ["Fullstack Разработчик", "Архитектор решений", "Создатель продуктов"];
const TELEGRAM_BOT_USERNAME = ((import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) || "iristonweb")
  .trim()
  .replace(/^@+/, "");

export function HeroSection() {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentRole = roles[currentRoleIndex];
    const typingSpeed = isDeleting ? 50 : 100;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayedText.length < currentRole.length) {
          setDisplayedText(currentRole.slice(0, displayedText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayedText.length > 0) {
          setDisplayedText(displayedText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentRoleIndex((prev) => (prev + 1) % roles.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, currentRoleIndex]);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="min-h-screen flex items-center justify-center relative pt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Цифровая студия веб-разработки
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-foreground">Привет, я </span>
            <span className="text-primary">IRSON</span>
          </motion.h1>

          <motion.div
            className="h-16 sm:h-20 flex items-center justify-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-2xl sm:text-3xl md:text-4xl font-mono text-muted-foreground">
              {displayedText}
              <span className="inline-block w-[3px] h-8 sm:h-10 bg-primary ml-1 animate-typewriter-cursor" />
            </span>
          </motion.div>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            Разрабатываю сайты, веб-приложения и SaaS-платформы под ключ.
            От идеи до запуска — с фокусом на качество, сроки и результат для бизнеса.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => scrollToSection("#projects")}
              data-testid="button-view-projects"
              data-cursor-hover
            >
              Посмотреть проекты
              <ArrowDown className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection("#contact")}
              data-testid="button-contact"
              data-cursor-hover
            >
              <Send className="w-4 h-4 mr-2" />
              Связаться
            </Button>
          </motion.div>

          <motion.div
            className="flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Button
              variant="ghost"
              size="icon"
              asChild
              data-testid="link-telegram"
              data-cursor-hover
            >
              <a
                href={`https://t.me/${TELEGRAM_BOT_USERNAME || "iristonweb"}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
              >
                <SiTelegram className="w-5 h-5" />
              </a>
            </Button>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scrollToSection("#about")}
          className="rounded-full"
          data-testid="button-scroll-down"
          data-cursor-hover
        >
          <ArrowDown className="w-5 h-5" />
        </Button>
      </motion.div>
    </section>
  );
}
