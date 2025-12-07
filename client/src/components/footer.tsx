import { motion } from "framer-motion";
import { Code2, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <span className="font-semibold">DEV</span>
          </div>

          <p className="text-muted-foreground text-sm flex items-center gap-1">
            Сделано с <Heart className="w-4 h-4 text-destructive fill-destructive" /> в {currentYear}
          </p>

          <nav className="flex items-center gap-4">
            {["Главная", "О себе", "Проекты", "Контакты"].map((item) => (
              <a
                key={item}
                href={`#${item === "Главная" ? "hero" : item === "О себе" ? "about" : item === "Проекты" ? "projects" : "contact"}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`footer-link-${item.toLowerCase()}`}
                data-cursor-hover
              >
                {item}
              </a>
            ))}
          </nav>
        </motion.div>
      </div>
    </footer>
  );
}
