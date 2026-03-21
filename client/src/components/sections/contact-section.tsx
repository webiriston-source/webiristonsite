import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { contactFormSchema, type ContactFormData } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { resolveReferralPayload } from "@/lib/referral";

const socialLinks = [
  { icon: SiTelegram, href: "https://t.me/iristonweb", label: "Telegram" },
  { icon: SiTelegram, href: "https://t.me/iristonwebbot", label: "Telegram Bot" },
];

function RobotIllustration({ focusedField }: { focusedField: string | null }) {
  const getEyePosition = () => {
    switch (focusedField) {
      case "name":
        return { x: -3, y: -2 };
      case "email":
        return { x: 0, y: 2 };
      case "message":
        return { x: 3, y: 3 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const eyePos = getEyePosition();

  return (
    <motion.svg
      viewBox="0 0 200 200"
      className="w-full max-w-xs mx-auto"
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
    >
      <motion.rect
        x="50"
        y="40"
        width="100"
        height="90"
        rx="15"
        className="fill-card stroke-primary"
        strokeWidth="3"
        animate={{ y: focusedField ? 35 : 40 }}
        transition={{ type: "spring", stiffness: 300 }}
      />

      <motion.rect
        x="30"
        y="130"
        width="140"
        height="50"
        rx="10"
        className="fill-card stroke-primary"
        strokeWidth="3"
      />

      <motion.circle
        cx="80"
        cy="75"
        r="15"
        className="fill-background stroke-primary"
        strokeWidth="2"
      />
      <motion.circle
        cx={80 + eyePos.x}
        cy={75 + eyePos.y}
        r="6"
        className="fill-primary"
        animate={{ cx: 80 + eyePos.x, cy: 75 + eyePos.y }}
        transition={{ type: "spring", stiffness: 500 }}
      />

      <motion.circle
        cx="120"
        cy="75"
        r="15"
        className="fill-background stroke-primary"
        strokeWidth="2"
      />
      <motion.circle
        cx={120 + eyePos.x}
        cy={75 + eyePos.y}
        r="6"
        className="fill-primary"
        animate={{ cx: 120 + eyePos.x, cy: 75 + eyePos.y }}
        transition={{ type: "spring", stiffness: 500 }}
      />

      <motion.rect
        x="70"
        y="100"
        width="60"
        height="8"
        rx="4"
        className="fill-primary"
        animate={{
          width: focusedField ? 50 : 60,
          x: focusedField ? 75 : 70,
        }}
      />

      <motion.rect
        x="35"
        y="60"
        width="10"
        height="40"
        rx="5"
        className="fill-card stroke-primary"
        strokeWidth="2"
        animate={{ rotate: focusedField === "message" ? -10 : 0 }}
        style={{ transformOrigin: "40px 100px" }}
      />
      <motion.rect
        x="155"
        y="60"
        width="10"
        height="40"
        rx="5"
        className="fill-card stroke-primary"
        strokeWidth="2"
        animate={{ rotate: focusedField === "message" ? 10 : 0 }}
        style={{ transformOrigin: "160px 100px" }}
      />

      <motion.circle
        cx="100"
        cy="25"
        r="8"
        className="fill-primary"
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{
          scale: focusedField ? [1, 1.2, 1] : 1,
          opacity: focusedField ? [0.5, 1, 0.5] : 0.7,
        }}
        transition={{
          duration: 1,
          repeat: focusedField ? Infinity : 0,
        }}
      />
      <motion.line
        x1="100"
        y1="33"
        x2="100"
        y2="40"
        className="stroke-primary"
        strokeWidth="2"
      />
    </motion.svg>
  );
}

export function ContactSection() {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/?action=contact", {
        ...data,
        ...resolveReferralPayload(),
      });
      return response;
    },
    onSuccess: () => {
      setIsSuccess(true);
      form.reset();
      toast({
        title: "Сообщение отправлено!",
        description: "Спасибо за обращение. Я свяжусь с вами в ближайшее время.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка отправки",
        description: "Не удалось отправить сообщение. Попробуйте позже.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => setIsSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const onSubmit = (data: ContactFormData) => {
    mutation.mutate(data);
  };

  return (
    <section id="contact" className="py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Контакты
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Свяжитесь со мной</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Есть интересный проект или предложение о сотрудничестве? Напишите мне,
            и я отвечу в ближайшее время.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-card border border-card-border rounded-md p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ваше имя"
                            {...field}
                            onFocus={() => setFocusedField("name")}
                            onBlur={() => setFocusedField(null)}
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            {...field}
                            onFocus={() => setFocusedField("email")}
                            onBlur={() => setFocusedField(null)}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сообщение</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Расскажите о вашем проекте или предложении..."
                            className="min-h-[150px] resize-none"
                            {...field}
                            onFocus={() => setFocusedField("message")}
                            onBlur={() => setFocusedField(null)}
                            data-testid="input-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={mutation.isPending || isSuccess}
                    data-testid="button-submit-contact"
                  >
                    {mutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Отправлено!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Отправить сообщение
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Отправляя форму, вы соглашаетесь на обработку персональных данных.
                  </p>
                </form>
              </Form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="bg-card border border-card-border rounded-md p-6 md:p-8">
              <RobotIllustration focusedField={focusedField} />
              <p className="text-center text-muted-foreground mt-4 text-sm">
                Этот робот наблюдает за вашим вводом
              </p>
            </div>

            <div className="bg-card border border-card-border rounded-md p-6">
              <h3 className="font-semibold mb-4">Найдите меня в социальных сетях</h3>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <Button
                    key={label}
                    variant="outline"
                    asChild
                    data-testid={`link-social-${label.toLowerCase()}`}
                    data-cursor-hover
                  >
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </a>
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center text-muted-foreground text-sm">
              <p>Обычно отвечаю в течение 24 часов</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
