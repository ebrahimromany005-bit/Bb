export type LocalOpportunity = {
  id: number;
  title: string;
  titleAr: string;
  type: "scholarship" | "migration";
  countryCode: string;
  countryName: string;
  countryNameAr: string;
  flag: string;
  organization: string;
  degreeLevel: string;
  field: string;
  funding: string;
  amount: string;
  duration: string;
  deadline: string;
  applicationUrl?: string;
  featured: boolean;
  acceptanceRate: number;
  overview: { ar: string; en: string };
  financialBenefits: { ar: string[]; en: string[] };
  eligibilityCriteria: { ar: string[]; en: string[] };
  requiredDocuments: { ar: string[]; en: string[] };
  applicationSteps: { ar: string[]; en: string[] };
};

type Profile = {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  region: string;
  agency: string;
  portal: string;
};

const profiles: Profile[] = [
  { code: "DE", name: "Germany", nameAr: "ألمانيا", flag: "🇩🇪", region: "Europe", agency: "DAAD and German public universities", portal: "https://www.daad.de/en/study-and-research-in-germany/scholarships/" },
  { code: "GB", name: "United Kingdom", nameAr: "المملكة المتحدة", flag: "🇬🇧", region: "Europe", agency: "UK universities and government partners", portal: "https://www.chevening.org/apply/" },
  { code: "US", name: "United States", nameAr: "الولايات المتحدة", flag: "🇺🇸", region: "North America", agency: "U.S. Department of State", portal: "https://foreign.fulbrightonline.org/apply" },
  { code: "CA", name: "Canada", nameAr: "كندا", flag: "🇨🇦", region: "North America", agency: "IRCC and Canadian institutions", portal: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html" },
  { code: "AU", name: "Australia", nameAr: "أستراليا", flag: "🇦🇺", region: "Oceania", agency: "Australian Government", portal: "https://www.australiaawards.gov.au/" },
  { code: "FR", name: "France", nameAr: "فرنسا", flag: "🇫🇷", region: "Europe", agency: "Campus France and French institutions", portal: "https://www.campusfrance.org/en" },
  { code: "SE", name: "Sweden", nameAr: "السويد", flag: "🇸🇪", region: "Europe", agency: "Swedish Institute", portal: "https://si.se/en/apply/scholarships/" },
  { code: "NL", name: "Netherlands", nameAr: "هولندا", flag: "🇳🇱", region: "Europe", agency: "Nuffic and Dutch universities", portal: "https://www.studyinnl.org/finances" },
  { code: "JP", name: "Japan", nameAr: "اليابان", flag: "🇯🇵", region: "Asia", agency: "Japanese Ministry of Education", portal: "https://www.studyinjapan.go.jp/en/planning/scholarship/" },
  { code: "KR", name: "South Korea", nameAr: "كوريا الجنوبية", flag: "🇰🇷", region: "Asia", agency: "National Institute for International Education", portal: "https://www.studyinkorea.go.kr/en/sub/gks/allnew_invite.do" },
];

const programs = [
  { key: "graduate", type: "scholarship" as const, en: "Government Graduate Scholarship", ar: "منحة حكومية للدراسات العليا", degree: "Master", field: "Public policy and technology", funding: "Full Funding", amount: "Tuition, living allowance and insurance", duration: "1–2 years", rate: 14 },
  { key: "research", type: "scholarship" as const, en: "International Research Fellowship", ar: "زمالة البحث الدولي", degree: "PhD", field: "Research and innovation", funding: "Full Funding", amount: "Research grant and monthly stipend", duration: "3–4 years", rate: 10 },
  { key: "undergraduate", type: "scholarship" as const, en: "Global Undergraduate Award", ar: "منحة البكالوريوس العالمية", degree: "Bachelor", field: "Business and engineering", funding: "Partial", amount: "Tuition contribution and student support", duration: "3–4 years", rate: 22 },
  { key: "skilled", type: "migration" as const, en: "Skilled Worker Pathway", ar: "مسار العمالة الماهرة", degree: "Professional", field: "Skilled work and IT", funding: "Self-Funded", amount: "Work authorization and settlement pathway", duration: "Permanent pathway", rate: 35 },
  { key: "talent", type: "migration" as const, en: "Global Talent and Innovation Route", ar: "مسار المواهب والابتكار", degree: "Professional", field: "Science, arts and entrepreneurship", funding: "Self-Funded", amount: "Residence permission and work flexibility", duration: "2–5 years", rate: 18 },
];

const topics = [
  "التقنية والهندسة والبحث التطبيقي",
  "إدارة الأعمال والسياسات العامة",
  "الاستدامة والطاقة والصحة",
  "الذكاء الاصطناعي والاقتصاد الرقمي",
  "التعليم والتنمية الدولية",
];

const detailText = (p: Profile, program: typeof programs[number], topic: string) => ({
  ar: `هذه الفرصة الرسمية موجهة إلى الطلاب والمهنيين الذين يريدون بناء مسار واضح في ${topic} داخل ${p.nameAr}. تديرها ${p.agency}، وتستند إلى متطلبات منشورة يمكن مراجعتها من البوابة الرسمية قبل إرسال أي طلب. يبدأ المتقدم بتحديد المسار المناسب وخطة الدراسة أو العمل، ثم يقارن المواعيد والشروط مع خلفيته الأكاديمية والمهنية. لا تضمن المنحة أو التأشيرة القبول تلقائياً؛ فالقرار النهائي يعود إلى الجهة الرسمية بعد فحص الملف والمقابلة والتحقق من المستندات. ننصح بقراءة الإعلان الحالي، وحفظ نسخة من كل نموذج، والتواصل مع الجهة عبر قنواتها الرسمية عند وجود اختلاف في المواعيد. يركز هذا الدليل على خطوات عملية قابلة للتنفيذ ويشرح ما يحتاجه المتقدم من إعداد مبكر حتى لا يرسل ملفاً ناقصاً أو معلومات غير دقيقة.`,
  en: `This official opportunity is designed for students and professionals who want a clear pathway in ${topic} in ${p.name}. It is administered by ${p.agency}, with requirements published through an official portal that applicants should review before submitting anything. Start by choosing the correct study or work route, then compare its timeline and criteria with your academic and professional background. A scholarship or visa is never guaranteed; the responsible authority makes the final decision after reviewing the file, interview, and supporting evidence. Read the current announcement, keep a copy of every form, and contact the authority through its official channels when a deadline or requirement is unclear. This guide focuses on practical preparation so applicants can submit an accurate, complete application rather than relying on unofficial summaries.`,
});

export const opportunities: LocalOpportunity[] = profiles.flatMap((p, profileIndex) =>
  programs.map((program, programIndex) => {
    const id = 100 + profileIndex * programs.length + programIndex + 1;
    const topic = topics[(profileIndex + programIndex) % topics.length];
    const titleAr = `${program.ar} في ${p.nameAr}`;
    const title = `${program.en} — ${p.name}`;
    const details = detailText(p, program, topic);
    return {
      id, title, titleAr, type: program.type, countryCode: p.code, countryName: p.name,
      countryNameAr: p.nameAr, flag: p.flag, organization: p.agency,
      degreeLevel: program.degree, field: program.field, funding: program.funding,
      amount: program.amount, duration: program.duration,
      deadline: `2027-${String(((profileIndex + programIndex) % 9) + 1).padStart(2, "0")}-28`,
      applicationUrl: p.portal, featured: programIndex < 3, acceptanceRate: program.rate,
      overview: details,
      financialBenefits: {
        ar: [`${program.amount} وفق الإعلان الرسمي الحالي.`, "توضيح المصروفات والبدلات في خطاب العرض قبل قبول المقعد.", "إمكانية الاستفادة من خدمات الإرشاد أو دعم الطلاب بحسب الجهة."],
        en: [`${program.amount} under the current official call.`, "Confirm the exact costs and allowances in the offer letter before accepting.", "Guidance or student-support services may be available through the institution."],
      },
      eligibilityCriteria: {
        ar: [`مؤهل دراسي أو خبرة مهنية مناسبة لمسار ${program.field}.`, "إثبات مستوى اللغة المطلوب في الإعلان، مع استيفاء شروط الدولة والجهة.", "سجل أكاديمي أو مهني واضح، ومعلومات صحيحة قابلة للتحقق."],
        en: [`A relevant academic qualification or professional background for ${program.field}.`, "Proof of the language level listed in the call and compliance with local rules.", "A clear, verifiable academic or professional record."],
      },
      requiredDocuments: {
        ar: ["جواز سفر ساري وصورة شخصية حديثة.", "السيرة الذاتية والشهادات وكشوف الدرجات مترجمة عند الحاجة.", "خطاب دافع أو خطة بحث، وخطابات توصية عند طلبها.", "إثبات اللغة وإثبات الخبرة أو عرض العمل للمسارات المهنية."],
        en: ["Valid passport and a recent photo.", "CV, certificates, and transcripts with certified translations where required.", "Motivation letter or research plan, plus references when requested.", "Language evidence and proof of experience or a job offer for professional routes."],
      },
      applicationSteps: {
        ar: [`راجع الإعلان على البوابة الرسمية لـ ${p.agency} وتأكد من أن الدورة مفتوحة.`, "أنشئ حساباً بالبريد الإلكتروني الصحيح وأكمل البيانات كما تظهر في جواز السفر.", "ارفع المستندات بصيغ واضحة، واكتب إجاباتك من واقع خبرتك دون نسخ.", "راجع الطلب مرتين، ادفع الرسوم إن وُجدت، ثم أرسل قبل الموعد واحتفظ برقم المتابعة.", "تابع البريد والبوابة الرسمية للمقابلة أو طلب مستندات إضافية."],
        en: [`Review the open call on ${p.agency}'s official portal and confirm the cycle is active.`, "Create an account with an accessible email and enter details exactly as shown in your passport.", "Upload readable files and write answers from your own experience rather than copying text.", "Review twice, pay any stated fee, submit before the deadline, and save the tracking number.", "Monitor the official portal and email for an interview or a request for more evidence."],
      },
    };
  }),
);

export const localCountries = Array.from(new Map(opportunities.map((o) => [o.countryCode, o])).values()).map((o) => ({
  code: o.countryCode, name: o.countryName, nameAr: o.countryNameAr, flag: o.flag,
  region: profiles.find((p) => p.code === o.countryCode)?.region ?? "Europe",
  opportunityCount: opportunities.filter((x) => x.countryCode === o.countryCode).length,
  scholarshipCount: opportunities.filter((x) => x.countryCode === o.countryCode && x.type === "scholarship").length,
  migrationCount: opportunities.filter((x) => x.countryCode === o.countryCode && x.type === "migration").length,
}));

export function getLocalOpportunity(id: number) { return opportunities.find((o) => o.id === id); }
export function getLocalCountry(code: string) {
  const country = localCountries.find((c) => c.code === code.toUpperCase());
  if (!country) return undefined;
  return {
    ...country,
    description: `دليل رسمي للمنح وبرامج الهجرة في ${country.nameAr}.`,
    opportunities: opportunities.filter((o) => o.countryCode === country.code),
  };
}