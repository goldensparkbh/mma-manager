import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Search, ShoppingCart, Minus, Trash2, ImagePlus, LayoutGrid, LayoutList, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, InsertProduct, CartItem, InsertSale } from "@shared/schema";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { PERMISSIONS } from "@/lib/permissions";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const defaultProductForm: Partial<InsertProduct> = {
  name: "",
  description: "",
  price: 0,
  stock: 0,
  trackInventory: true,
  category: "general",
  imageUrl: "",
};

const defaultCategoryValues = [
  "supplements",
  "equipment",
  "clothing",
  "accessories",
  "drinks",
  "general",
];

export default function Store() {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const canAdd = hasPermission(PERMISSIONS.STORE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.STORE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.STORE_DELETE);
  const canSell = hasPermission(PERMISSIONS.SALES_CREATE);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>(defaultCategoryValues);
  const [categoryInput, setCategoryInput] = useState("");
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stockToAdd, setStockToAdd] = useState<number>(0);
  const [formData, setFormData] = useState<Partial<InsertProduct>>({
    ...defaultProductForm,
  });

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "general"));
        const stored = snap.exists() ? snap.data().productCategories : null;
        if (Array.isArray(stored) && stored.length > 0) {
          setCategories(stored);
          return;
        }
      } catch {
        // Fallback to defaults on fetch errors.
      }
      setCategories(defaultCategoryValues);
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory && !categories.includes(selectedCategory)) {
      setSelectedCategory("");
    }
  }, [categories, selectedCategory]);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const isEditing = Boolean(editingProduct);
  const categoryOptions = Array.from(new Set([
    ...categories,
    ...((products ?? []).map((product) => product.category).filter(Boolean) as string[]),
  ]));
  const getLatestProduct = (productId: string) =>
    products?.find((product) => product.id === productId);

  const resetProductForm = () => {
    setFormData({ ...defaultProductForm });
    setStockToAdd(0);
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
  };

  const saveCategories = async (nextCategories: string[]) => {
    setIsSavingCategories(true);
    try {
      await setDoc(doc(db, "settings", "general"), { productCategories: nextCategories }, { merge: true });
      setCategories(nextCategories);
      toast({ title: t('common.success'), description: t('common.save') });
    } catch {
      toast({ variant: "destructive", title: t('common.error'), description: t("store.categorySaveError") });
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    const exists = categories.some((cat) => cat.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast({ variant: "destructive", title: t('common.error'), description: t("store.categoryExists") });
      return;
    }
    await saveCategories([...categories, trimmed]);
    setCategoryInput("");
  };

  const handleDeleteCategory = async (value: string) => {
    if (value === "general") {
      toast({ variant: "destructive", title: t('common.error'), description: t("store.categoryDefaultRemoveError") });
      return;
    }
    const inUse = products?.some((product) => product.category === value);
    if (inUse) {
      toast({ variant: "destructive", title: t('common.error'), description: t("store.categoryInUse") });
      return;
    }
    if (!confirm(t('common.deleteConfirm'))) return;
    const next = categories.filter((cat) => cat !== value);
    await saveCategories(next);
  };

  const getCategoryLabel = (value: string) => {
    if (defaultCategoryValues.includes(value)) {
      return t(`store.categories.${value}`);
    }
    return value;
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    resetProductForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description ?? "",
      price: product.price,
      stock: product.stock,
      category: product.category ?? "general",
      imageUrl: product.imageUrl ?? "",
      trackInventory: product.trackInventory ?? false,
    });
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(product.imageUrl || null);
    setImageFile(null);
    setStockToAdd(0);
    setIsDialogOpen(true);
  };

  const handleProductDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProduct(null);
      resetProductForm();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t("common.error"),
        description: t("store.imageTooLarge"),
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return previewUrl;
    });
    setImageFile(file);
  };

  const createProduct = useMutation({
    mutationFn: async (data: InsertProduct & { imageFile?: File | null }) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      toast({
        title: t("common.success"),
        description: t("store.productCreateSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("store.productCreateError"),
        variant: "destructive",
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<InsertProduct> & { imageFile?: File | null };
    }) => {
      const response = await apiRequest("PATCH", `/api/products/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      toast({
        title: t("common.success"),
        description: t("store.productUpdateSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("store.productUpdateError"),
        variant: "destructive",
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false); // Close dialog if open (e.g. if we add delete button in dialog)
      setEditingProduct(null);
      toast({ title: t("common.success"), description: t("store.productDeleteSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("store.productDeleteError") });
    }
  });


  const createSale = useMutation({
    mutationFn: async ({ items, buyerName }: { items: CartItem[]; buyerName: string }) => {
      const sales: InsertSale[] = items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
        buyerName: buyerName || undefined,
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "cash",
      }));

      for (const sale of sales) {
        await apiRequest("POST", "/api/sales", sale);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setCart([]);
      setCustomerName("");
      setIsCartOpen(false);
      toast({
        title: t("common.success"),
        description: t("store.saleSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("store.saleError"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast({
        title: t("common.error"),
        description: t("common.requiredFields"),
        variant: "destructive",
      });
      return;
    }
    if (isEditing && editingProduct) {
      const finalStock = (formData.stock || 0) + (stockToAdd || 0);
      updateProduct.mutate({
        id: editingProduct.id,
        updates: { ...formData, stock: finalStock, imageFile },
      });
      return;
    }
    createProduct.mutate({ ...(formData as InsertProduct), imageFile });
  };

  const addToCart = (product: Product) => {
    const latestProduct = getLatestProduct(product.id);
    const tracking = latestProduct?.trackInventory ?? product.trackInventory ?? false;
    const availableStock = latestProduct?.stock ?? product.stock;

    if (tracking && availableStock <= 0) {
      toast({
        title: t("common.warning"),
        description: t("store.productUnavailable"),
        variant: "destructive",
      });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        if (tracking && existingItem.quantity >= availableStock) {
          toast({
            title: t("common.warning"),
            description: t("store.stockLimited"),
            variant: "destructive",
          });
          return prevCart;
        }
        const updatedCart = prevCart.map((item) =>
          item.product.id === product.id
            ? {
              ...item,
              quantity: item.quantity + 1,
              product: latestProduct ?? product,
            }
            : item
        );
        toast({
          title: t("common.success"),
          description: t("store.addedToCart").replace("{name}", product.name),
        });
        return updatedCart;
      }
      const updatedCart = [...prevCart, { product: latestProduct ?? product, quantity: 1 }];
      toast({
        title: t("common.success"),
        description: t("store.addedToCart").replace("{name}", product.name),
      });
      return updatedCart;
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.product.id === productId);
      if (!item) return prevCart;

      const latestProduct = getLatestProduct(productId);
      const tracking = latestProduct?.trackInventory ?? item.product.trackInventory ?? false;
      const availableStock = latestProduct?.stock ?? item.product.stock;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prevCart.filter((i) => i.product.id !== productId);
      }
      if (tracking && newQuantity > availableStock) {
        toast({
          title: t("common.warning"),
          description: t("store.stockLimited"),
          variant: "destructive",
        });
        return prevCart;
      }
      return prevCart.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: newQuantity, product: latestProduct ?? i.product }
          : i
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false;
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('store.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('store.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {canAdd && (
            <Dialog open={isDialogOpen} onOpenChange={handleProductDialogChange}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-product" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 ml-2" />
                  {t('store.addProduct')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {isEditing ? t('common.edit') : t('store.addProduct')}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("store.productName")} *</Label>
                    <Input
                      placeholder={t("store.productNamePlaceholder")}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-product-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("common.description")}</Label>
                    <Textarea
                      placeholder={t("store.descriptionPlaceholder")}
                      rows={2}
                      value={formData.description ?? ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      data-testid="input-product-description"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("store.price")} ({t("common.currency")}) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.price || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                        }
                        data-testid="input-product-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{isEditing ? t("store.addStock") : t("store.quantity")} *</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={isEditing ? (stockToAdd || "") : (formData.stock || "")}
                        disabled={!formData.trackInventory}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (isEditing) setStockToAdd(val);
                          else setFormData({ ...formData, stock: val });
                        }}
                        data-testid="input-product-stock"
                      />
                      {isEditing && formData.trackInventory && (
                        <div className="flex justify-between text-[10px] font-medium uppercase tracking-tighter text-muted-foreground bg-muted/30 p-1.5 rounded-md border border-dashed">
                          <span>{t("store.currentStock")}: {formData.stock}</span>
                          <span className="text-primary font-bold">
                            {t("store.total")}: {(formData.stock || 0) + stockToAdd}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-0.5">
                      <Label className="text-base">{t("store.trackInventory")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("store.trackInventoryDescription")}
                      </p>
                    </div>
                    <Switch
                      checked={formData.trackInventory}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          trackInventory: checked,
                          stock: checked ? formData.stock : 0
                        });
                        setStockToAdd(0);
                      }}
                      data-testid="switch-track-inventory"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("store.category")}</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger data-testid="select-product-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("store.productImage")}</Label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer flex-1">
                        <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                          <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t("store.selectImage")}</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          data-testid="input-product-image"
                        />
                      </label>
                      {imagePreview && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                          <img
                            src={imagePreview}
                            alt={t("common.preview")}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-full p-0.5"
                            onClick={() => {
                              if (imagePreview?.startsWith("blob:")) {
                                URL.revokeObjectURL(imagePreview);
                              }
                              setImagePreview(null);
                              setImageFile(null);
                              setFormData((prev) => ({ ...prev, imageUrl: "" }));
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createProduct.isPending || updateProduct.isPending}
                      data-testid="button-submit-product"
                    >
                      {createProduct.isPending || updateProduct.isPending
                        ? t('common.loading')
                        : isEditing
                          ? t('common.save')
                          : t('common.save')}
                    </Button>

                    {isEditing && editingProduct && canDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(t('store.deleteConfirm'))) {
                            deleteProduct.mutate(editingProduct.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="relative" data-testid="button-open-cart">
                <ShoppingCart className="h-4 w-4 ml-2" />
                {t('store.cart')}
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t("store.cart")}
                </DialogTitle>
              </DialogHeader>
              {cart.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {t("store.cartEmpty")}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => {
                      const latestProduct = getLatestProduct(item.product.id);
                      const tracking = latestProduct?.trackInventory ?? item.product.trackInventory ?? false;
                      const availableStock = latestProduct?.stock ?? item.product.stock;
                      const atStockLimit = tracking && item.quantity >= availableStock;

                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.product.price} {t("common.currency")} x {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => canSell && updateCartQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => canSell && updateCartQuantity(item.product.id, 1)}
                              disabled={atStockLimit || !canSell}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => canSell && removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>{t("store.buyerName")}</Label>
                      <Input
                        placeholder={t("store.buyerPlaceholder")}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        data-testid="input-customer-name"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{t("store.total")}:</span>
                      <span className="text-xl font-bold">{cartTotal.toFixed(2)} {t("common.currency")}</span>
                    </div>
                    {canSell && (
                      <Button
                        className="w-full"
                        onClick={() => createSale.mutate({ items: cart, buyerName: customerName })}
                        disabled={createSale.isPending}
                        data-testid="button-checkout"
                      >
                        {createSale.isPending ? t("store.checkoutLoading") : t("store.checkout")}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("store.searchPlaceholder")}
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-products"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-category">
              <SelectValue placeholder={t("store.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("store.allCategories")}</SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex bg-muted rounded-lg p-1 gap-1 w-fit">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {canUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>{t("store.categoriesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddCategory();
              }}
            >
              <Input
                placeholder={t("store.addCategoryPlaceholder")}
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                disabled={isSavingCategories}
              />
              <Button type="submit" disabled={isSavingCategories || !categoryInput.trim()}>
                <Plus className="h-4 w-4 me-2" />
                {t("store.addCategory")}
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                    <span>{getCategoryLabel(cat)}</span>
                    {cat !== "general" && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">{t("store.noCategories")}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts && filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const cartQuantity =
                cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
              const atStockLimit = product.trackInventory && cartQuantity >= product.stock;
              const isOutOfStock = product.trackInventory && (product.stock <= 0 || atStockLimit);

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer relative"
                  onClick={() => canUpdate && openEditDialog(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      canUpdate && openEditDialog(product);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  data-testid={`card-product-${product.id}`}
                >
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(t('common.deleteConfirm'))) {
                          deleteProduct.mutate(product.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-blue-600/50 dark:text-blue-400/50" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {getCategoryLabel(product.category)}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-bold">{product.price} {t("common.currency")}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.trackInventory ? `${t("store.stock")}: ${product.stock}` : t("store.unlimitedStock")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        disabled={isOutOfStock || !canSell}
                        data-testid={`button-add-to-cart-${product.id}`}
                      >
                        {isOutOfStock ? t("store.outOfStock") : t("store.addToCart")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              {t('common.noResults')}
            </div>
          )}
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 text-start">{t('store.productName')}</th>
                  <th className="p-4 text-start">{t("store.category")}</th>
                  <th className="p-4 text-start">{t('subscriptions.price')}</th>
                  <th className="p-4 text-start">{t('store.stock')}</th>
                  <th className="p-4 text-start">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const cartQuantity =
                    cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
                  const atStockLimit = product.trackInventory && cartQuantity >= product.stock;
                  const isOutOfStock = product.trackInventory && (product.stock <= 0 || atStockLimit);

                  return (
                    <tr
                      key={product.id}
                      className={`border-b hover:bg-muted/50 ${canUpdate ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => canUpdate && openEditDialog(product)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded border bg-muted overflow-hidden flex items-center justify-center">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {product.description || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{getCategoryLabel(product.category)}</td>
                      <td className="p-4 font-mono">{product.price} {t("common.currency")}</td>
                      <td className="p-4">
                        {product.trackInventory ? (
                          <Badge variant={product.stock <= 0 ? "destructive" : "outline"}>
                            {product.stock}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-dashed">
                            {t("store.unlimitedStock")}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          disabled={isOutOfStock || !canSell}
                        >
                          {isOutOfStock ? t('store.outOfStock') : t('store.addToCart')}
                        </Button>
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t('common.deleteConfirm'))) {
                                deleteProduct.mutate(product.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="col-span-full py-12 text-center text-muted-foreground">
          {t('common.noResults')}
        </div>
      )}
    </div>
  );
}
