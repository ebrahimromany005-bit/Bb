import { useLang } from "@/lib/i18n";

export default function PrivacyPolicy() {
  const { lang } = useLang();
  const ar = lang === "ar";
  return <article className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert">
    <h1>{ar ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
    <p>{ar ? "نحترم خصوصيتك ونوضح هنا كيف نتعامل مع المعلومات عند استخدام Global Scholar Guide." : "We respect your privacy and explain how information is handled when you use Global Scholar Guide."}</p>
    <h2>{ar ? "البيانات التي قد نجمعها" : "Information we may collect"}</h2>
    <p>{ar ? "قد نجمع بيانات تقنية غير محددة للهوية مثل نوع المتصفح والصفحات التي تمت زيارتها لتحسين الأداء. لا نبيع بياناتك الشخصية." : "We may collect non-identifying technical information such as browser type and pages visited to improve performance. We do not sell personal information."}</p>
    <h2>{ar ? "ملفات الارتباط والإعلانات" : "Cookies and advertising"}</h2>
    <p>{ar ? "قد نستخدم ملفات الارتباط لقياس الاستخدام وتخصيص التجربة. قد يستخدم Google AdSense وموردو الإعلانات الآخرون ملفات تعريف الارتباط لعرض إعلانات أكثر صلة وفق سياساتهم. يمكنك إدارة ملفات الارتباط من إعدادات المتصفح." : "We may use cookies for analytics and experience improvements. Google AdSense and other advertising vendors may use cookies to show more relevant ads under their policies. You can manage cookies in your browser settings."}</p>
    <h2>{ar ? "المحتوى والروابط الخارجية" : "Content and external links"}</h2>
    <p>{ar ? "نحن دليل تعليمي ولسنا جهة مانحة أو حكومية. يجب مراجعة الجهة الرسمية قبل اتخاذ قرار. الروابط الخارجية تفتح مواقع مستقلة." : "We are an educational guide, not a government or awarding body. Always verify details with the official authority before acting. External links open independent websites."}</p>
    <h2>{ar ? "التواصل" : "Contact"}</h2>
    <p><a href="mailto:romanye75@gmail.com">romanye75@gmail.com</a></p>
  </article>;
}