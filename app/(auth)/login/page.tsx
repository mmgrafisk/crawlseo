import {getTranslations} from "next-intl/server";
import {signIn, auth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {Check, ShieldCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {LocaleToggle} from "@/components/layout/locale-toggle";
import {RelivaMark} from "@/components/brand/reliva-mark";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  const t = await getTranslations("login");
  const benefits = [
    t("benefitShopify"),
    t("benefitEvidence"),
    t("benefitTasks"),
    t("benefitGoogle"),
  ];

  return (
    <div className="grid min-h-screen bg-[#f4f7fa] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#172331] px-14 py-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,206,235,.14),transparent_24rem),radial-gradient(circle_at_80%_80%,rgba(111,224,182,.11),transparent_28rem)]" />
        <div className="relative z-10">
          <RelivaMark />
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ee6c4]">
            {t("eyebrow")}
          </p>
          <h1 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.05em]">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            {t("heroDescription")}
          </p>

          <div className="mt-10 grid max-w-lg gap-3 text-sm text-slate-200 sm:grid-cols-2">
            {benefits.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#8ee6c4]/15 text-[#8ee6c4]">
                  <Check className="size-3" strokeWidth={2.2} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">{t("employeeAccess")}</p>
      </section>

      <section className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
          <LocaleToggle />
        </div>

        <div className="w-full max-w-[430px]">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex rounded-xl bg-[#172331] px-4 py-3">
              <RelivaMark />
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-[#dfe7ee] bg-white text-[#24a56f] shadow-sm">
              <ShieldCheck className="size-5" strokeWidth={1.8} />
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#172033]">
              {t("title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#718096]">{t("description")}</p>
          </div>

          <div className="rounded-2xl border border-[#e0e7ee] bg-white p-6 shadow-[0_16px_40px_rgba(23,32,51,.07)] sm:p-7">
            <form
              action={async () => {
                "use server";
                await signIn("google", {redirectTo: "/dashboard"});
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full rounded-lg bg-[#172331] text-white hover:bg-[#223449]"
              >
                {t("google")}
              </Button>
            </form>

            <div className="mt-5 border-t border-[#edf1f4] pt-5">
              <p className="text-xs leading-5 text-[#7b8797]">{t("inviteOnly")}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
