import React from "react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-neon-green mb-6">Terms of Use</h1>
        <p className="text-white/70 mb-4">Last updated: January 1, 2026</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
          <p className="text-white/60 leading-relaxed">
            By accessing and using GigX, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
          <p className="text-white/60 leading-relaxed">
            GigX provides a platform for users to complete tasks and earn rewards. We reserve the right to modify or discontinue the service at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. User Conduct</h2>
          <p className="text-white/60 leading-relaxed">
            You agree to use the service only for lawful purposes. Any use of bots, automation, or fraudulent activity will result in immediate account termination.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Rewards and Payments</h2>
          <p className="text-white/60 leading-relaxed">
            Rewards are distributed in $GIG tokens. The value and availability of rewards are subject to change. We are not responsible for any loss of funds due to blockchain network issues.
          </p>
        </section>
      </div>
    </div>
  );
}
