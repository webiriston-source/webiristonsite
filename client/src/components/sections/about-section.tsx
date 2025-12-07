import { useState } from "react";
import { motion } from "framer-motion";
import type { Skill } from "@shared/schema";
import { 
  SiReact, SiNextdotjs, SiTypescript, SiNodedotjs, 
  SiPostgresql, SiMongodb, SiDocker, SiGit,
  SiTailwindcss, SiPrisma, SiRedis, SiFigma
} from "react-icons/si";

const skills: Skill[] = [
  {
    id: "react",
    name: "React",
    icon: "react",
    category: "frontend",
    experience: "3+ года опыта. Разработка SPA, работа с хуками, контекстом и оптимизация производительности.",
    related: ["nextjs", "typescript", "tailwind"],
  },
  {
    id: "nextjs",
    name: "Next.js",
    icon: "nextjs",
    category: "frontend",
    experience: "2+ года. SSR, SSG, API Routes, App Router и оптимизация для продакшена.",
    related: ["react", "typescript", "prisma"],
  },
  {
    id: "typescript",
    name: "TypeScript",
    icon: "typescript",
    category: "frontend",
    experience: "3+ года. Строгая типизация, дженерики, декораторы и интеграция с различными фреймворками.",
    related: ["react", "nextjs", "nodejs"],
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    icon: "tailwind",
    category: "frontend",
    experience: "2+ года. Утилитарный подход, кастомные темы и адаптивный дизайн.",
    related: ["react", "nextjs"],
  },
  {
    id: "nodejs",
    name: "Node.js",
    icon: "nodejs",
    category: "backend",
    experience: "3+ года. REST API, GraphQL, микросервисы и работа с базами данных.",
    related: ["typescript", "postgresql", "mongodb"],
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    icon: "postgresql",
    category: "database",
    experience: "2+ года. Проектирование схем, оптимизация запросов, индексы и миграции.",
    related: ["nodejs", "prisma"],
  },
  {
    id: "mongodb",
    name: "MongoDB",
    icon: "mongodb",
    category: "database",
    experience: "2+ года. NoSQL моделирование, агрегации и репликация.",
    related: ["nodejs"],
  },
  {
    id: "prisma",
    name: "Prisma",
    icon: "prisma",
    category: "backend",
    experience: "1+ год. ORM для TypeScript, миграции и типобезопасные запросы.",
    related: ["typescript", "postgresql", "nodejs"],
  },
  {
    id: "redis",
    name: "Redis",
    icon: "redis",
    category: "database",
    experience: "1+ год. Кэширование, сессии и очереди сообщений.",
    related: ["nodejs"],
  },
  {
    id: "docker",
    name: "Docker",
    icon: "docker",
    category: "tools",
    experience: "2+ года. Контейнеризация, Docker Compose и CI/CD пайплайны.",
    related: ["nodejs", "postgresql"],
  },
  {
    id: "git",
    name: "Git",
    icon: "git",
    category: "tools",
    experience: "4+ года. Branching стратегии, code review и командная работа.",
    related: [],
  },
  {
    id: "figma",
    name: "Figma",
    icon: "figma",
    category: "tools",
    experience: "1+ год. Прототипирование, дизайн-системы и коллаборация с дизайнерами.",
    related: ["tailwind", "react"],
  },
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  react: SiReact,
  nextjs: SiNextdotjs,
  typescript: SiTypescript,
  nodejs: SiNodedotjs,
  postgresql: SiPostgresql,
  mongodb: SiMongodb,
  docker: SiDocker,
  git: SiGit,
  tailwind: SiTailwindcss,
  prisma: SiPrisma,
  redis: SiRedis,
  figma: SiFigma,
};

const categoryColors: Record<string, string> = {
  frontend: "from-blue-500 to-cyan-500",
  backend: "from-green-500 to-emerald-500",
  database: "from-orange-500 to-amber-500",
  tools: "from-purple-500 to-pink-500",
};

const categoryLabels: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Базы данных",
  tools: "Инструменты",
};

export function AboutSection() {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const hoveredSkillData = skills.find((s) => s.id === hoveredSkill);

  return (
    <section id="about" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            О себе
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Мой технологический стек
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Наведите на технологию, чтобы узнать больше о моем опыте работы с ней
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-8">
              {Object.entries(categoryLabels).map(([category, label]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category]}`}
                    />
                    {label}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {skills
                      .filter((skill) => skill.category === category)
                      .map((skill, index) => {
                        const Icon = iconMap[skill.icon];
                        const isHovered = hoveredSkill === skill.id;
                        const isRelated =
                          hoveredSkillData?.related.includes(skill.id);

                        return (
                          <motion.div
                            key={skill.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            onMouseEnter={() => setHoveredSkill(skill.id)}
                            onMouseLeave={() => setHoveredSkill(null)}
                            className={`
                              relative flex items-center gap-2 px-4 py-3 rounded-md
                              bg-card border border-card-border
                              transition-all duration-300
                              ${isHovered ? "ring-2 ring-primary scale-105" : ""}
                              ${isRelated ? "ring-2 ring-primary/50" : ""}
                            `}
                            data-testid={`skill-${skill.id}`}
                            data-cursor-hover
                          >
                            {Icon && (
                              <Icon
                                className={`w-5 h-5 transition-colors ${
                                  isHovered || isRelated
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              />
                            )}
                            <span className="font-medium text-sm">
                              {skill.name}
                            </span>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <div className="bg-card border border-card-border rounded-md p-6 min-h-[300px]">
              {hoveredSkillData ? (
                <motion.div
                  key={hoveredSkillData.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {iconMap[hoveredSkillData.icon] && (
                      <div
                        className={`p-3 rounded-md bg-gradient-to-r ${
                          categoryColors[hoveredSkillData.category]
                        }`}
                      >
                        {(() => {
                          const Icon = iconMap[hoveredSkillData.icon];
                          return <Icon className="w-6 h-6 text-white" />;
                        })()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold">
                        {hoveredSkillData.name}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {categoryLabels[hoveredSkillData.category]}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    {hoveredSkillData.experience}
                  </p>
                  {hoveredSkillData.related.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Связанные технологии:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hoveredSkillData.related.map((relatedId) => {
                          const relatedSkill = skills.find(
                            (s) => s.id === relatedId
                          );
                          if (!relatedSkill) return null;
                          const Icon = iconMap[relatedSkill.icon];
                          return (
                            <span
                              key={relatedId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm"
                            >
                              {Icon && <Icon className="w-4 h-4" />}
                              {relatedSkill.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <SiReact className="w-8 h-8 text-primary animate-rotate-slow" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Исследуйте мои навыки
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Наведите курсор на любую технологию слева, чтобы узнать
                    подробнее о моем опыте
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 p-6 bg-card border border-card-border rounded-md">
              <h3 className="text-lg font-semibold mb-4">Мой подход к работе</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    Чистый, поддерживаемый и хорошо документированный код
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    Фокус на пользовательском опыте и производительности
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    Постоянное обучение и следование лучшим практикам
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    Коммуникация и командная работа в приоритете
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
