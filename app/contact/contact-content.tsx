'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Linkedin, Github, MapPin, Send, Check, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/section-label'

const inquiryTypes = [
  { value: 'hiring', label: "I'm hiring for a role" },
  { value: 'project', label: 'I need a project built' },
  { value: 'consulting', label: 'I want consulting/advisory' },
  { value: 'general', label: 'General question' },
]

const budgetRanges = [
  { value: 'under-5k', label: 'Under $5K' },
  { value: '5k-15k', label: '$5K - $15K' },
  { value: '15k-50k', label: '$15K - $50K' },
  { value: '50k-plus', label: '$50K+' },
  { value: 'not-sure', label: 'Not sure yet' },
]

export function ContactContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    inquiryType: '',
    budget: '',
    message: '',
    honeypot: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const showBudget = formData.inquiryType === 'project' || formData.inquiryType === 'consulting'

  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.honeypot) return // Bot trap

    setIsSubmitting(true)
    setError('')

    try {
      const inquiryLabel = inquiryTypes.find(t => t.value === formData.inquiryType)?.label || ''
      const budgetLabel = budgetRanges.find(b => b.value === formData.budget)?.label || ''

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          subject: `${inquiryLabel}${budgetLabel ? ` (${budgetLabel})` : ''}`,
          message: formData.message,
          honey: formData.honeypot,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setIsSubmitted(true)
      } else {
        setError(data.error || 'Failed to send message. Please try again.')
      }
    } catch {
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-16 h-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-[#10B981]" />
          </div>
          <h1 className="text-3xl font-normal text-[#FAFAFA] mb-4">Message Sent!</h1>
          <p className="text-[#A8A29E] mb-8">
            {"Thanks for reaching out. I'll get back to you within 24 hours."}
          </p>
          <Button asChild className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE]">
            <Link href="/">Back to Home</Link>
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel>Contact</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA]">
            {"Let's Work Together"}
          </h1>
          <p className="mt-6 text-lg text-[#A8A29E] max-w-2xl">
            {"Whether you're hiring or you need something built — I'd love to hear from you."}
          </p>
        </motion.div>
      </section>

      {/* Split Layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12">
          {/* Form */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#FAFAFA] mb-2">
                    Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] placeholder-[#78716C] focus:outline-none focus:border-[#0ED3CF] transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#FAFAFA] mb-2">
                    Email <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] placeholder-[#78716C] focus:outline-none focus:border-[#0ED3CF] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-[#FAFAFA] mb-2">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] placeholder-[#78716C] focus:outline-none focus:border-[#0ED3CF] transition-colors"
                  placeholder="Your company (optional)"
                />
              </div>

              <div>
                <label htmlFor="inquiryType" className="block text-sm font-medium text-[#FAFAFA] mb-2">
                  Inquiry Type <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  id="inquiryType"
                  required
                  value={formData.inquiryType}
                  onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-[#0ED3CF] transition-colors"
                >
                  <option value="" className="text-[#78716C]">Select an option</option>
                  {inquiryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {showBudget && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <label htmlFor="budget" className="block text-sm font-medium text-[#FAFAFA] mb-2">
                    Budget Range
                  </label>
                  <select
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] focus:outline-none focus:border-[#0ED3CF] transition-colors"
                  >
                    <option value="">Select a range</option>
                    {budgetRanges.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#FAFAFA] mb-2">
                  Message <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] placeholder-[#78716C] focus:outline-none focus:border-[#0ED3CF] transition-colors resize-none"
                  placeholder="Tell me about your project, role, or question..."
                />
              </div>

              {/* Honeypot */}
              <input
                type="text"
                name="honeypot"
                value={formData.honeypot}
                onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              {error && (
                <p className="text-[#EF4444] text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold py-6 text-lg btn-glow disabled:opacity-50"
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-[#78716C]">
                I typically respond within 24 hours
              </p>
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Contact Links */}
            <div className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl space-y-4">
              <h3 className="font-semibold text-[#FAFAFA] mb-4">Contact Information</h3>
              <Link
                href="mailto:sage@sageideas.org"
                className="flex items-center gap-3 text-[#A8A29E] hover:text-[#0ED3CF] transition-colors"
              >
                <Mail className="h-5 w-5" />
                sage@sageideas.org
              </Link>
              <Link
                href="https://linkedin.com/in/jason-teixeira"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[#A8A29E] hover:text-[#0ED3CF] transition-colors"
              >
                <Linkedin className="h-5 w-5" />
                linkedin.com/in/jason-teixeira
              </Link>
              <Link
                href="https://github.com/JasonTeixeira"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[#A8A29E] hover:text-[#0ED3CF] transition-colors"
              >
                <Github className="h-5 w-5" />
                github.com/JasonTeixeira
              </Link>
              <div className="flex items-center gap-3 text-[#78716C]">
                <MapPin className="h-5 w-5" />
                Orlando, FL (Remote-First)
              </div>
            </div>

            {/* Availability */}
            <div className="p-6 bg-[#1A1917] border border-[#10B981]/20 rounded-2xl">
              <h3 className="font-semibold text-[#FAFAFA] mb-4">Availability</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-[#A8A29E]">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full" />
                  Open to remote full-time roles
                </li>
                <li className="flex items-center gap-3 text-sm text-[#A8A29E]">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full" />
                  Available for consulting projects
                </li>
                <li className="flex items-center gap-3 text-sm text-[#A8A29E]">
                  <span className="w-2 h-2 bg-[#10B981] rounded-full" />
                  Open to contract work
                </li>
              </ul>
            </div>

            {/* Book a Call */}
            <div className="p-6 bg-gradient-to-br from-[#0ED3CF]/10 to-[#E85D3A]/10 border border-[#0ED3CF]/20 rounded-2xl">
              <h3 className="font-semibold text-[#FAFAFA] mb-2">Prefer to Talk?</h3>
              <p className="text-sm text-[#A8A29E] mb-4">
                Book a free 30-minute discovery call. No pressure — just a conversation about what you need.
              </p>
              <a
                href="https://cal.com/jason-teixeira-8elz3z"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-4 py-3 bg-[#0ED3CF] text-[#09090B] font-semibold rounded-xl hover:bg-[#22D3EE] transition-colors btn-glow"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Book a Call
              </a>
            </div>

            {/* Response Time */}
            <div className="p-6 bg-[#1A1917] border border-[#2A2826] rounded-2xl">
              <h3 className="font-semibold text-[#FAFAFA] mb-2">Response Time</h3>
              <p className="text-sm text-[#A8A29E]">
                I typically respond within 24 hours during business days.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
