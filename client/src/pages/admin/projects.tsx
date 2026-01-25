import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ExternalLink, GripVertical } from "lucide-react";
import type { Project } from "@shared/schema";

export default function AdminProjects() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fullDescription: "",
    image: "",
    technologies: "",
    liveUrl: "",
    problems: "",
    solutions: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/?action=getProjects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/?action=getProjects");
      return response.json();
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      // Convert file to base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Send to API
          fetch(`${import.meta.env.VITE_API_BASE || window.location.origin}/api/?action=uploadImage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file: base64,
              filename: file.name,
              contentType: file.type,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.url) {
                resolve(data.url);
              } else {
                reject(new Error(data.message || "Upload failed"));
              }
            })
            .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/?action=addProject", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/?action=getProjects"] });
      toast({ title: "Проект создан" });
      closeDialog();
      setImageFile(null);
      setImagePreview(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать проект", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/?action=updateProject`, { id, ...data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/?action=getProjects"] });
      toast({ title: "Проект обновлён" });
      closeDialog();
      setImageFile(null);
      setImagePreview(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить проект", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/?action=deleteProject`, { id });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/?action=getProjects"] });
      toast({ title: "Проект удалён" });
      setDeleteConfirmId(null);
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить проект", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingProject(null);
    setFormData({
      title: "",
      description: "",
      fullDescription: "",
      image: "",
      technologies: "",
      liveUrl: "",
      problems: "",
      solutions: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      fullDescription: project.fullDescription,
      image: project.image,
      technologies: project.technologies?.join(", ") || "",
      liveUrl: project.liveUrl || "",
      problems: project.problems || "",
      solutions: project.solutions || "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = formData.image;
    
    // Upload image if file is selected
    if (imageFile && !editingProject) {
      setUploadingImage(true);
      try {
        imageUrl = await uploadImageMutation.mutateAsync(imageFile);
        setUploadingImage(false);
      } catch (error) {
        setUploadingImage(false);
        toast({ 
          title: "Ошибка", 
          description: "Не удалось загрузить изображение", 
          variant: "destructive" 
        });
        return;
      }
    }

    const data = {
      ...formData,
      image: imageUrl,
      technologies: formData.technologies.split(",").map((t) => t.trim()).filter(Boolean),
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Портфолио</h1>
          <p className="text-muted-foreground">Управление проектами на сайте</p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-project">
          <Plus className="h-4 w-4 mr-2" />
          Добавить проект
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {project.image ? (
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Нет изображения
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{project.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {project.liveUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(project.liveUrl || "", "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(project)}
                      data-testid={`button-edit-${project.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(project.id)}
                      data-testid={`button-delete-${project.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                    {project.technologies.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.technologies.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Проектов пока нет</p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить первый проект
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Редактировать проект" : "Новый проект"}
            </DialogTitle>
            <DialogDescription>
              {editingProject ? "Измените данные проекта" : "Заполните информацию о новом проекте"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="input-project-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Краткое описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                data-testid="input-project-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">Полное описание</Label>
              <Textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
                rows={4}
                required
                data-testid="input-project-full-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">
                {editingProject ? "URL изображения" : "Изображение"}
              </Label>
              {!editingProject ? (
                <>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                    data-testid="input-project-image-file"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground">Загрузка изображения...</p>
                  )}
                </>
              ) : (
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  required
                  data-testid="input-project-image"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="technologies">Технологии (через запятую)</Label>
              <Input
                id="technologies"
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                placeholder="React, TypeScript, Node.js"
                data-testid="input-project-technologies"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="liveUrl">Ссылка на проект</Label>
              <Input
                id="liveUrl"
                value={formData.liveUrl}
                onChange={(e) => setFormData({ ...formData, liveUrl: e.target.value })}
                placeholder="https://example.com"
                data-testid="input-project-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problems">Проблемы/задачи</Label>
              <Textarea
                id="problems"
                value={formData.problems}
                onChange={(e) => setFormData({ ...formData, problems: e.target.value })}
                rows={3}
                data-testid="input-project-problems"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solutions">Решения</Label>
              <Textarea
                id="solutions"
                value={formData.solutions}
                onChange={(e) => setFormData({ ...formData, solutions: e.target.value })}
                rows={3}
                data-testid="input-project-solutions"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || uploadingImage}
                data-testid="button-save-project"
              >
                {uploadingImage
                  ? "Загрузка изображения..."
                  : createMutation.isPending || updateMutation.isPending
                  ? "Сохранение..."
                  : editingProject
                  ? "Сохранить"
                  : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Проект будет удалён навсегда.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
