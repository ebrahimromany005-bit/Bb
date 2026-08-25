import { useLang } from "@/lib/i18n";
export default function Terms() {
  const { lang } = useLang(); const ar = lang === "ar";
  return <article className="container mx-auto max-w-3xl px-4 py-12 prose dark:prose-invert">
    <h1>{ar ? "شروط الاستخدام" : "Terms of Service"}</h1>
    <p>{ar ? "باستخدام الموقع توافق على هذه الشروط وعلى استخدامه لأغراض تعليمية ومعلوماتية فقط." : "By using this website, you agree to these terms and to use it for educational and informational purposes only."}</p>
    <h2>{ar ? "دقة المعلومات" : "Information accuracy"}</h2>
    <p>{ar ? "نبذل جهداً لمراجعة الفرص، لكن المواعيد والشروط قد تتغير. القرار النهائي للجهة الرسمية، ولا نقدم ضماناً بالقبول أو التأشيرة." : "We work to review opportunities, but deadlines and requirements can change. The official authority makes the final decision; we do not guarantee admission, funding, or a visa."}</p>
    <h2>{ar ? "الاستخدام المقبول" : "Acceptable use"}</h2>
    <p>{ar ? "يحظر إساءة استخدام الموقع أو محاولة تعطيل خدماته أو نسخ محتواه بصورة تجارية دون إذن." : "Do not misuse the website, disrupt its services, or commercially reproduce its content without permission."}</p>
  </article>;
}