import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Github, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "@shared/schema";

const projects: Project[] = [
  {
    id: "1",
    title: "E-Commerce Platform",
    description: "Современная платформа электронной коммерции с корзиной, оплатой и админ-панелью.",
    fullDescription: "Полноценная e-commerce платформа, разработанная с нуля. Включает каталог товаров с фильтрацией и поиском, корзину покупок, интеграцию платежных систем, личный кабинет пользователя и полнофункциональную админ-панель для управления товарами и заказами.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
    technologies: ["Next.js", "TypeScript", "Prisma", "PostgreSQL", "Stripe", "Tailwind CSS"],
    githubUrl: "https://github.com",
    liveUrl: "https://example.com",
    problems: "Необходимость обеспечить высокую производительность при большом каталоге товаров и реализовать безопасную обработку платежей.",
    solutions: "Использование ISR для страниц каталога, оптимизация запросов к БД с Prisma, интеграция Stripe для безопасных платежей с webhooks.",
  },
  {
    id: "2",
    title: "Task Management App",
    description: "Приложение для управления задачами в реальном времени с drag-and-drop интерфейсом.",
    fullDescription: "Канбан-доска для управления проектами и задачами. Поддерживает создание досок, колонок и карточек с возможностью перетаскивания. Реализована система уведомлений, комментарии к задачам и синхронизация между пользователями в реальном времени.",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=600&fit=crop",
    technologies: ["React", "Node.js", "Socket.io", "MongoDB", "Redux", "dnd-kit"],
    githubUrl: "https://github.com",
    liveUrl: "https://example.com",
    problems: "Обеспечение плавного drag-and-drop опыта и синхронизация состояния между множеством пользователей.",
    solutions: "Использование dnd-kit для оптимизированного DnD, Socket.io для real-time обновлений и optimistic updates для мгновенного отклика UI.",
  },
  {
    id: "3",
    title: "Analytics Dashboard",
    description: "Интерактивный дашборд с визуализацией данных и аналитикой в реальном времени.",
    fullDescription: "Аналитическая панель для отслеживания бизнес-метрик. Включает интерактивные графики, фильтры по периодам, экспорт отчетов и настраиваемые виджеты. Данные обновляются в реальном времени без перезагрузки страницы.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
    technologies: ["React", "TypeScript", "D3.js", "Recharts", "TanStack Query", "Express"],
    githubUrl: "https://github.com",
    problems: "Визуализация больших объемов данных без потери производительности и поддержка различных типов графиков.",
    solutions: "Виртуализация данных, ленивая загрузка графиков, использование Web Workers для вычислений и кэширование с TanStack Query.",
  },
  {
    id: "4",
    title: "AI Chat Assistant",
    description: "Чат-бот с искусственным интеллектом для автоматизации клиентской поддержки.",
    fullDescription: "Интеллектуальный чат-ассистент на базе OpenAI GPT. Поддерживает контекстные диалоги, обучение на документации компании, интеграцию с CRM и автоматическое создание тикетов поддержки.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
    technologies: ["Next.js", "OpenAI API", "LangChain", "Pinecone", "Redis", "Vercel AI SDK"],
    githubUrl: "https://github.com",
    liveUrl: "https://example.com",
    problems: "Обеспечение релевантных ответов на основе документации и оптимизация затрат на API.",
    solutions: "RAG архитектура с векторной БД Pinecone, streaming responses для быстрого отклика и кэширование частых запросов.",
  },
  {
    id: "5",
    title: "Social Media App",
    description: "Социальная сеть с лентой новостей, сторис и мессенджером.",
    fullDescription: "Мобильно-ориентированная социальная платформа с бесконечной лентой постов, системой лайков и комментариев, stories с автоудалением, приватными сообщениями и push-уведомлениями.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
    technologies: ["React Native", "Expo", "Firebase", "Node.js", "GraphQL", "AWS S3"],
    githubUrl: "https://github.com",
    problems: "Оптимизация производительности ленты с большим количеством медиа-контента и реализация real-time чата.",
    solutions: "Виртуализация списков с FlashList, lazy loading изображений, Firebase Realtime Database для чата и CDN для медиа.",
  },
  {
    id: "6",
    title: "DevOps Monitoring Tool",
    description: "Система мониторинга инфраструктуры с алертами и метриками.",
    fullDescription: "Комплексное решение для мониторинга серверов и приложений. Сбор метрик, визуализация логов, настраиваемые алерты через различные каналы (Slack, Email, SMS) и автоматическое масштабирование.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
    technologies: ["Go", "Prometheus", "Grafana", "Docker", "Kubernetes", "PostgreSQL"],
    githubUrl: "https://github.com",
    problems: "Обработка и хранение больших объемов метрик с минимальной задержкой.",
    solutions: "Time-series база Prometheus, агрегация данных, retention policies и горизонтальное масштабирование сборщиков.",
  },
];

export function ProjectsSection() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <section id="projects" className="py-20 md:py-32 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Портфолио
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Мои проекты</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Подборка проектов, демонстрирующих мой опыт в разработке
            веб-приложений различной сложности
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div
                className="group bg-card border border-card-border rounded-md overflow-visible hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setSelectedProject(project)}
                data-testid={`card-project-${project.id}`}
                data-cursor-hover
              >
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <Badge
                        key={tech}
                        variant="secondary"
                        className="text-xs bg-background/90 backdrop-blur-sm"
                      >
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-background/90 backdrop-blur-sm"
                      >
                        +{project.technologies.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 group-hover:text-primary transition-colors">
                    {project.title}
                    <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {project.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProject.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="relative aspect-video rounded-md overflow-hidden">
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProject.technologies.map((tech) => (
                    <Badge key={tech} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Описание</h4>
                  <p className="text-muted-foreground">
                    {selectedProject.fullDescription}
                  </p>
                </div>

                {selectedProject.problems && (
                  <div>
                    <h4 className="font-semibold mb-2">Проблемы</h4>
                    <p className="text-muted-foreground">
                      {selectedProject.problems}
                    </p>
                  </div>
                )}

                {selectedProject.solutions && (
                  <div>
                    <h4 className="font-semibold mb-2">Решения</h4>
                    <p className="text-muted-foreground">
                      {selectedProject.solutions}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-4">
                  {selectedProject.githubUrl && (
                    <Button variant="outline" asChild data-testid="link-project-github">
                      <a
                        href={selectedProject.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        GitHub
                      </a>
                    </Button>
                  )}
                  {selectedProject.liveUrl && (
                    <Button asChild data-testid="link-project-live">
                      <a
                        href={selectedProject.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть сайт
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
