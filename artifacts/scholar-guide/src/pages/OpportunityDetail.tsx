import { useParams, Link } from "wouter";
import { useEffect } from "react";
import { useCreateApplication, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { getLocalOpportunity, localCountries, opportunities as localOpportunities } from "@/data/opportunities";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useGuestUserId } from "@/hooks/useGuestUserId";
import { useToast } from "@/hooks/use-toast";
import { AdSlot } from "@/components/AdSlot";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BookmarkPlus,
  Calendar,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Share2,
  Sparkles,
  Target,
} from "lucide-react";

export default function OpportunityDetail() {
  const params = useParams();
  const id = Number(params["id"]);
  const { lang, t } = useLang();
  const userId = useGuestUserId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const local = getLocalOpportunity(id);
  const opp = { data: local, isLoading: false };
  const countries = { data: localCountries };
  const related = { data: localOpportunities.filter((item) => item.field === local?.field) };

  const createApp = useCreateApplication();

  if (opp.isLoading || !opp.data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="h-96 animate-pulse bg-muted" />
      </div>
    );
  }

  const o = opp.data;
  const flag = countries.data?.find((c) => c.code === o.countryCode)?.flag;
  const title = lang === "ar" ? o.titleAr : o.title;
  const country = lang === "ar" ? o.countryNameAr : o.countryName;
  const days = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const applyHref = o.applicationUrl;

  useEffect(() => {
    document.title = `${title} | Global Scholar Guide`;
    const description = document.querySelector('meta[name="description"]') ?? document.createElement("meta");
    description.setAttribute("name", "description");
    description.setAttribute("content", o.overview[lang].slice(0, 155));
    document.head.appendChild(description);
    const scriptId = "opportunity-schema";
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: o.overview[lang],
      inLanguage: lang,
      dateModified: new Date().toISOString().slice(0, 10),
      publisher: { "@type": "Organization", name: "Global Scholar Guide", url: "https://globalscholarguide.online" },
      mainEntityOfPage: `https://globalscholarguide.online/opportunities/${o.id}`,
    });
    document.head.appendChild(script);
    return () => document.getElementById(scriptId)?.remove();
  }, [lang, o, title]);

  const onTrack = () => {
    createApp.mutate(
      {
        data: {
          userId,
          opportunityId: o.id,
          status: "planning",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey({ userId }) });
          toast({
            title: lang === "ar" ? "تمت إضافة الطلب" : "Application tracked",
            description: lang === "ar" ? "ستجدها في صفحة الطلبات" : "Find it on your tracker page",
          });
        },
        onError: () => {
          toast({
            title: lang === "ar" ? "تعذر إضافة الطلب" : "Could not track",
            variant: "destructive",
          });
        },
      },
    );
  };

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: lang === "ar" ? "تم نسخ الرابط" : "Link copied",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-6xl leading-none">{flag ?? "🌍"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-3 w-3" />
                  {country}
                  <span>•</span>
                  {o.organization}
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{title}</h1>
              </div>
              {o.featured && (
                <Badge className="bg-accent text-accent-foreground gap-1">
                  <Sparkles className="h-3 w-3" />
                  {lang === "ar" ? "مميزة" : "Featured"}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <Badge variant="outline"><GraduationCap className="h-3 w-3 mr-1" />{o.degreeLevel}</Badge>
              <Badge variant="secondary">{o.type === "scholarship" ? t("scholarship") : t("migration")}</Badge>
              <Badge variant="outline">{o.funding}</Badge>
              <Badge variant="outline">{o.field}</Badge>
              {o.amount && <Badge variant="outline">{o.amount}</Badge>}
              {o.duration && <Badge variant="outline">{o.duration}</Badge>}
            </div>

              <p className="text-base leading-relaxed text-muted-foreground">{o.overview[lang]}</p>
          </Card>

          <Card className="p-6">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t("eligibility")}
              </h2>
              <ul className="space-y-2 text-muted-foreground">{o.eligibilityCriteria[lang].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-primary shrink-0" />{item}</li>)}</ul>
          </Card>

            <Card className="p-6">
              <h2 className="font-bold text-lg mb-3">{lang === "ar" ? "التمويل والمزايا المقدمة" : "Financial Benefits"}</h2>
              <ul className="space-y-2">
                {o.financialBenefits[lang].map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold text-lg mb-3">{lang === "ar" ? "المستندات المطلوبة" : "Required Documents"}</h2>
              <ul className="space-y-2">
                {o.requiredDocuments[lang].map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="bg-secondary/15 text-secondary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Card>

          <AdSlot slot="detail_inpage" size="inline" />

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-bold">
                {lang === "ar" ? "كيف تقدم على هذه الفرصة" : "How to apply"}
              </h3>
            </div>
             <ol className="space-y-2 text-sm text-muted-foreground">{o.applicationSteps[lang].map((step, i) => <li key={step} className="flex gap-2"><span className="bg-primary/15 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 font-bold">{i + 1}</span>{step}</li>)}</ol>
            <p className="text-xs text-muted-foreground">
              {lang === "ar"
                ? "💡 نصيحة: تأكد من قراءة شروط الأهلية والمستندات المطلوبة قبل التقديم."
                : "💡 Tip: review eligibility and required documents carefully before applying."}
            </p>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6 sticky top-20">
            <div className="text-center mb-4">
              <div className="text-xs text-muted-foreground mb-1">{t("deadline")}</div>
              <div className="text-2xl font-extrabold">
                {new Date(o.deadline).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className={`text-sm mt-1 ${days < 30 ? "text-destructive" : "text-primary"}`}>
                <Calendar className="h-3 w-3 inline mr-1" />
                {days > 0
                  ? lang === "ar"
                    ? `متبقي ${days} يوم`
                    : `${days} days left`
                  : lang === "ar"
                    ? "انتهى"
                    : "Closed"}
              </div>
            </div>
            

            <div className="space-y-2">
              {applyHref ? <Button asChild className="w-full gap-2" size="lg">
                <a href={applyHref} target="_blank" rel="noopener noreferrer">
                  {t("apply_now")}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button> : <p className="text-xs text-muted-foreground text-center">{lang === "ar" ? "رابط التقديم الرسمي غير متاح حالياً." : "The official application link is currently unavailable."}</p>}
              <Button onClick={onTrack} variant="outline" className="w-full gap-2">
                <BookmarkPlus className="h-4 w-4" />
                {t("track_application")}
              </Button>
              <Button onClick={onShare} variant="ghost" className="w-full gap-2">
                <Share2 className="h-4 w-4" />
                {t("share")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Related */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">{t("related_opportunities")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {related.data
            ?.filter((r) => r.id !== o.id)
            .slice(0, 4)
            .map((r) => (
              <OpportunityCard
                key={r.id}
                opp={r}
                flag={countries.data?.find((c) => c.code === r.countryCode)?.flag}
              />
            ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/opportunities">
            <Button variant="outline">{t("view_all")}</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
