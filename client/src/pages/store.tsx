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
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Search, ShoppingCart, Minus, Trash2, ImagePlus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Product, InsertProduct, CartItem, InsertSale } from "@shared/schema";
import { useAuth } from "@/context/auth-context";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const defaultProductForm: Partial<InsertProduct> = {
  name: "",
  description: "",
  price: 0,
  stock: 0,
  category: "general",
  imageUrl: "",
};

const categories = [
  { value: "supplements", label: "مكملات غذائية" },
  { value: "equipment", label: "معدات رياضية" },
  { value: "clothing", label: "ملابس رياضية" },
  { value: "accessories", label: "إكسسوارات" },
  { value: "drinks", label: "مشروبات" },
  { value: "general", label: "عام" },
];

export default function Store() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const isEditing = Boolean(editingProduct);
  const getLatestProduct = (productId: string) =>
    products?.find((product) => product.id === productId);

  const resetProductForm = () => {
    setFormData({ ...defaultProductForm });
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
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
    });
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(product.imageUrl || null);
    setImageFile(null);
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
        title: "خطأ",
        description: "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت",
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
        title: "تم بنجاح",
        description: "تم إضافة المنتج بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المنتج",
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
        title: "تم بنجاح",
        description: "تم تحديث المنتج بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل تحديث المنتج",
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
      toast({ title: "تم الحذف", description: "تم حذف المنتج بنجاح" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حذف المنتج" });
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
        title: "تم بنجاح",
        description: "تمت عملية البيع بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إتمام عملية البيع",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    if (isEditing && editingProduct) {
      updateProduct.mutate({
        id: editingProduct.id,
        updates: { ...formData, imageFile },
      });
      return;
    }
    createProduct.mutate({ ...(formData as InsertProduct), imageFile });
  };

  const addToCart = (product: Product) => {
    const latestProduct = getLatestProduct(product.id);
    const availableStock = latestProduct?.stock ?? product.stock;
    if (availableStock <= 0) {
      toast({
        title: "غير متوفر",
        description: "المنتج غير متوفر حالياً",
        variant: "destructive",
      });
      return;
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= availableStock) {
          toast({
            title: "تنبيه",
            description: "لا يمكن إضافة المزيد - الكمية المتوفرة محدودة",
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
          title: "تمت الإضافة",
          description: `تمت إضافة ${product.name} إلى السلة`,
        });
        return updatedCart;
      }
      const updatedCart = [...prevCart, { product: latestProduct ?? product, quantity: 1 }];
      toast({
        title: "تمت الإضافة",
        description: `تمت إضافة ${product.name} إلى السلة`,
      });
      return updatedCart;
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.product.id === productId);
      if (!item) return prevCart;

      const latestProduct = getLatestProduct(productId);
      const availableStock = latestProduct?.stock ?? item.product.stock;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prevCart.filter((i) => i.product.id !== productId);
      }
      if (newQuantity > availableStock) {
        toast({
          title: "تنبيه",
          description: "لا يمكن إضافة المزيد - الكمية المتوفرة محدودة",
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
      product.name.includes(searchQuery) ||
      product.description?.includes(searchQuery) ||
      false;
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (value: string) => {
    return categories.find((c) => c.value === value)?.label ?? value;
  };

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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">المنتجات والمتجر</h1>
          <p className="text-sm text-muted-foreground">إدارة منتجات النادي وعمليات البيع</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={handleProductDialogChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة منتج
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {isEditing ? "تعديل منتج" : "إضافة منتج جديد"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم المنتج *</Label>
                  <Input
                    placeholder="مثال: بروتين واي"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-product-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    placeholder="وصف المنتج..."
                    rows={2}
                    value={formData.description ?? ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-product-description"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>السعر (د.ب) *</Label>
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
                    <Label>الكمية *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.stock || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                      }
                      data-testid="input-product-stock"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger data-testid="select-product-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>صورة المنتج</Label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer flex-1">
                      <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">اختر صورة</span>
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
                          alt="معاينة"
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
                      ? "جاري الحفظ..."
                      : isEditing
                        ? "تحديث المنتج"
                        : "إضافة المنتج"}
                  </Button>

                  {isEditing && editingProduct && isAdmin && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('حذف المنتج نهائياً؟')) {
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

          <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="relative" data-testid="button-open-cart">
                <ShoppingCart className="h-4 w-4 ml-2" />
                السلة
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
                  سلة المشتريات
                </DialogTitle>
              </DialogHeader>
              {cart.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  السلة فارغة
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => {
                      const latestProduct = getLatestProduct(item.product.id);
                      const availableStock = latestProduct?.stock ?? item.product.stock;
                      const atStockLimit = item.quantity >= availableStock;

                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.product.price} د.ب × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              disabled={atStockLimit}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeFromCart(item.product.id)}
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
                      <Label>اسم العميل / المشتري</Label>
                      <Input
                        placeholder="أدخل اسم المشتري..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        data-testid="input-customer-name"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">الإجمالي:</span>
                      <span className="text-xl font-bold">{cartTotal.toFixed(2)} د.ب</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createSale.mutate({ items: cart, buyerName: customerName })}
                      disabled={createSale.isPending}
                      data-testid="button-checkout"
                    >
                      {createSale.isPending ? "جاري الإتمام..." : "إتمام عملية البيع"}
                    </Button>
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
            placeholder="بحث عن منتج..."
            className="pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-products"
          />
        </div>
        <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-category">
            <SelectValue placeholder="جميع الفئات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts && filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const cartQuantity =
              cart.find((item) => item.product.id === product.id)?.quantity ?? 0;
            const atStockLimit = cartQuantity >= product.stock;
            const isOutOfStock = product.stock <= 0 || atStockLimit;

            return (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer"
                onClick={() => openEditDialog(product)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEditDialog(product);
                  }
                }}
                role="button"
                tabIndex={0}
                data-testid={`card-product-${product.id}`}
              >
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
                      <p className="text-xl font-bold">{product.price} د.ب</p>
                      <p className="text-xs text-muted-foreground">
                        المتوفر: {product.stock} قطعة
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={isOutOfStock}
                      data-testid={`button-add-to-cart-${product.id}`}
                    >
                      {isOutOfStock ? "غير متوفر" : "إضافة للسلة"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            {searchQuery || selectedCategory ? "لا توجد نتائج للبحث" : "لا توجد منتجات حالياً"}
          </div>
        )}
      </div>
    </div>
  );
}
