import { Mail, MapPin, MessageCircle } from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "./ui/hover-footer";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

const HoverFooter = () => {
  const { t } = useI18n();
  const footerLinks = [
    {
      title: t("footer.store"),
      links: [
        { label: t("home.category.kits"), href: "/catalog" },
        { label: t("home.category.vip"), href: "/catalog?tag=vip" },
        { label: t("home.category.skins"), href: "/catalog?tag=skins" },
        { label: t("footer.faq"), href: "/support" }
      ]
    },
    {
      title: t("footer.support"),
      links: [
        { label: t("footer.help"), href: "/support" },
        { label: t("footer.rules"), href: "/support" },
        { label: t("footer.terms"), href: "/support" },
        { label: t("footer.discord"), href: "https://discord.gg/gorust", pulse: true }
      ]
    }
  ];

  const contactInfo = [
    { icon: <Mail size={18} className="text-[#3ca2fa]" />, text: "support@gorust.shop", href: "mailto:support@gorust.shop" },
    { icon: <MapPin size={18} className="text-[#3ca2fa]" />, text: "EU / RU" }
  ];

  const socialLinks = [{ icon: <MessageCircle size={20} />, label: "Discord", href: "https://discord.gg/gorust" }];

  return (
    <footer className="hover-footer bg-[#0F0F11]/10 relative h-fit rounded-3xl overflow-hidden m-8">
      <div className="max-w-7xl mx-auto p-14 z-40 relative text-gray-300">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#3ca2fa] text-3xl font-extrabold">&hearts;</span>
              <span className="text-white text-3xl font-bold">{t("common.brand")}</span>
            </div>
            <p className="text-sm leading-relaxed">
              {t("footer.desc")}
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-lg font-semibold mb-6">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className="hover:text-[#3ca2fa] transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.href} className="hover:text-[#3ca2fa] transition-colors">
                        {link.label}
                      </Link>
                    )}
                    {link.pulse && (
                      <span className="absolute top-0 right-[-10px] w-2 h-2 rounded-full bg-[#3ca2fa] animate-pulse"></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-white text-lg font-semibold mb-6">{t("footer.contact")}</h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3">
                  {item.icon}
                  {item.href ? (
                    <a href={item.href} className="hover:text-[#3ca2fa] transition-colors">
                      {item.text}
                    </a>
                  ) : (
                    <span className="hover:text-[#3ca2fa] transition-colors">{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-gray-700 my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0">
          <div className="flex space-x-6 text-gray-400">
            {socialLinks.map(({ icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="hover:text-[#3ca2fa] transition-colors">
                {icon}
              </a>
            ))}
          </div>

          <p className="text-center md:text-left">
            &copy; {new Date().getFullYear()} {t("common.brand")}. {t("footer.rights")}
          </p>
        </div>
      </div>

      <div className="lg:flex hidden h-[30rem] -mt-52 -mb-36">
        <TextHoverEffect text="GO RUST" className="z-50" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
};

export default HoverFooter;
