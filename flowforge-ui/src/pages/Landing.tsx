import React from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Zap,
  GitBranch,
  Shield,
  BarChart2,
  Code2,
  MessageSquare,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

const features = [
  {
    icon: <GitBranch size={24} />,
    title: 'Visual Workflow Designer',
    description: 'Drag-and-drop canvas to build complex multi-step workflows with conditions, loops, and branching logic.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: <MessageSquare size={24} />,
    title: 'Kafka & Cron Triggers',
    description: 'Fire workflows from Kafka topic events or on a Quartz cron schedule with flexible payload mapping and condition filters.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: <Shield size={24} />,
    title: 'Built-in Reliability',
    description: 'Dead letter queues, automatic retries with exponential backoff, and idempotency keys out of the box.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: <BarChart2 size={24} />,
    title: 'Real-Time Monitoring',
    description: 'Live execution traces, step-by-step debugging, SLA metrics and alerting for every workflow run.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: <Sparkles size={24} />,
    title: 'AI Call Step',
    description: 'Embed Claude AI directly into your workflows. Build dynamic prompts from execution context and route decisions based on AI output.',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: <Code2 size={24} />,
    title: 'AI Execution Analyst',
    description: 'One-click "Explain Failure" on any failed execution. Claude diagnoses the root cause and suggests remediation steps instantly.',
    color: 'bg-pink-100 text-pink-600',
  },
]

const pricingPlans = [
  { name: 'Free', price: '$0', features: ['3 workflows', '1,000 executions/mo', 'Community support'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '$49', features: ['Unlimited workflows', '100K executions/mo', 'Priority support', 'Webhook logs', 'API Keys'], cta: 'Start Pro Trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Dedicated infra', 'SLA guarantee', 'Custom integrations', 'SSO / SAML'], cta: 'Contact Sales', highlight: false },
]

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-1.5">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900 text-lg">FlowForge</span>
              <span className="text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#docs" className="hover:text-gray-900 transition-colors">Docs</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white pt-20 pb-24 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
            <Zap size={12} />
            AI-powered workflow orchestration for modern engineering teams
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Forge Workflows.{' '}
            <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Ship Integrations.
            </span>{' '}
            Stop Writing Glue Code.
          </h1>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            FlowForge is a visual workflow orchestration platform that lets you build, deploy, and monitor
            complex multi-step integrations without writing boilerplate infrastructure code.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              Start for Free <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              View Demo
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            No credit card required. Free plan includes 1,000 executions/month.
          </p>
        </div>

        {/* Hero visual */}
        <div className="relative max-w-5xl mx-auto mt-16">
          <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-400 text-xs ml-2">FlowForge Designer — order-processing-workflow</span>
            </div>
            <div className="p-8 min-h-[280px] flex items-center justify-center">
              <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                {[
                  { label: 'HTTP Request', sub: 'POST /orders', color: 'border-blue-500 bg-blue-900/30' },
                  { label: 'Condition', sub: 'amount > $100', color: 'border-purple-500 bg-purple-900/30' },
                  { label: 'Notify', sub: '#ops-channel', color: 'border-yellow-500 bg-yellow-900/30' },
                ].map((node, i) => (
                  <div key={i} className={`rounded-xl border-2 p-4 ${node.color}`}>
                    <div className="text-white text-sm font-semibold">{node.label}</div>
                    <div className="text-gray-400 text-xs mt-1 font-mono">{node.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Everything you need to orchestrate workflows at scale
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              From simple API chains to complex multi-system integrations with error handling, retries, and real-time monitoring.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group"
              >
                <div className={`inline-flex p-3 rounded-xl ${feature.color} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-500">Start free, scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl p-8 border-2 ${
                  plan.highlight
                    ? 'border-blue-500 bg-blue-600 text-white shadow-2xl shadow-blue-200 scale-105'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className={`text-4xl font-extrabold mt-2 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.price}
                  {plan.price !== 'Custom' && (
                    <span className={`text-sm font-normal ${plan.highlight ? 'text-blue-100' : 'text-gray-400'}`}>/mo</span>
                  )}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-center gap-2 text-sm ${plan.highlight ? 'text-blue-100' : 'text-gray-600'}`}>
                      <CheckCircle size={14} className={plan.highlight ? 'text-blue-200' : 'text-green-500'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-8 block text-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white">Ready to stop writing glue code?</h2>
          <p className="mt-4 text-blue-100 text-lg">
            Join thousands of engineering teams using FlowForge to ship integrations faster.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
          >
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-1.5">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">FlowForge</span>
                  <span className="text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full leading-none">AI</span>
                </div>
              </div>
              <p className="text-sm max-w-xs">Visual workflow orchestration for modern engineering teams.</p>
            </div>
            <div className="grid grid-cols-3 gap-8 text-sm">
              <div>
                <h4 className="font-semibold text-white mb-3">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Developers</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Docs</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">SDKs</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-3">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-800 text-xs text-center">
            © 2026 FlowForge, Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
