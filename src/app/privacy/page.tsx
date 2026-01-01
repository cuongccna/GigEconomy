import React from "react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-neon-green mb-6">Privacy Policy</h1>
        <p className="text-white/70 mb-4">Last updated: January 1, 2026</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
          <p className="text-white/60 leading-relaxed">
            We collect information provided by Telegram (User ID, Username, First Name) to create your account and track your progress. We may also collect data related to your task completion history.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
          <p className="text-white/60 leading-relaxed">
            Your information is used to:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Track your rewards and achievements</li>
              <li>Detect and prevent fraud</li>
              <li>Communicate with you about updates and offers</li>
            </ul>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. Data Security</h2>
          <p className="text-white/60 leading-relaxed">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Third-Party Services</h2>
          <p className="text-white/60 leading-relaxed">
            We may use third-party services (like Adsgram) which may collect their own data. Please review their privacy policies separately.
          </p>
        </section>
      </div>
    </div>
  );
}
