"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function EliteStoryPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Update active section based on scroll position
      const sections = document.querySelectorAll('[data-section]');
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          setActiveSection(index);
        }
      });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[800px] h-[800px] rounded-full bg-purple-500/20 blur-[120px] -top-40 -left-40 animate-pulse"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full bg-pink-500/15 blur-[100px] top-1/3 -right-20 animate-pulse"
          style={{ animationDelay: '1s', transform: `translateY(${scrollY * -0.05}px)` }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[80px] bottom-0 left-1/3 animate-pulse"
          style={{ animationDelay: '2s', transform: `translateY(${scrollY * 0.08}px)` }}
        />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" />
      </div>

      {/* Progress Indicator */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3 pr-4">
        {['Hero', 'Challenge', 'Solution', 'Impact'].map((label, index) => (
          <button
            key={label}
            onClick={() => {
              const section = document.querySelectorAll('[data-section]')[index];
              section?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group relative flex items-center justify-end gap-3"
          >
            <span className={`text-xs font-medium transition-all duration-300 opacity-0 group-hover:opacity-100 ${activeSection === index ? 'opacity-100 text-purple-300' : 'text-white/60'}`}>
              {label}
            </span>
            <div className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
              activeSection === index 
                ? 'bg-purple-500 border-purple-400 scale-125' 
                : 'bg-transparent border-white/30 hover:border-white/60'
            }`} />
          </button>
        ))}
      </div>

      {/* Hero Section */}
      <section data-section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Mutant Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                <Image
                  src="/logos/mutant-logo.avif"
                  alt="Mutant"
                  width={150}
                  height={50}
                  className="h-10 w-auto object-contain brightness-0 invert"
                />
              </div>
            </div>
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Driving Digital Transformation
            </span>
            <br />
            <span className="text-white/90">in Real Estate</span>
          </h1>
          
          <p className="text-xl sm:text-2xl lg:text-3xl font-light text-purple-200/80 mb-8">
            How Mutant Elevated <span className="font-semibold text-white">Elite Properties</span>
          </p>
          
          {/* Glassmorphism Card */}
          <div className="relative max-w-3xl mx-auto group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-500">
              <p className="text-base sm:text-lg text-white/80 leading-relaxed">
                The real estate market demands continuous innovation. To stay ahead of the curve, Elite Properties partnered with Mutant, an integrated marketing agency, to completely overhaul their digital footprint. By combining cutting-edge social media strategies, future-proof web development, and a pioneering approach to cryptocurrency transactions, Mutant transformed Elite Properties into a modern, digitally native powerhouse.
              </p>
            </div>
          </div>
          
        </div>
        
        {/* Scroll Indicator - positioned outside the content container */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce z-20">
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2 backdrop-blur-sm bg-white/5">
            <div className="w-1.5 h-3 bg-white/60 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* The Challenge Section */}
      <section data-section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">The Challenge</span>
            </h2>
          </div>
          
          <p className="text-xl text-white/70 mb-12 max-w-3xl">
            A Fragmented Digital Presence — Elite Properties possessed a strong traditional portfolio, but their digital infrastructure was holding them back from capturing the next generation of property buyers.
          </p>
          
          {/* Challenge Cards Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: "📱",
                title: "Static Social Media",
                description: "Unengaging content that failed to stand out in a saturated feed."
              },
              {
                icon: "🌐",
                title: "Outdated Architecture",
                description: "Website struggled with traditional SEO and was entirely unprepared for AI-driven Answer Engine Optimization (AEO)."
              },
              {
                icon: "🎯",
                title: "No Landing Pages",
                description: "A lack of dedicated, high-converting landing pages for specific property campaigns."
              },
              {
                icon: "₿",
                title: "Missing Crypto Market",
                description: "Inability to tap into the rapidly growing demographic of investors looking to purchase luxury real estate using cryptocurrency."
              }
            ].map((challenge, index) => (
              <div 
                key={index}
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="relative h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-1">
                  <div className="text-4xl mb-4">{challenge.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{challenge.title}</h3>
                  <p className="text-white/60 leading-relaxed">{challenge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section data-section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">The Solution</span>
            </h2>
          </div>
          
          <p className="text-xl text-white/70 mb-16 max-w-3xl">
            An Integrated, Multi-Faceted Strategy — Mutant stepped in as a strategic partner, designing a holistic marketing and technology ecosystem tailored to Elite Properties' ambitious goals.
          </p>

          {/* Solution Cards */}
          <div className="space-y-8">
            {/* Solution 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/30 text-2xl font-bold text-purple-300">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-4">State-of-the-Art Social Media & Dynamic Content</h3>
                    <p className="text-white/70 leading-relaxed text-lg">
                      Mutant moved Elite Properties away from static imagery, injecting life into their feeds with highly dynamic, state-of-the-art content. This included <span className="text-purple-300 font-medium">high-fidelity video tours</span>, <span className="text-pink-300 font-medium">interactive 3D property walkthroughs</span>, and <span className="text-blue-300 font-medium">reactive content</span> that tapped into real-time market trends. The new content strategy was designed not just to showcase properties, but to sell a lifestyle, dramatically increasing audience retention and engagement rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/30 text-2xl font-bold text-blue-300">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-4">Next-Generation Web Rebuild (SEO & AEO Readiness)</h3>
                    <p className="text-white/70 leading-relaxed text-lg mb-6">
                      Knowing that search behavior is evolving, Mutant completely rebuilt the Elite Properties website.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                        <h4 className="font-semibold text-blue-300 mb-2">AEO & SEO Optimization</h4>
                        <p className="text-white/60 text-sm leading-relaxed">
                          The new architecture was structured to rank highly on traditional search engines while also being easily readable by AI answer engines. Content was reformatted to directly answer user queries.
                        </p>
                      </div>
                      <div className="backdrop-blur-sm bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5">
                        <h4 className="font-semibold text-cyan-300 mb-2">Campaign Landing Pages</h4>
                        <p className="text-white/60 text-sm leading-relaxed">
                          Mutant developed a system for rapidly deploying high-converting, heavily optimized landing pages tied directly to targeted ad campaigns.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border border-amber-500/30 text-2xl font-bold text-amber-300">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-4">Unlocking the Crypto Market: Cryptohomesdxb</h3>
                    <p className="text-white/70 leading-relaxed text-lg">
                      To position Elite Properties as a true market pioneer, Mutant conceptualized, designed, and launched <span className="text-amber-300 font-semibold">Cryptohomesdxb</span>. This bespoke, secure sub-brand and platform was built specifically to enable seamless property transactions using cryptocurrency. By integrating robust <span className="text-yellow-300 font-medium">Web3 technology</span> with traditional real estate compliance, Mutant opened up an entirely new, high-net-worth revenue stream for the client.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 backdrop-blur-sm bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
                      <span className="text-2xl">₿</span>
                      <span className="text-amber-200 font-medium">Crypto-Enabled Transactions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Impact Section */}
      <section data-section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">The Impact</span>
            </h2>
          </div>
          
          <p className="text-xl text-white/70 mb-16 max-w-3xl">
            Measurable Growth and Market Leadership — The integrated approach delivered by Mutant fundamentally shifted Elite Properties' trajectory, yielding substantial, measurable results.
          </p>

          {/* Impact Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              {
                icon: "📈",
                metric: "Massive",
                label: "Organic Traffic Surge",
                color: "from-emerald-500 to-teal-500"
              },
              {
                icon: "🎯",
                metric: "Higher",
                label: "Conversion Rates",
                color: "from-blue-500 to-indigo-500"
              },
              {
                icon: "💰",
                metric: "Millions AED",
                label: "New Revenue Channels",
                color: "from-amber-500 to-orange-500"
              },
              {
                icon: "👑",
                metric: "Industry",
                label: "Brand Authority",
                color: "from-purple-500 to-pink-500"
              }
            ].map((item, index) => (
              <div key={index} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-all duration-500`} />
                <div className="relative h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 text-center hover:bg-white/10 hover:border-white/20 transition-all duration-500 hover:-translate-y-2">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-1`}>
                    {item.metric}
                  </div>
                  <p className="text-white/60 text-sm font-medium">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Impact Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <h3 className="text-xl font-bold text-emerald-300 mb-3">Surge in Organic Traffic</h3>
                <p className="text-white/70 leading-relaxed">
                  The dual focus on SEO and AEO resulted in a massive increase in high-intent organic traffic, capturing leads at the exact moment they were researching property investments.
                </p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <h3 className="text-xl font-bold text-blue-300 mb-3">Enhanced Conversion Rates</h3>
                <p className="text-white/70 leading-relaxed">
                  The deployment of targeted campaign landing pages reduced cost-per-acquisition and significantly boosted conversion rates for new property launches.
                </p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <h3 className="text-xl font-bold text-amber-300 mb-3">New Revenue Channels</h3>
                <p className="text-white/70 leading-relaxed">
                  The launch of Cryptohomesdxb successfully captured the attention of international crypto-investors, facilitating millions of AED in new property transactions within the first few quarters of launch.
                </p>
              </div>
            </div>
            
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500">
                <h3 className="text-xl font-bold text-purple-300 mb-3">Brand Authority</h3>
                <p className="text-white/70 leading-relaxed">
                  Elite Properties successfully transitioned its brand image from a traditional brokerage to an innovative, tech-forward industry leader.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conclusion Section */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-blue-500/30 rounded-3xl blur-3xl" />
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12">
              <div className="inline-flex items-center gap-2 backdrop-blur-sm bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
                <span className="text-lg">✨</span>
                <span className="text-sm font-medium text-white/80">The Transformation</span>
              </div>
              
              <p className="text-xl sm:text-2xl text-white/90 leading-relaxed font-light">
                By blending dynamic creative execution with advanced technical development, Mutant didn't just update Elite Properties' marketing — <span className="font-semibold text-white">they future-proofed their entire business model.</span>
              </p>
              
              <div className="mt-10 flex justify-center">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover/logo:opacity-75 transition-opacity" />
                  <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4">
                    <Image
                      src="/logos/mutant-logo.avif"
                      alt="Mutant"
                      width={120}
                      height={40}
                      className="h-8 w-auto object-contain brightness-0 invert"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Mutant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
