"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PackageId = "starter" | "professional" | "enterprise";

export interface PackageData {
  id: PackageId;
  name: string;
  monthlyPrice: number;
  // Traffic projections
  trafficMonth6: number;
  trafficMonth12: number;
  organicMonth6: number;
  organicMonth12: number;
  // KPIs
  leadsPerMonth: string;
  keywordsPage1Month6: number;
  keywordsPage1Month12: number;
  domainAuthorityMonth12: string;
  aiVisibilityMonth12: string;
  timeToResults: string;
  // Services included
  seoIncluded: boolean;
  seoDetail: string;
  aeoIncluded: boolean;
  aeoDetail: string;
  socialIncluded: boolean;
  socialDetail: string;
  ppcIncluded: boolean;
  ppcDetail: string;
  landingPages: number;
  contentMarketing: boolean;
  contentDetail: string;
  videoProduction: boolean;
  videoDetail: string;
  dedicatedManager: boolean;
  managerDetail: string;
}

export const packageDataMap: Record<PackageId, PackageData> = {
  starter: {
    id: "starter",
    name: "Growth Starter",
    monthlyPrice: 15000,
    trafficMonth6: 2200,
    trafficMonth12: 5500,
    organicMonth6: 1400,
    organicMonth12: 3800,
    leadsPerMonth: "50-80",
    keywordsPage1Month6: 35,
    keywordsPage1Month12: 65,
    domainAuthorityMonth12: "30-38",
    aiVisibilityMonth12: "10-15%",
    timeToResults: "3-4 months",
    seoIncluded: true,
    seoDetail: "Basic on-page SEO",
    aeoIncluded: false,
    aeoDetail: "",
    socialIncluded: true,
    socialDetail: "2 platforms, 12 posts/month",
    ppcIncluded: true,
    ppcDetail: "Up to AED 5,000 ad spend",
    landingPages: 2,
    contentMarketing: false,
    contentDetail: "",
    videoProduction: false,
    videoDetail: "",
    dedicatedManager: false,
    managerDetail: "",
  },
  professional: {
    id: "professional",
    name: "Professional",
    monthlyPrice: 28000,
    trafficMonth6: 5750,
    trafficMonth12: 12500,
    organicMonth6: 3800,
    organicMonth12: 9500,
    leadsPerMonth: "150-250",
    keywordsPage1Month6: 90,
    keywordsPage1Month12: 150,
    domainAuthorityMonth12: "42-50",
    aiVisibilityMonth12: "25-35%",
    timeToResults: "2-3 months",
    seoIncluded: true,
    seoDetail: "Full technical + on-page SEO",
    aeoIncluded: true,
    aeoDetail: "AI search visibility",
    socialIncluded: true,
    socialDetail: "4 platforms, 20 posts/month",
    ppcIncluded: true,
    ppcDetail: "Up to AED 15,000 ad spend",
    landingPages: 5,
    contentMarketing: true,
    contentDetail: "4 blog posts/month",
    videoProduction: false,
    videoDetail: "",
    dedicatedManager: true,
    managerDetail: "Account manager",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise 360°",
    monthlyPrice: 45000,
    trafficMonth6: 8500,
    trafficMonth12: 16870,
    organicMonth6: 5800,
    organicMonth12: 12500,
    leadsPerMonth: "400-600",
    keywordsPage1Month6: 120,
    keywordsPage1Month12: 180,
    domainAuthorityMonth12: "45-55",
    aiVisibilityMonth12: "35-45%",
    timeToResults: "1-2 months",
    seoIncluded: true,
    seoDetail: "Enterprise SEO + link building",
    aeoIncluded: true,
    aeoDetail: "Full AI visibility strategy",
    socialIncluded: true,
    socialDetail: "All platforms, 30+ posts/month",
    ppcIncluded: true,
    ppcDetail: "Unlimited ad spend management",
    landingPages: 10,
    contentMarketing: true,
    contentDetail: "8 blog posts + PR",
    videoProduction: true,
    videoDetail: "4 videos/month",
    dedicatedManager: true,
    managerDetail: "Senior strategist",
  },
};

interface PackageContextType {
  selectedPackage: PackageId;
  setSelectedPackage: (pkg: PackageId) => void;
  packageData: PackageData;
}

const PackageContext = createContext<PackageContextType | undefined>(undefined);

export function PackageProvider({ children }: { children: ReactNode }) {
  const [selectedPackage, setSelectedPackage] = useState<PackageId>("professional");

  return (
    <PackageContext.Provider
      value={{
        selectedPackage,
        setSelectedPackage,
        packageData: packageDataMap[selectedPackage],
      }}
    >
      {children}
    </PackageContext.Provider>
  );
}

export function usePackage() {
  const context = useContext(PackageContext);
  if (!context) {
    throw new Error("usePackage must be used within a PackageProvider");
  }
  return context;
}
