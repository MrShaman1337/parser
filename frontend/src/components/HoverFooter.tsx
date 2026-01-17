import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "./ui/hover-footer";
import { Link } from "react-router-dom";

const HoverFooter = () => {
  const footerLinks = [
    {
      title: "Store",
      links: [
        { label: "Kits", href: "/catalog" },
        { label: "VIP", href: "/catalog?tag=vip" },
        { label: "Skins", href: "/catalog?tag=skins" },
        { label: "FAQ", href: "/support" }
      ]
    },
    {
      title: "Support",
      links: [
        { label: "Help Center", href: "/support" },
        { label: "Rules", href: "/support" },
        { label: "Terms", href: "/support" },
        { label: "Live Chat", href: "/support", pulse: true }
      ]
    }
  ];

  const contactInfo = [
    { icon: <Mail size={18} className="text-[#3ca2fa]" />, text: "support@gorust.store", href: "mailto:support@gorust.store" },
    { icon: <Phone size={18} className="text-[#3ca2fa]" />, text: "+0 000 000 0000", href: "tel:+0000000000" },
    { icon: <MapPin size={18} className="text-[#3ca2fa]" />, text: "EU Region" }
  ];

  const socialLinks = [{ icon: <MessageCircle size={20} />, label: "Discord", href: "https://discord.gg/ATnZzTpR" }];

  return (
    <footer className="bg-[#0F0F11]/10 relative h-fit rounded-3xl overflow-hidden m-8">
      <div className="max-w-7xl mx-auto p-14 z-40 relative text-gray-300">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#3ca2fa] text-3xl font-extrabold">&hearts;</span>
              <span className="text-white text-3xl font-bold">GO RUST</span>
            </div>
            <p className="text-sm leading-relaxed">
              Premium Rust kits, VIP perks, and cosmetics delivered instantly.
            </p>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-lg font-semibold mb-6">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    <Link to={link.href} className="hover:text-[#3ca2fa] transition-colors">
                      {link.label}
                    </Link>
                    {link.pulse && (
                      <span className="absolute top-0 right-[-10px] w-2 h-2 rounded-full bg-[#3ca2fa] animate-pulse"></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-white text-lg font-semibold mb-6">Contact Us</h4>
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

          <p className="text-center md:text-left">&copy; {new Date().getFullYear()} GO RUST. All rights reserved.</p>
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
