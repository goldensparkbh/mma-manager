import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { DOCUMENTATION_TOPICS, DocTopic } from "@/lib/i18n/documentation";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, ChevronLeft } from "lucide-react";

interface UserGuideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserGuideDialog({ open, onOpenChange }: UserGuideDialogProps) {
    const { t, language, dir } = useLanguage();
    const [activeTopicId, setActiveTopicId] = useState<string>(DOCUMENTATION_TOPICS[0].id);

    const activeTopic = DOCUMENTATION_TOPICS.find(t => t.id === activeTopicId) || DOCUMENTATION_TOPICS[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent dir={dir} className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader dir={dir} className="p-6 border-b bg-primary text-primary-foreground">
                    <div className="flex items-center gap-3" dir={dir}>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold">
                                {language === 'ar' ? 'دليل المستخدم' : 'User Guide'}
                            </DialogTitle>
                            <p className="text-sm text-white/70">
                                {language === 'ar' ? 'تعلم كيفية استخدام المنصة بفعالية' : 'Learn how to use the platform effectively'}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden" dir={dir}>
                    {/* Navigation Sidebar - First in DOM, so Right in RTL */}
                    <div className={cn(
                        "w-1/3 border-sidebar-border bg-muted/30 flex flex-col",
                        dir === "rtl" ? "border-l" : "border-r"
                    )}>
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-1" dir={dir}>
                                {DOCUMENTATION_TOPICS.map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => setActiveTopicId(topic.id)}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between group",
                                            dir === "rtl" ? "text-right" : "text-left",
                                            activeTopicId === topic.id
                                                ? "bg-primary text-primary-foreground shadow-md"
                                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                        )}
                                        dir={dir}
                                    >
                                        <span className="truncate">{topic.title[language]}</span>
                                        {activeTopicId === topic.id ? (
                                            dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", dir === 'rtl' && "rotate-180")} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-background">
                        <ScrollArea className="flex-1 p-8">
                            <div className={cn("max-w-2xl mx-auto space-y-6", dir === "rtl" ? "text-right" : "text-left")}>
                                <h2 className="text-3xl font-black text-primary border-b pb-4 mb-8">
                                    {activeTopic.title[language]}
                                </h2>
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed text-muted-foreground whitespace-pre-wrap"
                                >
                                    {activeTopic.content[language].trim()}
                                </div>

                                <div className={cn(
                                    "pt-12 flex items-center border-t mt-12 gap-4",
                                    dir === "rtl" ? "flex-row-reverse" : "flex-row",
                                    "justify-between"
                                )}>
                                    {/* Swapped order logic for Arabic buttons via flex-row-reverse if needed, 
                                        but the user explicitly asked to swap the location. 
                                        If we use flex-row-reverse in RTL, it will put the FIRST child on the LEFT.
                                        Child 1: Previous, Child 2: Next.
                                        In RTL (Standard): Child 1 (R), Child 2 (L).
                                        In RTL (row-reverse): Child 1 (L), Child 2 (R).
                                        This effectively swaps them.
                                    */}
                                    {DOCUMENTATION_TOPICS.indexOf(activeTopic) > 0 ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setActiveTopicId(DOCUMENTATION_TOPICS[DOCUMENTATION_TOPICS.indexOf(activeTopic) - 1].id)}
                                        >
                                            {dir === 'rtl' ? <ChevronRight className="ml-2 w-4 h-4" /> : <ChevronLeft className="mr-2 w-4 h-4" />}
                                            {language === 'ar' ? 'السابق' : 'Previous'}
                                        </Button>
                                    ) : <div />}

                                    {DOCUMENTATION_TOPICS.indexOf(activeTopic) < DOCUMENTATION_TOPICS.length - 1 ? (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => setActiveTopicId(DOCUMENTATION_TOPICS[DOCUMENTATION_TOPICS.indexOf(activeTopic) + 1].id)}
                                        >
                                            {language === 'ar' ? 'التالي' : 'Next'}
                                            {dir === 'rtl' ? <ChevronLeft className="mr-2 w-4 h-4" /> : <ChevronRight className="ml-2 w-4 h-4" />}
                                        </Button>
                                    ) : <div />}
                                </div>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
