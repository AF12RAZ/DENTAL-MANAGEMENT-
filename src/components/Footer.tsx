import { Link } from 'react-router-dom';

interface FooterProps {
  isAuthenticated: boolean;
}

export function Footer({ isAuthenticated }: FooterProps) {
  return (
    <footer className="bg-[#0A0E13] dark:bg-[#0A0E13] text-white/70 text-sm py-10 sm:py-20 px-4 sm:px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] border-t border-transparent dark:border-[#2A3441]">
      <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-y-8 sm:gap-y-16">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 mb-7">
            <div className="text-[#FF6B35] dark:text-[#FFB088] font-semibold text-xl tracking-tight">GOLDEN GROVE</div>
          </div>
          <div>© {new Date().getFullYear()} Golden Grove Dental Lounge.<br />All Rights Reserved.</div>
        </div>
        <div className="md:col-span-3 text-sm text-[#BABABA]">
          Dr. Insha Farheen, BDS<br />
          Golden Heights, Phase-2<br />Road No. 21, Attapur<br />Hyderabad, Telangana 500048
        </div>
        <div className="md:col-span-5 text-right text-xs leading-relaxed md:text-left text-[#BABABA]">
          The practice of dentistry is regulated in India.<br />This website is for informational purposes only and does not constitute medical advice.<br />Schedule a consultation for personalized guidance.
          {!isAuthenticated && (
            <div className="mt-4">
              <Link to="/login" className="text-white/40 hover:text-[#FF6B35] dark:hover:text-[#FFB088] text-[10px] uppercase tracking-widest transition-colors min-h-[44px] inline-flex items-center">Staff login</Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
