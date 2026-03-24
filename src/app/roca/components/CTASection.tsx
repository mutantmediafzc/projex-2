"use client";

import { useState } from "react";

export default function CTASection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    package: "professional",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="cta" className="py-24 px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-orange-900/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-amber-400 text-sm font-semibold uppercase tracking-widest mb-4">
            Ready to Grow?
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Let&apos;s Transform Roca&apos;s
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Digital Presence
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Schedule a consultation to discuss how we can help Roca Real Estate dominate the Dubai property market.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Thank You!</h3>
            <p className="text-slate-300 mb-6">
              We&apos;ve received your inquiry and will be in touch within 24 hours to schedule your consultation.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-amber-400 hover:text-amber-300 font-medium"
            >
              Submit Another Inquiry
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <a href="mailto:hello@mutant.ae" className="flex items-center gap-3 text-slate-300 hover:text-amber-400 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    hello@mutant.ae
                  </a>
                  <a href="tel:+971501234567" className="flex items-center gap-3 text-slate-300 hover:text-amber-400 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    +971 50 123 4567
                  </a>
                  <div className="flex items-center gap-3 text-slate-300">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    Dubai, UAE
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Why Choose Mutant?</h3>
                <div className="space-y-3">
                  {[
                    "10+ years UAE market experience",
                    "Real estate digital specialists",
                    "Proven ROI-focused strategies",
                    "Transparent reporting & pricing",
                    "Dedicated account management",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-8">
                <h3 className="text-xl font-bold text-white mb-6">Request a Consultation</h3>
                
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
                      placeholder="+971 50 XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Interested Package</label>
                    <select
                      value={formData.package}
                      onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:border-amber-500 focus:outline-none transition-colors"
                    >
                      <option value="starter">Growth Starter - AED 15,000/mo</option>
                      <option value="professional">Professional - AED 28,000/mo</option>
                      <option value="enterprise">Enterprise 360° - AED 45,000/mo</option>
                      <option value="custom">Custom Package</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-slate-400 text-sm mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors resize-none"
                    placeholder="Tell us about your goals and any specific requirements..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:scale-[1.02]"
                >
                  Schedule Consultation
                </button>

                <p className="text-slate-500 text-xs text-center mt-4">
                  By submitting, you agree to receive communications from Mutant Digital Agency.
                </p>
              </form>
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm mb-6">Trusted by leading brands in the UAE</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
            {["Google Partner", "Meta Business Partner", "Ren CRM", "Semrush Agency"].map((badge, i) => (
              <div key={i} className="px-6 py-3 rounded-xl bg-slate-800/30 border border-slate-700/30 text-slate-400 text-sm font-medium">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
