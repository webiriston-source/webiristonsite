import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { 
  Calculator, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2,
  Send,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { estimationRequestSchema, type EstimationRequest } from "@shared/schema";
import { resolveReferralPayload } from "@/lib/referral";
import {
  projectTypes,
  features,
  designComplexities,
  urgencies,
  calculateEstimate,
  formatPrice,
  formatDays,
  type EstimationResult,
} from "@/data/estimation-config";

const STEPS = [
  { id: 1, title: "Тип проекта", description: "Выберите тип вашего проекта" },
  { id: 2, title: "Функционал", description: "Какие функции нужны?" },
  { id: 3, title: "Дизайн и сроки", description: "Сложность и срочность" },
  { id: 4, title: "Контакты", description: "Как с вами связаться?" },
];

export function EstimationSection() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const { toast } = useToast();

  const form = useForm<EstimationRequest>({
    resolver: zodResolver(estimationRequestSchema),
    defaultValues: {
      projectType: "",
      features: [],
      designComplexity: "",
      urgency: "",
      budget: "",
      contactName: "",
      contactEmail: "",
      contactTelegram: "",
      description: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: EstimationRequest & { estimation: EstimationResult }) => {
      return apiRequest("POST", "/api/?action=estimate", {
        ...data,
        ...resolveReferralPayload(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Заявка отправлена",
        description: "Свяжусь с вами в ближайшее время для обсуждения деталей.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте позже.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();

  const updateEstimation = () => {
    if (watchedValues.projectType && watchedValues.designComplexity && watchedValues.urgency) {
      const result = calculateEstimate(
        watchedValues.projectType,
        watchedValues.features,
        watchedValues.designComplexity,
        watchedValues.urgency
      );
      setEstimation(result);
    }
  };

  const nextStep = () => {
    if (currentStep === 3) {
      updateEstimation();
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!watchedValues.projectType;
      case 2:
        return true;
      case 3:
        return !!watchedValues.designComplexity && !!watchedValues.urgency;
      case 4:
        return !!watchedValues.contactName && !!watchedValues.contactEmail;
      default:
        return false;
    }
  };

  const onSubmit = (data: EstimationRequest) => {
    if (estimation) {
      setShowResult(true);
      submitMutation.mutate({ ...data, estimation });
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    const current = form.getValues("features");
    if (current.includes(featureId)) {
      form.setValue("features", current.filter(f => f !== featureId));
    } else {
      form.setValue("features", [...current, featureId]);
    }
  };

  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
    setShowResult(false);
    setEstimation(null);
  };

  return (
    <section id="estimate" className="py-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Calculator className="w-4 h-4" />
            Калькулятор стоимости
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Оценка проекта
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Получите предварительную оценку стоимости и сроков вашего проекта за пару минут
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between mb-8">
                {STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex-1 ${index < STEPS.length - 1 ? "relative" : ""}`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          currentStep >= step.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {currentStep > step.id ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className="text-xs mt-2 text-center hidden sm:block">
                        {step.title}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-0.5 ${
                          currentStep > step.id ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <Card>
                <CardContent className="p-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                          >
                            <h3 className="text-lg font-semibold mb-4">
                              Какой проект вы хотите реализовать?
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {projectTypes.map((type) => (
                                <button
                                  key={type.id}
                                  type="button"
                                  onClick={() => form.setValue("projectType", type.id)}
                                  className={`p-4 rounded-md border text-left transition-all hover-elevate ${
                                    watchedValues.projectType === type.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border"
                                  }`}
                                  data-testid={`button-project-type-${type.id}`}
                                >
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    от {formatPrice(type.basePrice)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {currentStep === 2 && (
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                          >
                            <h3 className="text-lg font-semibold mb-4">
                              Какие функции нужны в проекте?
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Выберите все необходимые функции (можно не выбирать)
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {features.map((feature) => (
                                <button
                                  key={feature.id}
                                  type="button"
                                  onClick={() => handleFeatureToggle(feature.id)}
                                  className={`p-4 rounded-md border text-left transition-all hover-elevate ${
                                    watchedValues.features.includes(feature.id)
                                      ? "border-primary bg-primary/5"
                                      : "border-border"
                                  }`}
                                  data-testid={`button-feature-${feature.id}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{feature.label}</span>
                                    {watchedValues.features.includes(feature.id) && (
                                      <Check className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    +{formatPrice(feature.price)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {currentStep === 3 && (
                          <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                          >
                            <div>
                              <h3 className="text-lg font-semibold mb-4">
                                Сложность дизайна
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {designComplexities.map((design) => (
                                  <button
                                    key={design.id}
                                    type="button"
                                    onClick={() => form.setValue("designComplexity", design.id)}
                                    className={`p-4 rounded-md border text-left transition-all hover-elevate ${
                                      watchedValues.designComplexity === design.id
                                        ? "border-primary bg-primary/5"
                                        : "border-border"
                                    }`}
                                    data-testid={`button-design-${design.id}`}
                                  >
                                    <div className="font-medium">{design.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {design.description}
                                    </div>
                                    <Badge variant="secondary" className="mt-2">
                                      x{design.coefficient}
                                    </Badge>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold mb-4">
                                Срочность
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {urgencies.map((urgency) => (
                                  <button
                                    key={urgency.id}
                                    type="button"
                                    onClick={() => form.setValue("urgency", urgency.id)}
                                    className={`p-4 rounded-md border text-left transition-all hover-elevate ${
                                      watchedValues.urgency === urgency.id
                                        ? "border-primary bg-primary/5"
                                        : "border-border"
                                    }`}
                                    data-testid={`button-urgency-${urgency.id}`}
                                  >
                                    <div className="font-medium">{urgency.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {urgency.description}
                                    </div>
                                    <Badge variant="secondary" className="mt-2">
                                      x{urgency.coefficient}
                                    </Badge>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <FormField
                              control={form.control}
                              name="budget"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ваш бюджет (опционально)</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Например: 100 000 ₽"
                                      {...field}
                                      data-testid="input-budget"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        )}

                        {currentStep === 4 && (
                          <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                          >
                            <h3 className="text-lg font-semibold mb-4">
                              Контактная информация
                            </h3>

                            {estimation && (
                              <div className="p-4 rounded-md bg-primary/5 border border-primary/20 mb-6">
                                <div className="text-sm text-muted-foreground mb-2">
                                  Предварительная оценка:
                                </div>
                                <div className="text-2xl font-bold text-primary">
                                  {formatPrice(estimation.minPrice)} — {formatPrice(estimation.maxPrice)}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Сроки: {formatDays(estimation.minDays)} — {formatDays(estimation.maxDays)}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="contactName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Имя *</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Ваше имя"
                                        {...field}
                                        data-testid="input-contact-name"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="contactEmail"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder="email@example.com"
                                        {...field}
                                        data-testid="input-contact-email"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="contactTelegram"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Telegram (опционально)</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="@username"
                                      {...field}
                                      data-testid="input-contact-telegram"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Описание проекта (опционально)</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Расскажите подробнее о вашем проекте..."
                                      className="min-h-[100px]"
                                      {...field}
                                      data-testid="input-description"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex justify-between mt-8 pt-6 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevStep}
                          disabled={currentStep === 1}
                          data-testid="button-prev-step"
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Назад
                        </Button>

                        {currentStep < 4 ? (
                          <Button
                            type="button"
                            onClick={nextStep}
                            disabled={!canProceed()}
                            data-testid="button-next-step"
                          >
                            Далее
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            disabled={submitMutation.isPending || !canProceed()}
                            data-testid="button-submit-estimate"
                          >
                            {submitMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Отправка...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Получить оценку
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>

                  <h3 className="text-2xl font-bold mb-2">
                    Предварительная оценка
                  </h3>

                  {estimation && (
                    <>
                      <div className="text-4xl font-bold text-primary my-6">
                        {formatPrice(estimation.minPrice)} — {formatPrice(estimation.maxPrice)}
                      </div>

                      <div className="text-lg text-muted-foreground mb-6">
                        Ориентировочные сроки: {formatDays(estimation.minDays)} — {formatDays(estimation.maxDays)}
                      </div>

                      <div className="bg-muted/50 rounded-md p-4 text-sm text-muted-foreground mb-6">
                        Это предварительная оценка на основе выбранных параметров.
                        Финальная стоимость и сроки будут определены после детального обсуждения проекта.
                        <br /><br />
                        <strong>Данная оценка не является публичной офертой.</strong>
                      </div>

                      <p className="text-muted-foreground mb-8">
                        Заявка отправлена. Свяжусь с вами в ближайшее время для обсуждения деталей.
                      </p>
                    </>
                  )}

                  <Button onClick={resetForm} variant="outline" data-testid="button-new-estimate">
                    Новая оценка
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
